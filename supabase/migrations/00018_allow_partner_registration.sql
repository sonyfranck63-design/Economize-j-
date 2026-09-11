-- ==============================================================================
-- EconomizaJá — Migration 00018: Allow Partner Self-Registration
-- ==============================================================================
-- OBJETIVO:
-- Permitir que um usuário com role 'customer' possa se tornar 'business' de forma
-- legítima ao cadastrar sua empresa, mantendo a proteção contra privilégios de admin.
-- ==============================================================================

-- 1. ATUALIZAR FUNÇÃO PREVENT_ROLE_ESCALATION PARA PERMITIR UPGRADE PARA BUSINESS
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

  -- Regras de inserção (novo cadastro)
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin'::public.user_role_type THEN
      IF NOT public.is_admin() THEN
        NEW.role := 'customer'::public.user_role_type;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Regras de atualização (mudança de perfil)
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Admin pode fazer qualquer alteração
    IF public.is_admin() THEN
      RETURN NEW;
    END IF;

    -- Permite upgrade de 'customer' para 'business' (auto-serviço de parceiro)
    IF OLD.role = 'customer'::public.user_role_type AND NEW.role = 'business'::public.user_role_type THEN
      RETURN NEW;
    END IF;

    -- Qualquer outra tentativa de mudança de role é bloqueada para não-admins
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 2. GARANTIR QUE RLS PERMITA UPDATE NO PRÓPRIO PERFIL (O campo role já é filtrado pelo trigger acima)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

NOTIFY pgrst, 'reload schema';
