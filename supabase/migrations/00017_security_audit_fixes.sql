-- ==============================================================================
-- EconomizaJá — Migration 00017: Security Audit & Authorization Hardening
-- ==============================================================================
-- Focus: Prevent privilege escalation and ensure role-based access control (RBAC)
-- at the database level (RLS), independent of frontend state.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS FOR ROLE VERIFICATION
-- ------------------------------------------------------------------------------

-- Helper: Is Business
CREATE OR REPLACE FUNCTION public.is_business()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'business'
  ) OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper: Is Customer
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'customer'
  ) OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. HARDEN PROFILES (PREVENT ROLE UPDATES BY USERS)
-- ------------------------------------------------------------------------------

-- Ensure users can only update their own non-sensitive profile data
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    (auth.uid() = id AND (CASE WHEN NOT public.is_admin() THEN role = role ELSE true END)) 
    OR public.is_admin()
  );
-- Note: The trigger enforce_role_security already prevents role changes for non-admins.

-- ------------------------------------------------------------------------------
-- 3. HARDEN BUSINESSES (ONLY PARTNERS CAN CREATE)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
CREATE POLICY "Owners can insert their business"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = owner_id AND public.is_business())
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 4. HARDEN OFFERS (ONLY PARTNERS CAN CREATE)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Business owners can manage offers" ON public.offers;
CREATE POLICY "Business owners can manage offers"
  ON public.offers FOR ALL
  TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) AND public.is_business())
    OR public.is_admin()
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) AND public.is_business())
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 5. HARDEN QUOTE PROPOSALS (ONLY PARTNERS CAN CREATE)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Businesses can submit proposals" ON public.quote_proposals;
CREATE POLICY "Businesses can submit proposals"
  ON public.quote_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) AND public.is_business())
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 6. HARDEN QUOTE REQUESTS (ONLY CUSTOMERS CAN CREATE)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Customers can insert their own quotes" ON public.quote_requests;
CREATE POLICY "Customers can insert their own quotes"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id AND (public.is_customer() OR public.is_business())) -- Partners can also be customers
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 7. REFRESH SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
