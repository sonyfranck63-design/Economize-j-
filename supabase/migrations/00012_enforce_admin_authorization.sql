-- ==============================================================================
-- EconomizaJá — Enforce Admin Authorization Migration
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENHANCE SECURITY DEFINER FUNCTIONS & PREVENT ROLE ESCALATION
-- ------------------------------------------------------------------------------
-- Ensures the security definer functions cannot be spoofed via search_path
-- Recognizes matheusfranck2013@gmail.com as the permanent master administrator.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = auth.uid()
    WHERE (p.id = auth.uid() AND p.role = 'admin')
       OR (LOWER(COALESCE(u.email, p.email, '')) = 'matheusfranck2013@gmail.com')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, auth;

-- Auto-provision or maintain admin role on signup/auth sync for master admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role_type;
BEGIN
  IF LOWER(new.email) = 'matheusfranck2013@gmail.com' THEN
    v_role := 'admin'::public.user_role_type;
  ELSE
    v_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role_type, 'customer'::public.user_role_type);
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, city, state, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role,
    COALESCE(new.raw_user_meta_data->>'city', 'São Paulo'),
    COALESCE(new.raw_user_meta_data->>'state', 'SP'),
    COALESCE(new.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = CASE 
      WHEN LOWER(EXCLUDED.email) = 'matheusfranck2013@gmail.com' THEN 'admin'::public.user_role_type 
      ELSE profiles.role 
    END,
    city = COALESCE(EXCLUDED.city, profiles.city),
    state = COALESCE(EXCLUDED.state, profiles.state),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Master admin email is permanently authorized as admin
  IF LOWER(COALESCE(NEW.email, '')) = 'matheusfranck2013@gmail.com' THEN
    NEW.role := 'admin';
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      -- Default new profile to customer or business, NEVER allow admin on self-insert
      IF NEW.role = 'admin' OR NEW.role IS NULL THEN
        NEW.role := 'customer';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      -- Silently revert the role change if not an admin
      NEW.role := OLD.role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_role_security ON public.profiles;
CREATE TRIGGER enforce_role_security
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Promote any existing profile for the master admin to 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE LOWER(email) = 'matheusfranck2013@gmail.com';

-- ------------------------------------------------------------------------------
-- 2. PROTECT BUSINESSES TABLE (ADMINISTRATIVE COLUMNS & ACTIONS)
-- ------------------------------------------------------------------------------
-- Prevents business owners from artificially verifying, featuring, activating,
-- or changing plan tiers on their own businesses on INSERT or UPDATE.
-- Structural columns (owner_id) are strictly frozen.

CREATE OR REPLACE FUNCTION public.tg_businesses_protect_admin_cols()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      -- Force safe defaults for all administrative and system columns on insert
      NEW.verified := false;
      NEW.featured := false;
      NEW.plan_tier := 'gratis';
      NEW.leads_count := 0;
      NEW.rating := 5.00;
      NEW.review_count := 0;
      NEW.active := true;
      NEW.owner_id := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  IF NOT public.is_admin() THEN
    -- Administrative columns
    IF NEW.verified IS DISTINCT FROM OLD.verified THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o status de verificação da empresa.';
    END IF;
    IF NEW.featured IS DISTINCT FROM OLD.featured THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o status de destaque da empresa.';
    END IF;
    IF NEW.active IS DISTINCT FROM OLD.active THEN
      RAISE EXCEPTION 'Apenas administradores podem ativar ou inativar a empresa.';
    END IF;
    IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o plano da empresa diretamente.';
    END IF;
    
    -- System-managed columns
    IF NEW.leads_count IS DISTINCT FROM OLD.leads_count THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar o contador de leads.';
    END IF;
    IF NEW.rating IS DISTINCT FROM OLD.rating THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar a nota de avaliação.';
    END IF;
    IF NEW.review_count IS DISTINCT FROM OLD.review_count THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar a contagem de avaliações.';
    END IF;
    
    -- Structural locks
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Apenas administradores podem transferir a propriedade da empresa.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_businesses_protect_admin_cols ON public.businesses;
CREATE TRIGGER tr_businesses_protect_admin_cols
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.tg_businesses_protect_admin_cols();

-- DELETE BUSINESS: Exclusively ADMIN
-- Partners/businesses and customers CANNOT delete a business record. Only admins can.
DROP POLICY IF EXISTS "Owners and admins can delete business" ON public.businesses;
DROP POLICY IF EXISTS "Admins only can delete business" ON public.businesses;
CREATE POLICY "Admins only can delete business"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. PROTECT APP_SETTINGS TABLE (MONETIZATION & PIX CONFIGURATION)
-- ------------------------------------------------------------------------------
-- app_settings is viewable by all (to display pricing and PIX payment info to partners)
-- but can ONLY be inserted, updated, or deleted by an administrator.

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings viewable by all" ON public.app_settings;
CREATE POLICY "App settings viewable by all"
  ON public.app_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "App settings editable by admin only" ON public.app_settings;
CREATE POLICY "App settings editable by admin only" 
  ON public.app_settings FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. GRANTS
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;

NOTIFY pgrst, 'reload schema';
