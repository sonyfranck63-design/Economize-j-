-- ==============================================================================
-- EconomizaJá — Migração 00005: Correção de Persistência, Categorias e RLS
-- ==============================================================================

-- 1. ESTRUTURA E CATEGORIAS OFICIAIS
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon_name TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO public.categories (id, name, icon_name, description) VALUES
  ('automotivo', 'Automotivo', 'Car', 'Oficinas, pneus, autoelétrica, troca de óleo e estética'),
  ('casa', 'Casa & Reformas', 'Home', 'Eletricistas, pintores, encanadores, montagem e limpeza'),
  ('tecnologia', 'Tecnologia', 'Smartphone', 'Assistência técnica para celulares, notebooks e impressoras'),
  ('beleza', 'Beleza & Estética', 'Sparkles', 'Barbearias, salões de beleza, manicure e cuidados pessoais'),
  ('alimentacao', 'Alimentação', 'Utensils', 'Pizzarias, lancherias, restaurantes e combos locais'),
  ('servicos-digitais', 'Serviços Digitais', 'Laptop', 'Design gráfico, marketing, fotografia, vídeo e sites'),
  ('produtos', 'Produtos', 'ShoppingBag', 'Produtos a pronta-entrega cadastrados por comércios locais'),
  ('saude', 'Saúde & Beleza', 'Activity', 'Clínicas odontológicas, salões, barbearias, fisioterapia e estética'),
  ('educacao', 'Educação & Aulas', 'GraduationCap', 'Aulas particulares, escolas de idiomas e reforço'),
  ('animais', 'Pet Shop & Veterinária', 'Dog', 'Clínicas veterinárias, banho e tosa, rações'),
  ('servicos', 'Serviços Gerais', 'Wrench', 'Chaveiros, dedetização e reparos gerais')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon_name = COALESCE(EXCLUDED.icon_name, categories.icon_name),
  description = COALESCE(EXCLUDED.description, categories.description);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

-- 2. AJUSTE DE COLUNAS E PERMISSÕES EM PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'SP';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated and public" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated and public"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger para criação automática de profile no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, city, state, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role_type, 'customer'::public.user_role_type),
    COALESCE(new.raw_user_meta_data->>'city', 'São Paulo'),
    COALESCE(new.raw_user_meta_data->>'state', 'SP'),
    COALESCE(new.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    city = COALESCE(EXCLUDED.city, profiles.city),
    state = COALESCE(EXCLUDED.state, profiles.state),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. POLÍTICAS RLS PARA TABELA BUSINESSES (EMPRESAS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

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

-- 4. POLÍTICAS RLS PARA TABELA QUOTE_REQUESTS (ORÇAMENTOS)
-- Mantém intacta a proteção de dados (clientes só veem os próprios orçamentos ou admins)
-- Empresas acessam leads mascarados exclusivamente via secure_leads_view
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can insert their own quotes" ON public.quote_requests;
CREATE POLICY "Customers can insert their own quotes"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recarregar cache de esquema do PostgREST
NOTIFY pgrst, 'reload schema';
