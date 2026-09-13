-- ==============================================================================
-- EconomizaJá - Migração 00031: Correção de Destaques, Exclusão de Contas (LGPD) e Orçamento Regional
-- Idempotente: pode ser executada múltiplas vezes com total segurança
-- ==============================================================================

-- 1. CORREÇÃO CRÍTICA DO ERRO DE DESTAQUE:
-- "column updated_at of relation featured_listings does not exist"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'featured_listings' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.featured_listings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Coluna updated_at adicionada com sucesso na tabela featured_listings.';
  END IF;
END;
$$;

-- Trigger para atualização automática de updated_at em featured_listings
CREATE OR REPLACE FUNCTION public.update_featured_listings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_featured_listings_updated_at ON public.featured_listings;
CREATE TRIGGER trg_featured_listings_updated_at
  BEFORE UPDATE ON public.featured_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_featured_listings_timestamp();

-- 2. RECRIAR confirm_featured_listing GARANTINDO RETORNO E TRATAMENTO DE UPDATED_AT
CREATE OR REPLACE FUNCTION public.confirm_featured_listing(
  p_listing_id UUID,
  p_provider_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_payment_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem confirmar pagamentos de destaque patrocinado.';
  END IF;

  SELECT * INTO v_listing FROM public.featured_listings WHERE id = p_listing_id FOR UPDATE;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Destaque patrocinado não encontrado: %', p_listing_id;
  END IF;

  IF v_listing.active = true THEN
    RAISE EXCEPTION 'Este destaque já está ativo.';
  END IF;

  -- Atualiza o destaque patrocinado
  UPDATE public.featured_listings 
  SET active = true, updated_at = NOW() 
  WHERE id = p_listing_id;

  -- Ativa o destaque na empresa vinculada
  UPDATE public.businesses 
  SET featured = true, updated_at = NOW() 
  WHERE id = v_listing.business_id;

  -- Atualiza o pagamento correspondente, se houver
  UPDATE public.payments
  SET status = 'CONFIRMED', provider_payment_id = COALESCE(p_provider_transaction_id, provider_payment_id), updated_at = NOW()
  WHERE provider_payment_id = p_listing_id::text AND status = 'PENDING'
  RETURNING id INTO v_payment_id;

  -- Registra na tabela de auditoria se ela existir
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'featured_audit_log') THEN
    INSERT INTO public.featured_audit_log (business_id, featured_listing_id, action, performed_by, payment_id, notes)
    VALUES (v_listing.business_id, p_listing_id, 'ACTIVATED', auth.uid(), v_payment_id,
      COALESCE(p_provider_transaction_id, 'Confirmado manualmente pelo administrador'));
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'listing_id', p_listing_id,
    'business_id', v_listing.business_id, 
    'payment_id', v_payment_id,
    'active_until', v_listing.end_date,
    'message', 'Destaque patrocinado ativado com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) TO authenticated;

-- 3. EXCLUSÃO ATÔMICA E TOTAL DE CONTA (LGPD Art. 18 & Google Play Store)
-- Permite que Consumidor ou Parceiro exclua sua própria conta com segurança total e sem deixar registros órfãos
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  r_quote RECORD;
  r_biz RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para excluir sua conta.';
  END IF;

  -- a) Remove ou trata cotações criadas pelo próprio usuário
  FOR r_quote IN SELECT id FROM public.quote_requests WHERE user_id = v_user_id LOOP
    BEGIN
      PERFORM public.delete_quote_request(r_quote.id);
    EXCEPTION WHEN OTHERS THEN
      DELETE FROM public.quote_proposals WHERE quote_request_id = r_quote.id;
      DELETE FROM public.quote_requests WHERE id = r_quote.id;
    END;
  END LOOP;

  -- b) Desativa empresas do parceiro e revoga destaques para não aparecerem nas buscas
  FOR r_biz IN SELECT id FROM public.businesses WHERE owner_id = v_user_id LOOP
    -- Desativa destaques patrocinados da empresa
    UPDATE public.featured_listings SET active = false WHERE business_id = r_biz.id;
    -- Desativa a própria empresa do guia público
    UPDATE public.businesses SET active = false, featured = false WHERE id = r_biz.id;
    -- Desativa ofertas da empresa
    UPDATE public.offers SET active = false WHERE business_id = r_biz.id;
  END LOOP;

  -- c) Remove dados pessoais e de engajamento do usuário
  DELETE FROM public.favorites WHERE user_id = v_user_id;
  DELETE FROM public.price_alerts WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_tokens') THEN
    DELETE FROM public.device_tokens WHERE user_id = v_user_id;
  END IF;

  -- d) Remove perfil público em public.profiles
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- e) Remove usuário do cadastro de autenticação do Supabase (auth.users)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- 4. VISIBILIDADE PLENA DE ORÇAMENTOS REGIONAIS NO MARKETPLACE (secure_leads_view)
-- Garante que quando o consumidor cria orçamento geral (sem empresa direcionada),
-- as empresas parceiras da mesma região e segmento consigam enxergá-lo imediatamente
DROP VIEW IF EXISTS public.secure_leads_view;

CREATE VIEW public.secure_leads_view AS
SELECT 
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    -- Se direcionado especificamente para a empresa do parceiro logado
    WHEN qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = qr.target_business_id AND b.owner_id = auth.uid()
    ) THEN qr.user_name
    -- Oportunidade geral do marketplace: primeiro nome com tag informativa
    ELSE SPLIT_PART(COALESCE(qr.user_name, 'Cliente'), ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    WHEN public.is_admin() THEN qr.user_phone
    WHEN qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = qr.target_business_id AND b.owner_id = auth.uid()
    ) THEN qr.user_phone
    ELSE '****-****'
  END AS user_phone,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_email
    WHEN public.is_admin() THEN qr.user_email
    WHEN qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = qr.target_business_id AND b.owner_id = auth.uid()
    ) THEN qr.user_email
    ELSE 'oculto@privado.com'
  END AS user_email,
  qr.city,
  qr.state,
  qr.neighborhood,
  qr.category_id,
  qr.subcategory,
  qr.title,
  qr.description,
  qr.desired_deadline,
  qr.budget_range,
  qr.photos,
  qr.status,
  qr.created_at,
  qr.updated_at
FROM public.quote_requests qr
WHERE 
  -- Próprio autor ou Admin
  auth.uid() = qr.user_id 
  OR public.is_admin()
  -- Empresa direcionada especificamente
  OR (
    qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b 
      WHERE b.id = qr.target_business_id 
        AND b.owner_id = auth.uid()
    )
  )
  -- Empresa que já enviou proposta
  OR EXISTS (
    SELECT 1 FROM public.quote_proposals qp
    JOIN public.businesses b ON b.id = qp.business_id
    WHERE qp.quote_request_id = qr.id
      AND b.owner_id = auth.uid()
  )
  -- Oportunidades gerais do marketplace: empresas ativas da região
  OR (
    qr.target_business_id IS NULL
    AND qr.status IN ('aberto', 'propostas_recebidas')
    AND EXISTS (
      SELECT 1 FROM public.businesses b 
      WHERE b.owner_id = auth.uid() 
        AND (b.active IS NULL OR b.active = true)
        AND (
          b.category_id = qr.category_id 
          OR qr.category_id IS NULL 
          OR b.category_id IS NULL
        )
        AND (
          LOWER(TRIM(COALESCE(b.city, ''))) = LOWER(TRIM(COALESCE(qr.city, '')))
          OR b.city IS NULL 
          OR qr.city IS NULL 
          OR LOWER(b.city) LIKE '%' || LOWER(qr.city) || '%'
          OR LOWER(qr.city) LIKE '%' || LOWER(b.city) || '%'
          -- Correspondência por estado quando cidade for flexível
          OR (b.state IS NOT NULL AND qr.state IS NOT NULL AND LOWER(b.state) = LOWER(qr.state))
        )
    )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated;
REVOKE ALL ON public.secure_leads_view FROM anon;

NOTIFY pgrst, 'reload schema';
