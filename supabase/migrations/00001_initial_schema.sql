-- ==============================================================================
-- EconomizaJá — Schema de Produção PostgreSQL / Supabase
-- Migração 00001: Estrutura Principal, Tabelas, Índices e Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role_type AS ENUM ('customer', 'business', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE business_plan_type AS ENUM ('gratis', 'pro', 'premium');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE quote_status_type AS ENUM ('aberto', 'propostas_recebidas', 'escolhido', 'finalizado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status_type AS ENUM ('pendente', 'escolhida', 'recusada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status_type AS ENUM ('NEW', 'AVAILABLE', 'PURCHASED', 'CONTACTED', 'QUOTED', 'ACCEPTED', 'COMPLETED', 'EXPIRED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status_type AS ENUM ('ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_type AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABELA PROFILES (VINCULADA AO SUPABASE AUTH)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'customer',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT DEFAULT 'São Paulo',
  state TEXT DEFAULT 'SP',
  neighborhood TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA CATEGORIES & SUBCATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- 5. TABELA BUSINESSES (EMPRESAS E PRESTADORES)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_name TEXT,
  cnpj TEXT,
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  subcategory TEXT NOT NULL,
  description TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'SP',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  working_hours TEXT,
  logo_url TEXT,
  photos TEXT[] DEFAULT '{}',
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  review_count INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  plan_tier business_plan_type NOT NULL DEFAULT 'gratis',
  leads_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MEMBROS DA EMPRESA
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'manager',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- SERVIÇOS DA EMPRESA
CREATE TABLE IF NOT EXISTS public.business_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_price_from NUMERIC(10, 2),
  duration_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUTOS DA EMPRESA
CREATE TABLE IF NOT EXISTS public.business_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABELA OFFERS (OFERTAS E PROMOÇÕES LOCAIS)
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  current_price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  valid_until DATE NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  image_url TEXT,
  verified_discount BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  claims_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABELA QUOTE_REQUESTS (SOLICITAÇÕES DE ORÇAMENTO)
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_email TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'SP',
  neighborhood TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  subcategory TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  desired_deadline TEXT NOT NULL,
  budget_range TEXT,
  photos TEXT[] DEFAULT '{}',
  status quote_status_type NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TABELA QUOTE_PROPOSALS (PROPOSTAS DE ORÇAMENTO ENVIADAS POR EMPRESAS)
CREATE TABLE IF NOT EXISTS public.quote_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  deadline_text TEXT NOT NULL,
  description TEXT NOT NULL,
  status proposal_status_type NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(quote_request_id, business_id)
);

-- 9. TABELA LEADS & LEAD_PURCHASES (SISTEMA COMERCIAL DE LEADS)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  status lead_status_type NOT NULL DEFAULT 'AVAILABLE',
  origin TEXT DEFAULT 'organic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE TABLE IF NOT EXISTS public.lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, business_id)
);

-- 10. TABELA REVIEWS (AVALIAÇÕES REAIS DE EMPRESAS)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  verified_service BOOLEAN NOT NULL DEFAULT false,
  reported BOOLEAN NOT NULL DEFAULT false,
  moderated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- 11. TABELA FAVORITES
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_fav_target CHECK (
    (business_id IS NOT NULL AND offer_id IS NULL) OR
    (business_id IS NULL AND offer_id IS NOT NULL)
  )
);

-- 12. TABELA PRICE_ALERTS (ALERTAS DE PREÇO DO CLIENTE)
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  max_price NUMERIC(10, 2) NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  city TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. TABELA CONVERSATIONS & MESSAGES (CHAT SEGURO E PERSISTENTE)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, customer_id, quote_request_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'business')),
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. TABELA NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  link_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. TABELA SUBSCRIPTIONS (ASSINATURAS REAIS DE EMPRESAS)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_tier business_plan_type NOT NULL,
  status subscription_status_type NOT NULL DEFAULT 'ACTIVE',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  billing_provider TEXT NOT NULL DEFAULT 'google_play_billing',
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. TABELA PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status payment_status_type NOT NULL DEFAULT 'PENDING',
  payment_method TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'subscription_pro', 'subscription_premium', 'lead_pack', 'featured_listing'
  provider_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. TABELA FEATURED_LISTINGS (DESTAQUES PATROCINADOS)
CREATE TABLE IF NOT EXISTS public.featured_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  daily_cost NUMERIC(10, 2) NOT NULL DEFAULT 9.90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. TABELA BUSINESS_METRICS
CREATE TABLE IF NOT EXISTS public.business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  views_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  leads_received INTEGER NOT NULL DEFAULT 0,
  proposals_sent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. TABELA REPORTS (MODERAÇÃO E DENÚNCIAS LGPD / PLAY STORE)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- 'business', 'offer', 'review', 'user'
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED', 'DISMISSED'
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. TABELA ADMIN_ACTIONS (AUDITORIA ADMINISTRATIVA)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. TABELA APP_SETTINGS (CONFIGURAÇÕES DINÂMICAS DO APP & MONETIZAÇÃO)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 22. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_city_cat ON public.businesses(city, category_id, active);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_offers_city_cat ON public.offers(category_id, active);
CREATE INDEX IF NOT EXISTS idx_offers_business ON public.offers(business_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_user ON public.quote_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_cat_city ON public.quote_requests(category_id, city, status);
CREATE INDEX IF NOT EXISTS idx_leads_city_cat ON public.leads(category_id, city, status);
CREATE INDEX IF NOT EXISTS idx_proposals_quote ON public.quote_proposals(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_reviews_business ON public.reviews(business_id);

-- ==============================================================================
-- 23. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- CATEGORIES & SUBCATEGORIES (Public Read, Admin Write)
CREATE POLICY "Categories viewable by public"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Subcategories viewable by public"
  ON public.subcategories FOR SELECT USING (true);

CREATE POLICY "Categories managed by admin only"
  ON public.categories FOR ALL USING (public.is_admin());

CREATE POLICY "Subcategories managed by admin only"
  ON public.subcategories FOR ALL USING (public.is_admin());

-- BUSINESSES POLICIES
CREATE POLICY "Active businesses are viewable by public"
  ON public.businesses FOR SELECT USING (active = true OR owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owners can insert their business"
  ON public.businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update business"
  ON public.businesses FOR UPDATE USING (auth.uid() = owner_id OR public.is_admin());

-- BUSINESS SERVICES & PRODUCTS
CREATE POLICY "Services viewable by public"
  ON public.business_services FOR SELECT USING (true);

CREATE POLICY "Services managed by business owner"
  ON public.business_services FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Products viewable by public"
  ON public.business_products FOR SELECT USING (true);

CREATE POLICY "Products managed by business owner"
  ON public.business_products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.is_admin()
  );

-- OFFERS POLICIES
CREATE POLICY "Active offers viewable by public"
  ON public.offers FOR SELECT USING (active = true OR public.is_admin() OR EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can manage offers"
  ON public.offers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
    OR public.is_admin()
  );

-- QUOTE REQUESTS POLICIES
CREATE POLICY "Customers can view their own quotes"
  ON public.quote_requests FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = auth.uid() AND b.category_id = quote_requests.category_id
    )
  );

CREATE POLICY "Customers can insert their own quotes"
  ON public.quote_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Customers can update their own quotes"
  ON public.quote_requests FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- QUOTE PROPOSALS POLICIES
CREATE POLICY "Proposals viewable by requester and proposing business"
  ON public.quote_proposals FOR SELECT USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.quote_requests qr WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can submit proposals"
  ON public.quote_proposals FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- REVIEWS POLICIES
CREATE POLICY "Reviews viewable by public"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit own reviews; admins can moderate"
  ON public.reviews FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- FAVORITES POLICIES
CREATE POLICY "Users manage own favorites"
  ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- PRICE ALERTS POLICIES
CREATE POLICY "Users manage own price alerts"
  ON public.price_alerts FOR ALL USING (auth.uid() = user_id);

-- CONVERSATIONS & MESSAGES POLICIES
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT USING (
    customer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (
        c.customer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = c.business_id AND b.owner_id = auth.uid()) OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (
        c.customer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = c.business_id AND b.owner_id = auth.uid())
      )
    )
  );

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can access own notifications"
  ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- SUBSCRIPTIONS & PAYMENTS
CREATE POLICY "Businesses view own subscriptions"
  ON public.subscriptions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()) OR
    public.is_admin()
  );

-- APP SETTINGS
CREATE POLICY "App settings viewable by all"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "App settings editable by admin only"
  ON public.app_settings FOR ALL USING (public.is_admin());

-- REPORTS
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can manage reports"
  ON public.reports FOR ALL USING (public.is_admin());

-- ==============================================================================
-- 24. TRIGGER: AUTO-PROFILE ON SUPABASE AUTH SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, city, state)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role_type, 'customer'),
    COALESCE(new.raw_user_meta_data->>'city', 'São Paulo'),
    COALESCE(new.raw_user_meta_data->>'state', 'SP')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
