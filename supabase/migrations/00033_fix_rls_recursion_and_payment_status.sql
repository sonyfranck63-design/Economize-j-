-- ==============================================================================
-- EconomizaJá — Migração 00033: Correção de Recursão RLS em quote_requests
-- e Violação de Constraint payments_status_check
-- Idempotente: pode ser executada com total segurança quantas vezes for necessário
-- ==============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 1: FUNÇÕES SECURITY DEFINER PARA QUEBRAR RECURSÃO RLS              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 1.1 Função que retorna os IDs de todas as empresas de um usuário
-- Usa SECURITY DEFINER para BYPASSAR o RLS de businesses, quebrando o ciclo
CREATE OR REPLACE FUNCTION public.get_user_business_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM public.businesses WHERE owner_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_user_business_ids(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_business_ids(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_business_ids(UUID) TO authenticated;

-- 1.2 Função que verifica se um usuário é dono de uma empresa específica
-- Também SECURITY DEFINER — evita que a checagem passe pelo RLS de businesses
CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND owner_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) TO authenticated;

-- 1.3 Função que verifica se o usuário possui alguma empresa ativa
-- Usada para visibilidade do marketplace geral de orçamentos
CREATE OR REPLACE FUNCTION public.user_has_active_business(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE owner_id = p_user_id AND (active IS NULL OR active = true)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.user_has_active_business(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_active_business(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_active_business(UUID) TO authenticated;

-- 1.4 Função que verifica se o usuário possui empresa com categoria e localização compatíveis
-- Para matching regional de orçamentos gerais (sem target_business_id)
CREATE OR REPLACE FUNCTION public.user_has_matching_business(
  p_user_id UUID,
  p_category_id TEXT,
  p_city TEXT
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE owner_id = p_user_id
      AND (active IS NULL OR active = true)
      AND (category_id = p_category_id OR p_category_id IS NULL)
      AND (
        p_city IS NULL
        OR city IS NULL
        OR LOWER(city) = LOWER(p_city)
        OR LOWER(city) LIKE '%' || LOWER(p_city) || '%'
        OR LOWER(p_city) LIKE '%' || LOWER(city) || '%'
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.user_has_matching_business(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_matching_business(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_matching_business(UUID, TEXT, TEXT) TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 2: REESCREVER POLÍTICA RLS DE quote_requests SEM RECURSÃO          ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 2.1 Remover todas as políticas SELECT antigas
DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
DROP POLICY IF EXISTS "Users can read quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Quote requests select policy" ON public.quote_requests;
DROP POLICY IF EXISTS "Customers can view their own quotes" ON public.quote_requests;

-- 2.2 Criar nova política SELECT usando funções SECURITY DEFINER (sem recursão)
CREATE POLICY "quote_requests_select"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (
    -- Regra 1: O próprio solicitante do orçamento
    user_id = auth.uid()

    -- Regra 2: Administradores do sistema
    OR public.is_admin()

    -- Regra 3: Orçamento DIRECIONADO para uma empresa do usuário
    OR (
      target_business_id IS NOT NULL
      AND public.is_business_owner(target_business_id, auth.uid())
    )

    -- Regra 4: Empresa do usuário já enviou proposta para este orçamento
    -- Usa subquery apenas em quote_proposals (sem JOIN em businesses via RLS)
    OR EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      WHERE qp.quote_request_id = quote_requests.id
        AND qp.business_id IN (SELECT public.get_user_business_ids(auth.uid()))
    )

    -- Regra 5: Marketplace geral — orçamentos abertos visíveis para parceiros
    OR (
      target_business_id IS NULL
      AND quote_requests.status IN ('aberto', 'propostas_recebidas')
      AND (
        public.user_has_active_business(auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('business', 'admin')
      )
    )
  );

-- 2.3 Garantir que INSERT, UPDATE e DELETE não tenham recursão
DROP POLICY IF EXISTS "quote_requests_insert" ON public.quote_requests;
CREATE POLICY "quote_requests_insert"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "quote_requests_update" ON public.quote_requests;
CREATE POLICY "quote_requests_update"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "quote_requests_delete" ON public.quote_requests;
CREATE POLICY "quote_requests_delete"
  ON public.quote_requests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 2.4 Garantir permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 3: REESCREVER POLÍTICAS DE quote_proposals SEM RECURSÃO            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "quote_proposals_select" ON public.quote_proposals;
DROP POLICY IF EXISTS "Proposals viewable by requester and proposing business" ON public.quote_proposals;

CREATE POLICY "quote_proposals_select"
  ON public.quote_proposals FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    -- Empresa que enviou a proposta pertence ao usuário
    OR public.is_business_owner(business_id, auth.uid())
    -- O solicitante do orçamento pode ver as propostas recebidas
    OR EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "quote_proposals_insert" ON public.quote_proposals;
DROP POLICY IF EXISTS "Businesses can submit proposals" ON public.quote_proposals;

CREATE POLICY "quote_proposals_insert"
  ON public.quote_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_business_owner(business_id, auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "quote_proposals_update" ON public.quote_proposals;
DROP POLICY IF EXISTS "Requester or proposer can update proposal" ON public.quote_proposals;

CREATE POLICY "quote_proposals_update"
  ON public.quote_proposals FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_business_owner(business_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "quote_proposals_delete" ON public.quote_proposals;
DROP POLICY IF EXISTS "Requester or proposer or admin can delete proposal" ON public.quote_proposals;
DROP POLICY IF EXISTS "Admins or proposing business can delete proposal" ON public.quote_proposals;

CREATE POLICY "quote_proposals_delete"
  ON public.quote_proposals FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_business_owner(business_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 4: REESCREVER secure_leads_view SEM RECURSÃO                       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP VIEW IF EXISTS public.secure_leads_view;

CREATE VIEW public.secure_leads_view AS
SELECT
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_name
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    WHEN public.is_admin() THEN qr.user_phone
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_phone
    ELSE '****-****'
  END AS user_phone,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_email
    WHEN public.is_admin() THEN qr.user_email
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_email
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
  -- Empresa dona do target_business_id
  OR (
    qr.target_business_id IS NOT NULL
    AND public.is_business_owner(qr.target_business_id, auth.uid())
  )
  -- Empresa do usuário já enviou proposta
  OR EXISTS (
    SELECT 1 FROM public.quote_proposals qp
    WHERE qp.quote_request_id = qr.id
      AND qp.business_id IN (SELECT public.get_user_business_ids(auth.uid()))
  )
  -- Marketplace geral aberto
  OR (
    qr.target_business_id IS NULL
    AND qr.status IN ('aberto', 'propostas_recebidas')
    AND (
      public.user_has_active_business(auth.uid())
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('business', 'admin')
    )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated, anon;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 5: CORRIGIR STATUS 'CONFIRMED' → 'COMPLETED' NA RPC                ║
-- ║  confirm_featured_listing (resolve payments_status_check)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

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

  -- Atualiza updated_at de forma segura (coluna pode não existir em schemas antigos)
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

  -- ╔════════════════════════════════════════════════════════════════╗
  -- ║  CORREÇÃO CRÍTICA: 'COMPLETED' em vez de 'CONFIRMED'        ║
  -- ║  A constraint payments_status_check aceita apenas:           ║
  -- ║  'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'               ║
  -- ╚════════════════════════════════════════════════════════════════╝
  UPDATE public.payments
  SET status = 'COMPLETED',
      provider_payment_id = COALESCE(p_provider_transaction_id, provider_payment_id)
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


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 6: LIMPEZA — Corrigir registros existentes com status inválido     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Atualiza quaisquer payments que tenham ficado com status 'CONFIRMED' (inválido)
UPDATE public.payments
SET status = 'COMPLETED'
WHERE status = 'CONFIRMED';


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 7: CORRIGIR TRIGGER validate_featured_requires_payment             ║
-- ║  O trigger checa p.status = 'CONFIRMED', mas agora o status correto       ║
-- ║  é 'COMPLETED'. Sem essa correção, o trigger bloquearia destaques.        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.validate_featured_requires_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_has_active_paid_listing BOOLEAN;
BEGIN
  -- Se não está ativando featured, permite livremente
  IF NEW.featured IS NOT DISTINCT FROM OLD.featured THEN
    RETURN NEW;
  END IF;

  -- Se está desativando, permite
  IF NEW.featured = false THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_admin();
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Verifica se existe destaque ativo E pagamento COMPLETED (não mais CONFIRMED)
  SELECT EXISTS (
    SELECT 1 FROM public.featured_listings fl
    JOIN public.payments p ON p.provider_payment_id = fl.id::text
    WHERE fl.business_id = NEW.id
      AND fl.active = true
      AND fl.end_date >= CURRENT_DATE
      AND p.status = 'COMPLETED'
  ) INTO v_has_active_paid_listing;

  IF NOT v_has_active_paid_listing THEN
    RAISE EXCEPTION
      'SEGURANCA: businesses.featured so pode ser ativado mediante pagamento confirmado de destaque patrocinado.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, auth;

-- O trigger já existe (criado na migração 00028), apenas recriamos a função acima


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  FINALIZAÇÃO                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

NOTIFY pgrst, 'reload schema';
