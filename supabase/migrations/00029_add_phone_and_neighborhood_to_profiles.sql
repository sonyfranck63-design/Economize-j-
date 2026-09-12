-- ==============================================================================
-- EconomizaJá — Migração 00029: Adicionar phone, neighborhood e avatar_url em profiles
-- Idempotente e segura: Não apaga dados existentes, apenas estende as colunas
-- ==============================================================================

-- 1. Garante a existência das colunas na tabela public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Atualiza a função handle_new_user() para sincronização resiliente
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
  -- Identifica role inicial
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

  v_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, 'usuario'), '@', 1));
  IF TRIM(COALESCE(v_name, '')) = '' THEN
    v_name := 'Usuário';
  END IF;

  v_city := COALESCE(new.raw_user_meta_data->>'city', 'São Paulo');
  v_state := COALESCE(new.raw_user_meta_data->>'state', 'SP');
  v_phone := COALESCE(new.raw_user_meta_data->>'phone', '');

  -- Inserção segura: trata conflito e atualiza dados
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
      -- Fallback caso phone ainda não exista no schema ativo
      BEGIN
        INSERT INTO public.profiles (id, full_name, email, role, city, state)
        VALUES (
          new.id,
          v_name,
          COALESCE(new.email, ''),
          v_role,
          v_city,
          v_state
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          city = COALESCE(EXCLUDED.city, profiles.city),
          state = COALESCE(EXCLUDED.state, profiles.state);
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'handle_new_user: falha ao sincronizar profile (% - %)', SQLERRM, SQLSTATE;
      END;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
