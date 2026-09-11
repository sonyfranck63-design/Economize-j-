-- ==============================================================================
-- EconomizaJá — Migração 00021: Permissões para Cancelamento e Exclusão de Cotações
-- Permite que o próprio cliente encerre ou exclua seu pedido de orçamento
-- ==============================================================================

-- 1. Garante que a política de DELETE exista para o solicitante (e admin)
DROP POLICY IF EXISTS "Customers can delete their own quotes" ON public.quote_requests;
CREATE POLICY "Customers can delete their own quotes"
  ON public.quote_requests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 2. Concede permissão de exclusão para o papel authenticated
GRANT DELETE ON public.quote_requests TO authenticated;
GRANT DELETE ON public.quote_proposals TO authenticated;

-- 3. Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
