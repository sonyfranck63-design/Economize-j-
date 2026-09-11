-- 1. Garante que RLS está habilitado
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- 2. Recria a política de INSERT
DROP POLICY IF EXISTS "Customers can insert their own quotes" ON public.quote_requests;
CREATE POLICY "Customers can insert their own quotes"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Recria a política de SELECT
DROP POLICY IF EXISTS "Customers can view their own quotes" ON public.quote_requests;
CREATE POLICY "Customers can view their own quotes"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 4. Garante as permissões (Grants) de manipulação de dados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO authenticated;

-- 5. Atualiza o cache interno do Supabase
NOTIFY pgrst, 'reload schema';
