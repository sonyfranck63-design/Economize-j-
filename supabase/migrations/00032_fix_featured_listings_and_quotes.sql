-- ==============================================================================
-- EconomizaJá - Migração 00032: Correção de updated_at em featured_listings,
-- prevenção de destaques duplicados e visibilidade total de orçamentos regionais
-- Idempotente: pode ser executada com total segurança
-- ==============================================================================

-- 1. ADICIONAR COLUNA updated_at EM featured_listings SE NÃO EXISTIR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'featured_listings' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.featured_listings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Coluna updated_at adicionada com sucesso em featured_listings.';
  END IF;
END;
$$;

-- 2. RECRIAR confirm_featured_listing COM TRATAMENTO SEGURO DE updated_at E DEDUPLICAÇÃO
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

  -- Atualiza o destaque patrocinado (active = true)
  UPDATE public.featured_listings 
  SET active = true 
  WHERE id = p_listing_id;

  -- Atualiza updated_at de forma segura
  BEGIN
    UPDATE public.featured_listings SET updated_at = NOW() WHERE id = p_listing_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Ativa o destaque na empresa vinculada
  UPDATE public.businesses 
  SET featured = true 
  WHERE id = v_listing.business_id;

  BEGIN
    UPDATE public.businesses SET updated_at = NOW() WHERE id = v_listing.business_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Atualiza o pagamento correspondente, se houver
  UPDATE public.payments
  SET status = 'CONFIRMED', provider_payment_id = COALESCE(p_provider_transaction_id, provider_payment_id)
  WHERE provider_payment_id = p_listing_id::text AND status = 'PENDING'
  RETURNING id INTO v_payment_id;

  -- Remove quaisquer outras solicitações pendentes duplicadas da mesma empresa
  DELETE FROM public.featured_listings 
  WHERE business_id = v_listing.business_id 
    AND active = false 
    AND id != p_listing_id;

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

-- 3. RECRIAR initiate_featured_listing EVITANDO DUPLICAÇÃO DE SOLICITAÇÕES PENDENTES
CREATE OR REPLACE FUNCTION public.initiate_featured_listing(
  p_business_id UUID,
  p_days INT,
  p_offer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_biz_owner UUID;
  v_daily_rate NUMERIC(10, 2) := 19.90;
  v_settings_val JSONB;
  v_total_cost NUMERIC(10, 2);
  v_listing_id UUID;
  v_payment_id UUID;
  v_existing_pending RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para contratar destaque.';
  END IF;

  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa pode solicitar destaque.';
  END IF;

  IF p_days < 1 THEN
    RAISE EXCEPTION 'Período mínimo de destaque é de 1 dia.';
  END IF;

  BEGIN
    SELECT value INTO v_settings_val FROM public.app_settings WHERE key = 'monetization';
    v_daily_rate := COALESCE((v_settings_val->>'featuredDailyRate')::NUMERIC(10, 2), 19.90);
  EXCEPTION WHEN OTHERS THEN
    v_daily_rate := 19.90;
  END;

  v_total_cost := v_daily_rate * p_days;

  -- Verifica se já existe destaque pendente (active = false) para esta empresa
  SELECT * INTO v_existing_pending 
  FROM public.featured_listings 
  WHERE business_id = p_business_id AND active = false 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_existing_pending.id IS NOT NULL THEN
    -- Reutiliza a solicitação pendente existente evitando duplicata
    UPDATE public.featured_listings
    SET start_date = CURRENT_DATE,
        end_date = CURRENT_DATE + (p_days || ' days')::INTERVAL,
        offer_id = p_offer_id,
        daily_cost = v_daily_rate
    WHERE id = v_existing_pending.id;

    v_listing_id := v_existing_pending.id;

    UPDATE public.payments
    SET amount = v_total_cost
    WHERE provider_payment_id = v_listing_id::text AND status = 'PENDING';
  ELSE
    INSERT INTO public.featured_listings (
      business_id,
      offer_id,
      start_date,
      end_date,
      active,
      daily_cost
    ) VALUES (
      p_business_id,
      p_offer_id,
      CURRENT_DATE,
      CURRENT_DATE + (p_days || ' days')::INTERVAL,
      false,
      v_daily_rate
    ) RETURNING id INTO v_listing_id;

    INSERT INTO public.payments (
      user_id,
      business_id,
      amount,
      currency,
      status,
      payment_method,
      purpose,
      provider_payment_id
    ) VALUES (
      auth.uid(),
      p_business_id,
      v_total_cost,
      'BRL',
      'PENDING',
      'PIX',
      'FEATURED_LISTING',
      v_listing_id::text
    ) RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'business_id', p_business_id,
    'days', p_days,
    'daily_rate', v_daily_rate,
    'total_cost', v_total_cost,
    'status', 'PENDING',
    'message', 'Solicitação de destaque registrada. Aguardando confirmação do pagamento.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) TO authenticated;

-- 4. ATUALIZAR RLS DE quote_requests PARA PERMITIR VISIBILIDADE REGIONAL DE ORÇAMENTOS GERAIS
DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
DROP POLICY IF EXISTS "Users can read quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Quote requests select policy" ON public.quote_requests;

CREATE POLICY "quote_requests_select" 
  ON public.quote_requests FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    OR public.is_admin() 
    -- Orçamento direcionado para uma empresa do usuário
    OR (
      target_business_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = quote_requests.target_business_id
          AND b.owner_id = auth.uid()
      )
    )
    -- Empresa do usuário já enviou proposta comercial para este orçamento
    OR EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      JOIN public.businesses b ON b.id = qp.business_id
      WHERE qp.quote_request_id = quote_requests.id
        AND b.owner_id = auth.uid()
    )
    -- Marketplace geral aberto para parceiros e empresas cadastradas da plataforma
    OR (
      target_business_id IS NULL
      AND quote_requests.status IN ('aberto', 'propostas_recebidas')
      AND (
        EXISTS (
          SELECT 1 FROM public.businesses b WHERE b.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('business', 'admin')
        )
      )
    )
  );

-- 5. VIEW SEGURA PARA OPORTUNIDADES GERAIS
CREATE OR REPLACE VIEW public.secure_leads_view AS
SELECT 
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    WHEN qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = qr.target_business_id AND b.owner_id = auth.uid()
    ) THEN qr.user_name
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
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
  qr.created_at AS updated_at
FROM public.quote_requests qr
WHERE 
  auth.uid() = qr.user_id 
  OR public.is_admin()
  OR (
    qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b 
      WHERE b.id = qr.target_business_id 
        AND b.owner_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.quote_proposals qp
    JOIN public.businesses b ON b.id = qp.business_id
    WHERE qp.quote_request_id = qr.id
      AND b.owner_id = auth.uid()
  )
  OR (
    qr.target_business_id IS NULL
    AND qr.status IN ('aberto', 'propostas_recebidas')
    AND (
      EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('business', 'admin'))
    )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
