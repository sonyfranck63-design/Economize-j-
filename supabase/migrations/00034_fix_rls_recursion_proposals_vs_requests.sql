-- ==============================================================================
-- EconomizaJá — Migração 00034: Correção Final de Recursão RLS (Ciclo Proposals x Requests)
-- ==============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 1: FUNÇÕES SECURITY DEFINER PARA BYPASS DE RLS MÚTUO               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 1. Verifica se a empresa do usuário logado já enviou proposta para um orçamento
-- (Bypassa RLS de quote_proposals para evitar ciclo com quote_requests)
CREATE OR REPLACE FUNCTION public.has_user_proposed(p_quote_request_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_proposals qp
    JOIN public.businesses b ON b.id = qp.business_id
    WHERE qp.quote_request_id = p_quote_request_id
      AND b.owner_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_user_proposed(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_user_proposed(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_user_proposed(UUID, UUID) TO authenticated;

-- 2. Verifica se o usuário é o dono (solicitante) do orçamento original
-- (Bypassa RLS de quote_requests para evitar ciclo com quote_proposals)
CREATE OR REPLACE FUNCTION public.is_quote_requester(p_quote_request_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = p_quote_request_id
      AND qr.user_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_quote_requester(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_quote_requester(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_quote_requester(UUID, UUID) TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 2: ATUALIZAR POLÍTICAS DE quote_requests                           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
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
    -- (USANDO A NOVA FUNÇÃO SECURITY DEFINER)
    OR public.has_user_proposed(id, auth.uid())
    -- Regra 5: Marketplace geral
    OR (
      target_business_id IS NULL
      AND quote_requests.status IN ('aberto', 'propostas_recebidas')
      AND (
        public.user_has_active_business(auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('business', 'admin')
      )
    )
  );

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 3: ATUALIZAR POLÍTICAS DE quote_proposals                          ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "quote_proposals_select" ON public.quote_proposals;
CREATE POLICY "quote_proposals_select"
  ON public.quote_proposals FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    -- Empresa que enviou a proposta pertence ao usuário
    OR public.is_business_owner(business_id, auth.uid())
    -- O solicitante do orçamento pode ver as propostas recebidas
    -- (USANDO A NOVA FUNÇÃO SECURITY DEFINER)
    OR public.is_quote_requester(quote_request_id, auth.uid())
  );

DROP POLICY IF EXISTS "quote_proposals_update" ON public.quote_proposals;
CREATE POLICY "quote_proposals_update"
  ON public.quote_proposals FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_business_owner(business_id, auth.uid())
    -- (USANDO A NOVA FUNÇÃO SECURITY DEFINER)
    OR public.is_quote_requester(quote_request_id, auth.uid())
  );

DROP POLICY IF EXISTS "quote_proposals_delete" ON public.quote_proposals;
CREATE POLICY "quote_proposals_delete"
  ON public.quote_proposals FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_business_owner(business_id, auth.uid())
    -- (USANDO A NOVA FUNÇÃO SECURITY DEFINER)
    OR public.is_quote_requester(quote_request_id, auth.uid())
  );

-- Recarregar cache de schema
NOTIFY pgrst, 'reload schema';
