-- ==============================================================================
-- EconomizaJá — Migração 00024: Correção Definitiva da secure_leads_view e Deleção
-- ==============================================================================

-- 1. Recria a secure_leads_view incluindo target_business_id e suporte a orçamentos direcionados
DROP VIEW IF EXISTS public.secure_leads_view;

CREATE VIEW public.secure_leads_view AS
SELECT 
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    WHEN public.is_admin() THEN qr.user_phone
    ELSE '****-****'
  END AS user_phone,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_email
    WHEN public.is_admin() THEN qr.user_email
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
  OR EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.owner_id = auth.uid() 
      AND b.active = true
      AND (
        qr.target_business_id = b.id
        OR (
          qr.target_business_id IS NULL
          AND b.category_id = qr.category_id 
          AND LOWER(b.city) = LOWER(qr.city)
        )
      )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated, anon;

-- 2. Assegura RPC de exclusão em cascata definitiva
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
