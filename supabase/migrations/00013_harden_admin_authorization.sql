-- ==============================================================================
-- EconomizaJá — Migration 00013: Harden Authorization Architecture & Schema Resilience
-- ==============================================================================
-- 1. Idempotent check and creation of public.user_role_type ENUM.
-- 2. Safe verification and alignment of public.profiles.role type and values.
-- 3. Dual-layer security: Supabase/PostgreSQL is the ultimate authority.
-- 4. Master Admin (matheusfranck2013@gmail.com) is permanently authorized via auth.users.
-- 5. Non-recursive is_admin() function with strict SECURITY DEFINER and search_path.
-- 6. Robust handle_new_user() with safe metadata role parsing and zero injection vector.
-- 7. Protection against privilege escalation on public.profiles.
-- 8. Protection of administrative columns and actions on public.businesses.
-- 9. Exclusive DELETE permission for administrators on public.businesses.
-- 10. Protection of public.app_settings with strict least-privilege grants.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. ROBUST ENUM TYPE & PROFILES ROLE ALIGNMENT (PREVENTS ERROR 42704)
-- ------------------------------------------------------------------------------
DO $$ 
BEGIN
  -- Ensure public.user_role_type exists idempotently
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' AND t.typname = 'user_role_type'
  ) THEN
    CREATE TYPE public.user_role_type AS ENUM ('customer', 'business', 'admin');
  END IF;
END $$;

-- Align profiles.role column safely if profiles table exists
DO $$ 
DECLARE
  v_col_type TEXT;
  v_invalid_count INT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';

    IF v_col_type IN ('text', 'character varying') THEN
      -- Validate existing values before conversion
      SELECT COUNT(*) INTO v_invalid_count
      FROM public.profiles
      WHERE role NOT IN ('customer', 'business', 'admin');

      IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Migração interrompida: Encontrados % registros com valores inválidos na coluna profiles.role. Valores permitidos: customer, business, admin.', v_invalid_count;
      END IF;

      ALTER TABLE public.profiles 
        ALTER COLUMN role TYPE public.user_role_type 
        USING role::text::public.user_role_type;
    ELSIF v_col_type IS NULL THEN
      ALTER TABLE public.profiles 
        ADD COLUMN role public.user_role_type NOT NULL DEFAULT 'customer';
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. CENTRALIZED IS_ADMIN() FUNCTION (NO RECURSION, STRICT SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email TEXT;
  v_role public.user_role_type;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Check if authenticated user's verified email in auth.users is the master admin email
  SELECT LOWER(email) INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email = 'matheusfranck2013@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- 2. Check if user's role in public.profiles is admin
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ------------------------------------------------------------------------------
-- 2. AUTOMATIC PROFILE PROVISIONING & MASTER ADMIN AUTO-HEALING
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role_type;
  v_raw_role TEXT;
BEGIN
  IF LOWER(new.email) = 'matheusfranck2013@gmail.com' THEN
    v_role := 'admin'::public.user_role_type;
  ELSE
    -- Safely parse metadata role without risking cast failure on arbitrary input
    v_raw_role := LOWER(COALESCE(new.raw_user_meta_data->>'role', 'customer'));
    IF v_raw_role = 'business' THEN
      v_role := 'business'::public.user_role_type;
    ELSE
      v_role := 'customer'::public.user_role_type;
    END IF;
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

-- Ensure trigger on auth.users is active without duplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ROLE ESCALATION PREVENTION ON PROFILES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_email TEXT;
BEGIN
  SELECT LOWER(email) INTO v_auth_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Master admin email in auth.users is permanently locked to 'admin'
  IF v_auth_email = 'matheusfranck2013@gmail.com' THEN
    NEW.role := 'admin';
    RETURN NEW;
  END IF;

  -- Prevent non-master users from setting their profile email to the master admin email
  IF LOWER(COALESCE(NEW.email, '')) = 'matheusfranck2013@gmail.com' AND v_auth_email <> 'matheusfranck2013@gmail.com' THEN
    RAISE EXCEPTION 'Operação não autorizada: e-mail protegido.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      IF NEW.role = 'admin' OR NEW.role IS NULL THEN
        NEW.role := 'customer';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      NEW.role := OLD.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS enforce_role_security ON public.profiles;
CREATE TRIGGER enforce_role_security
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Synchronize master admin profile role
UPDATE public.profiles
SET role = 'admin'
WHERE LOWER(email) = 'matheusfranck2013@gmail.com'
   OR id IN (
     SELECT id FROM auth.users WHERE LOWER(email) = 'matheusfranck2013@gmail.com'
   );

-- ------------------------------------------------------------------------------
-- 4. PROTECT PUBLIC.BUSINESSES (ADMINISTRATIVE COLUMNS & ACTIONS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_businesses_protect_admin_cols()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
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

  IF NOT public.is_admin() THEN
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
    IF NEW.leads_count IS DISTINCT FROM OLD.leads_count THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar o contador de leads.';
    END IF;
    IF NEW.rating IS DISTINCT FROM OLD.rating THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar a nota de avaliação.';
    END IF;
    IF NEW.review_count IS DISTINCT FROM OLD.review_count THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar a contagem de avaliações.';
    END IF;
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Apenas administradores podem transferir a propriedade da empresa.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS tr_businesses_protect_admin_cols ON public.businesses;
CREATE TRIGGER tr_businesses_protect_admin_cols
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.tg_businesses_protect_admin_cols();

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES FOR PUBLIC.BUSINESSES
-- ------------------------------------------------------------------------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active businesses are viewable by public" ON public.businesses;
CREATE POLICY "Active businesses are viewable by public"
  ON public.businesses FOR SELECT
  USING (active = true OR owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
CREATE POLICY "Owners can insert their business"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Owners and admins can update business" ON public.businesses;
CREATE POLICY "Owners and admins can update business"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- DELETE: EXCLUSIVELY ADMIN
DROP POLICY IF EXISTS "Owners and admins can delete business" ON public.businesses;
DROP POLICY IF EXISTS "Admins only can delete business" ON public.businesses;
CREATE POLICY "Admins only can delete business"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. PROTECT PUBLIC.APP_SETTINGS (LEAST PRIVILEGE GRANTS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings viewable by all" ON public.app_settings;
CREATE POLICY "App settings viewable by all"
  ON public.app_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "App settings editable by admin only" ON public.app_settings;
CREATE POLICY "App settings editable by admin only" 
  ON public.app_settings FOR ALL 
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. REFRESH GRANTS & SCHEMA CACHE
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.app_settings FROM PUBLIC, anon;
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;

NOTIFY pgrst, 'reload schema';
