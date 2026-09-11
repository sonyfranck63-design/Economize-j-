-- ==============================================================================
-- EconomizaJá — Migração 00025: Garantia Total de Visibilidade para Orçamentos Direcionados e Parceiros
-- ==============================================================================

-- 1. Atualiza as permissões RLS da tabela public.quote_requests para SELECT
-- Permite que:
-- a) O solicitante veja seus próprios orçamentos;
-- b) Administradores vejam todos;
-- c) O dono da empresa para a qual o orçamento foi direcionado (target_business_id) veja sempre o orçamento;
-- d) Empresas que já enviaram propostas para um orçamento continuem com acesso a ele;
-- e) Empresas da mesma categoria e região vejam oportunidades abertas do marketplace.

DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
DROP POLICY IF EXISTS "Users can read quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Quote requests select policy" ON public.quote_requests;

CREATE POLICY "quote_requests_select" 
  ON public.quote_requests FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    OR public.is_admin() 
    -- Orçamento direcionado para uma empresa do usuário (independe do status da empresa estar ativo ou não)
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
    -- Marketplace geral aberto para empresas do mesmo segmento e região
    OR (
      target_business_id IS NULL
      AND quote_requests.status IN ('aberto', 'propostas_recebidas')
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.owner_id = auth.uid()
          AND (b.active IS NULL OR b.active = true)
          AND (b.category_id = quote_requests.category_id OR quote_requests.category_id IS NULL)
          AND (
            LOWER(b.city) = LOWER(quote_requests.city)
            OR b.city IS NULL 
            OR quote_requests.city IS NULL
            OR LOWER(b.city) LIKE '%' || LOWER(quote_requests.city) || '%'
            OR LOWER(quote_requests.city) LIKE '%' || LOWER(b.city) || '%'
          )
      )
    )
  );

-- 2. Recria a secure_leads_view para conceder dados reais à empresa direcionada
DROP VIEW IF EXISTS public.secure_leads_view;

CREATE VIEW public.secure_leads_view AS
SELECT 
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    -- Se o orçamento foi direcionado diretamente para uma empresa do parceiro logado, ele vê o nome do cliente
    WHEN qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = qr.target_business_id AND b.owner_id = auth.uid()
    ) THEN qr.user_name
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    WHEN public.is_admin() THEN qr.user_phone
    -- Se o orçamento foi direcionado diretamente para a empresa, ela tem acesso ao telefone do cliente para contato
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
  auth.uid() = qr.user_id 
  OR public.is_admin()
  -- Empresa dona do target_business_id
  OR (
    qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b 
      WHERE b.id = qr.target_business_id 
        AND b.owner_id = auth.uid()
    )
  )
  -- Empresa já enviou proposta
  OR EXISTS (
    SELECT 1 FROM public.quote_proposals qp
    JOIN public.businesses b ON b.id = qp.business_id
    WHERE qp.quote_request_id = qr.id
      AND b.owner_id = auth.uid()
  )
  -- Leads gerais do marketplace
  OR EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.owner_id = auth.uid() 
      AND (b.active IS NULL OR b.active = true)
      AND (
        qr.target_business_id IS NULL
        AND (b.category_id = qr.category_id OR qr.category_id IS NULL)
        AND (
          LOWER(b.city) = LOWER(qr.city)
          OR b.city IS NULL 
          OR qr.city IS NULL
          OR LOWER(b.city) LIKE '%' || LOWER(qr.city) || '%'
          OR LOWER(qr.city) LIKE '%' || LOWER(b.city) || '%'
        )
      )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
