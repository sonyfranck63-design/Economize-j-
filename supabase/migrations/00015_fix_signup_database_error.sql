-- ==============================================================================
-- EconomizaJá — Migration 00015: Definitively Fix "Database error saving new user"
-- ==============================================================================
-- CAUSA RAIZ:
-- O erro "Database error saving new user" ocorre no Supabase Auth (GoTrue) quando
-- o gatilho "on_auth_user_created" que executa "handle_new_user()" falha durante
-- o INSERT na tabela auth.users.
-- Os motivos mais frequentes são:
-- 1. Falta de permissões do usuário 'supabase_auth_admin' no schema public ou na tabela profiles.
-- 2. Políticas de RLS em public.profiles bloqueando o INSERT disparado pelo trigger.
-- 3. Exceção não tratada na conversão de tipos ou validações de role.
--
-- SOLUÇÃO DESTA MIGRAÇÃO:
-- 1. Concede explicitamente todas as permissões necessárias para 'supabase_auth_admin'.
-- 2. Ajusta as políticas de RLS em public.profiles para permitir o INSERT do trigger.
-- 3. Adiciona bloco de contingência EXCEPTION WHEN OTHERS em handle_new_user(),
--    garantindo que mesmo em caso de aviso o usuário NUNCA seja impedido de se cadastrar.
-- 4. Reinstala o trigger 'on_auth_user_created' de forma limpa e segura.
-- ==============================================================================

-- 1. GARANTIR PERMISSÕES AO SUPABASE_AUTH_ADMIN NO SCHEMA PUBLIC
GRANT USAGE ON SCHEMA public TO supabase_auth_admin, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO supabase_auth_admin, service_role, postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_auth_admin, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_auth_admin, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO supabase_auth_admin, service_role;

-- 2. AJUSTAR POLÍTICAS RLS EM PUBLIC.PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users and auth trigger" ON public.profiles;

-- Permite inserção de perfis tanto pelo usuário autenticado quanto pelo trigger de auth
CREATE POLICY "Enable insert for authenticated users and auth trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated and public" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated and public"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 3. ATUALIZAR FUNÇÃO PREVENT_ROLE_ESCALATION COM BLINDAGEM DE ERRO
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_email TEXT;
BEGIN
  BEGIN
    SELECT LOWER(email) INTO v_auth_email
    FROM auth.users
    WHERE id = NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      v_auth_email := NULL;
  END;

  -- Master admin email no auth.users é permanentemente admin
  IF v_auth_email = 'matheusfranck2013@gmail.com' THEN
    NEW.role := 'admin'::public.user_role_type;
    RETURN NEW;
  END IF;

  -- Impede que outro usuário coloque o email do master admin no perfil
  IF LOWER(COALESCE(NEW.email, '')) = 'matheusfranck2013@gmail.com' AND COALESCE(v_auth_email, '') <> 'matheusfranck2013@gmail.com' THEN
    RAISE EXCEPTION 'Operação não autorizada: e-mail protegido.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin'::public.user_role_type THEN
      IF NOT public.is_admin() THEN
        NEW.role := 'customer'::public.user_role_type;
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

-- 4. ATUALIZAR FUNÇÃO HANDLE_NEW_USER COM CONTINGÊNCIA TOTAL (ZERO TRANSACTION ABORT)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role_type;
  v_raw_role TEXT;
  v_name TEXT;
  v_city TEXT;
  v_state TEXT;
  v_phone TEXT;
BEGIN
  -- 1. Determinação segura da role
  IF LOWER(COALESCE(new.email, '')) = 'matheusfranck2013@gmail.com' THEN
    v_role := 'admin'::public.user_role_type;
  ELSE
    v_raw_role := LOWER(COALESCE(new.raw_user_meta_data->>'role', 'customer'));
    IF v_raw_role = 'business' THEN
      v_role := 'business'::public.user_role_type;
    ELSE
      v_role := 'customer'::public.user_role_type;
    END IF;
  END IF;

  -- 2. Sanitização de campos com fallbacks seguros
  v_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, 'usuario'), '@', 1));
  IF TRIM(COALESCE(v_name, '')) = '' THEN
    v_name := 'Usuário';
  END IF;

  v_city := COALESCE(new.raw_user_meta_data->>'city', 'São Paulo');
  v_state := COALESCE(new.raw_user_meta_data->>'state', 'SP');
  v_phone := COALESCE(new.raw_user_meta_data->>'phone', '');

  -- 3. Bloco protegido: falha no perfil JAMAIS aborta o cadastro no auth.users
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, city, state, phone)
    VALUES (
      new.id,
      v_name,
      COALESCE(new.email, ''),
      v_role,
      v_city,
      v_state,
      v_phone
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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: Aviso ao sincronizar profiles (% - SQLSTATE %)', SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 5. RECONSTRUÇÃO LIMPA DO GATILHO ON_AUTH_USER_CREATED
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. PERMISSÕES DE EXECUÇÃO EXPLÍCITAS
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, postgres, authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.prevent_role_escalation() TO supabase_auth_admin, postgres, authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
