-- 1. Garante que RLS está habilitado na tabela businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- 2. Recria as políticas de acesso e manipulação
DROP POLICY IF EXISTS "Active businesses are viewable by public" ON public.businesses;
CREATE POLICY "Active businesses are viewable by public"
  ON public.businesses FOR SELECT
  USING (active = true OR owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
CREATE POLICY "Owners can insert their business"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners and admins can update business" ON public.businesses;
CREATE POLICY "Owners and admins can update business"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "Owners and admins can delete business" ON public.businesses;
CREATE POLICY "Owners and admins can delete business"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin());

-- 3. Garante as permissões (Grants) de manipulação de dados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;

-- 4. Atualiza o cache interno do Supabase
NOTIFY pgrst, 'reload schema';
