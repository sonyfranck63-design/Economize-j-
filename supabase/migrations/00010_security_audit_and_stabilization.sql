-- ==============================================================================
-- EconomizaJá — Security Audit and Stabilization Migration
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADMIN IDENTIFICATION MECHANISM
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. SECURING BUSINESSES TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Select
DROP POLICY IF EXISTS "Active businesses are viewable by public" ON public.businesses;
CREATE POLICY "Active businesses are viewable by public"
  ON public.businesses FOR SELECT
  USING (active = true OR owner_id = auth.uid() OR public.is_admin());

-- Insert
DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
CREATE POLICY "Owners can insert their business"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Update (USING para quem pode editar, WITH CHECK para impedir alteração de dono)
DROP POLICY IF EXISTS "Owners and admins can update business" ON public.businesses;
CREATE POLICY "Owners and admins can update business"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- Delete
DROP POLICY IF EXISTS "Owners and admins can delete business" ON public.businesses;
CREATE POLICY "Owners and admins can delete business"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. SECURING QUOTE_REQUESTS TABLE (ORÇAMENTOS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Select
DROP POLICY IF EXISTS "Customers can view their own quotes" ON public.quote_requests;
CREATE POLICY "Customers can view their own quotes"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Insert
DROP POLICY IF EXISTS "Customers can insert their own quotes" ON public.quote_requests;
CREATE POLICY "Customers can insert their own quotes"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update (USING para quem pode editar, WITH CHECK para impedir alteração de solicitante)
DROP POLICY IF EXISTS "Customers can update their own quotes" ON public.quote_requests;
CREATE POLICY "Customers can update their own quotes"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. GRANTS E CACHE
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO authenticated;

NOTIFY pgrst, 'reload schema';
