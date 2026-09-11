-- Script para rodar no SQL Editor do Supabase para corrigir orçamentos direcionados, visibilidade do parceiro e exclusão
-- ==============================================================================

-- 1. Garante permissão para o cliente e admin excluírem propostas de suas próprias cotações
DROP POLICY IF EXISTS "Requester or proposer or admin can delete proposal" ON public.quote_proposals;
CREATE POLICY "Requester or proposer or admin can delete proposal"
  ON public.quote_proposals FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- 2. Permite exclusão de leads comerciais
DROP POLICY IF EXISTS "Requester or admin can delete leads" ON public.leads;
CREATE POLICY "Requester or admin can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );

-- 3. Concede permissões explícitas de DELETE
GRANT DELETE ON public.leads TO authenticated;
GRANT DELETE ON public.quote_proposals TO authenticated;
GRANT DELETE ON public.quote_requests TO authenticated;

-- 4. Atualiza a policy de SELECT da tabela public.quote_requests
DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
DROP POLICY IF EXISTS "Users can read quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Quote requests select policy" ON public.quote_requests;

CREATE POLICY "quote_requests_select" 
  ON public.quote_requests FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    OR public.is_admin() 
    OR (
      target_business_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = quote_requests.target_business_id
          AND b.owner_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      JOIN public.businesses b ON b.id = qp.business_id
      WHERE qp.quote_request_id = quote_requests.id
        AND b.owner_id = auth.uid()
    )
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

-- 5. Atualiza a view secure_leads_view
DROP VIEW IF EXISTS public.secure_leads_view;

CREATE VIEW public.secure_leads_view AS
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
  qr.updated_at
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

-- 6. Função RPC segura com privilégio SECURITY DEFINER para exclusão definitiva
CREATE OR REPLACE FUNCTION public.delete_quote_request(p_quote_request_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_owner_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para excluir uma solicitação de orçamento.';
  END IF;

  SELECT user_id INTO v_owner_id FROM public.quote_requests WHERE id = p_quote_request_id;
  v_is_admin := public.is_admin();

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  IF v_owner_id != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas o solicitante do orçamento ou administradores podem excluir este pedido.';
  END IF;

  DELETE FROM public.messages WHERE conversation_id IN (
    SELECT id FROM public.conversations WHERE quote_request_id = p_quote_request_id
  );
  DELETE FROM public.conversations WHERE quote_request_id = p_quote_request_id;
  DELETE FROM public.leads WHERE quote_request_id = p_quote_request_id;
  DELETE FROM public.quote_proposals WHERE quote_request_id = p_quote_request_id;
  DELETE FROM public.quote_requests WHERE id = p_quote_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_quote_request(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
