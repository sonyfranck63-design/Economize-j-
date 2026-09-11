-- ==============================================================================
-- EconomizaJá — Migração 00022: Correção Definitiva de Exclusão de Cotações
-- Permite que clientes e administradores excluam pedidos com segurança e sem
-- bloqueios por foreign keys ou políticas RLS em cascata.
-- ==============================================================================

-- 1. Permite exclusão de propostas vinculadas pelo solicitante da cotação
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

-- 2. Permite exclusão de leads comerciais vinculados à solicitação
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

-- 4. Função RPC segura com privilégio SECURITY DEFINER para exclusão atômica
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

  -- Se o registro já não existe, retorna normalmente
  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  -- Verifica se o usuário atual é o criador do pedido ou um administrador
  IF v_owner_id != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas o solicitante do orçamento ou administradores podem excluir este pedido.';
  END IF;

  -- 1. Remove mensagens de chat vinculadas
  DELETE FROM public.messages WHERE conversation_id IN (
    SELECT id FROM public.conversations WHERE quote_request_id = p_quote_request_id
  );
  DELETE FROM public.conversations WHERE quote_request_id = p_quote_request_id;

  -- 2. Remove leads comerciais
  DELETE FROM public.leads WHERE quote_request_id = p_quote_request_id;

  -- 3. Remove propostas
  DELETE FROM public.quote_proposals WHERE quote_request_id = p_quote_request_id;

  -- 4. Remove a solicitação principal
  DELETE FROM public.quote_requests WHERE id = p_quote_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_quote_request(UUID) TO authenticated;

-- 5. Atualiza o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
