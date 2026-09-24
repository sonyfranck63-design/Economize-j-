-- ==============================================================================
-- EconomizaJÃ¡ â€” MigraÃ§Ã£o 00026: Hardening de ProduÃ§Ã£o, SeguranÃ§a e Conformidade
-- Atende a:
-- 1. CriaÃ§Ã£o e atualizaÃ§Ã£o de tabelas de monetizaÃ§Ã£o (subscriptions, payments, featured_listings, lead_purchases)
-- 2. Limites de planos validados estritamente no banco (backend)
-- 3. PrecificaÃ§Ã£o dinÃ¢mica e automÃ¡tica de leads comerciais via app_settings
-- 4. Isolamento estrito de orÃ§amentos direcionados (bloqueio de propostas indevidas)
-- 5. RevogaÃ§Ã£o de acesso anon na secure_leads_view
-- 6. RPCs seguras de transaÃ§Ã£o para assinaturas, destaques e leads
-- 7. Desacoplamento de plano e destaque patrocinado (validaÃ§Ã£o temporal)
-- 8. Limpeza atÃ´mica completa para LGPD / Google Play
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELAS DE MONETIZAÃ‡ÃƒO, ASSINATURAS E LEADS (IDEMPOTENTE)
-- ------------------------------------------------------------------------------

-- Garante colunas necessÃ¡rias na tabela leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 15.00;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'AVAILABLE';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'organic';

-- Garante colunas na tabela businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS leads_count INT DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'gratis';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Tabela de Assinaturas (subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('gratis', 'pro', 'premium')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED', 'FAILED')),
  billing_provider TEXT DEFAULT 'google_play_billing',
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own business subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own business subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Tabela de Pagamentos (payments)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  payment_method TEXT DEFAULT 'google_play_billing',
  purpose TEXT NOT NULL,
  provider_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    user_id = auth.uid()
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments"
  ON public.payments FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Tabela de Destaques Patrocinados (featured_listings)
CREATE TABLE IF NOT EXISTS public.featured_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  daily_cost NUMERIC(10, 2) NOT NULL DEFAULT 9.90,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active featured listings" ON public.featured_listings;
CREATE POLICY "Anyone can view active featured listings"
  ON public.featured_listings FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Owners can manage their featured listings" ON public.featured_listings;
CREATE POLICY "Owners can manage their featured listings"
  ON public.featured_listings FOR ALL
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Tabela de Compras de Lead (lead_purchases)
CREATE TABLE IF NOT EXISTS public.lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_lead_business UNIQUE (lead_id, business_id)
);

ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Businesses can view own lead purchases" ON public.lead_purchases;
CREATE POLICY "Businesses can view own lead purchases"
  ON public.lead_purchases FOR SELECT
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ------------------------------------------------------------------------------
-- 2. REVOGAÃ‡ÃƒO DE ACESSO ANON NA VIEW SECURE_LEADS_VIEW
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'secure_leads_view' AND schemaname = 'public') THEN
    REVOKE ALL ON public.secure_leads_view FROM anon;
    GRANT SELECT ON public.secure_leads_view TO authenticated;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER: PRECIFICAÃ‡ÃƒO DINÃ‚MICA E CRIAÃ‡ÃƒO AUTOMÃTICA DE LEADS
-- LÃª o preÃ§o configurado pelo Admin em app_settings ('monetization'->'costPerLead')
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_auto_create_lead_from_quote()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_price NUMERIC(10, 2) := 15.00;
  v_settings_val JSONB;
BEGIN
  -- OrÃ§amentos direcionados para uma empresa especÃ­fica sÃ£o exclusivos
  -- e NÃƒO viram leads Ã  venda no marketplace geral.
  IF NEW.target_business_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Tenta buscar o preÃ§o parametrizado pelo Admin em app_settings
  BEGIN
    SELECT value INTO v_settings_val 
    FROM public.app_settings 
    WHERE key = 'monetization';

    IF v_settings_val IS NOT NULL AND (v_settings_val->>'costPerLead') IS NOT NULL THEN
      v_lead_price := (v_settings_val->>'costPerLead')::NUMERIC(10, 2);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_lead_price := 15.00;
  END;

  -- Cria o lead comercial correspondente
  INSERT INTO public.leads (
    quote_request_id,
    category_id,
    city,
    state,
    neighborhood,
    title,
    description,
    price,
    status,
    origin
  ) VALUES (
    NEW.id,
    NEW.category_id,
    NEW.city,
    NEW.state,
    NEW.neighborhood,
    NEW.title,
    NEW.description,
    v_lead_price,
    'AVAILABLE',
    'organic'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_auto_create_lead_from_quote ON public.quote_requests;
CREATE TRIGGER tr_auto_create_lead_from_quote
  AFTER INSERT ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_auto_create_lead_from_quote();

-- ------------------------------------------------------------------------------
-- 4. TRIGGER: VALIDAÃ‡ÃƒO DE LIMITES DE PLANO E ORÃ‡AMENTOS DIRECIONADOS EM PROPOSTAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_validate_quote_proposal_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_biz_owner UUID;
  v_biz_plan TEXT;
  v_target_biz UUID;
  v_monthly_count INT;
BEGIN
  -- 1. Verifica se a empresa existe e se o usuÃ¡rio atual Ã© o proprietÃ¡rio ou admin
  SELECT owner_id, COALESCE(plan_tier, 'gratis')
  INTO v_biz_owner, v_biz_plan
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF v_biz_owner IS NULL THEN
    RAISE EXCEPTION 'Empresa proponente nÃ£o encontrada.';
  END IF;

  IF v_biz_owner != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'VocÃª sÃ³ pode enviar propostas atravÃ©s de empresas das quais Ã© proprietÃ¡rio.';
  END IF;

  -- 2. Verifica se o orÃ§amento Ã© direcionado para OUTRA empresa
  SELECT target_business_id
  INTO v_target_biz
  FROM public.quote_requests
  WHERE id = NEW.quote_request_id;

  IF v_target_biz IS NOT NULL AND v_target_biz != NEW.business_id THEN
    RAISE EXCEPTION 'Este orÃ§amento Ã© exclusivo e foi direcionado a outro parceiro.';
  END IF;

  -- 3. Limite do Plano Gratuito: mÃ¡ximo 3 propostas por mÃªs
  IF v_biz_plan = 'gratis' AND NOT public.is_admin() THEN
    SELECT COUNT(*)
    INTO v_monthly_count
    FROM public.quote_proposals
    WHERE business_id = NEW.business_id
      AND created_at >= date_trunc('month', NOW());

    IF v_monthly_count >= 3 THEN
      RAISE EXCEPTION 'Limite de 3 propostas mensais atingido para o Plano Gratuito. FaÃ§a upgrade para o Plano PrÃ³ para enviar propostas ilimitadas.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_validate_quote_proposal_submission ON public.quote_proposals;
CREATE TRIGGER tr_validate_quote_proposal_submission
  BEFORE INSERT ON public.quote_proposals
  FOR EACH ROW EXECUTE FUNCTION public.tg_validate_quote_proposal_submission();

-- ------------------------------------------------------------------------------
-- 5. TRIGGER: VALIDAÃ‡ÃƒO DE LIMITES DE OFERTAS ATIVAS POR PLANO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_validate_offer_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_biz_owner UUID;
  v_biz_plan TEXT;
  v_active_offers_count INT;
BEGIN
  -- SÃ³ aplica checagem em novas inserÃ§Ãµes ativas ou ativaÃ§Ã£o de oferta
  IF NEW.active IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT owner_id, COALESCE(plan_tier, 'gratis')
  INTO v_biz_owner, v_biz_plan
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF v_biz_owner IS NULL THEN
    RAISE EXCEPTION 'Empresa vinculada Ã  oferta nÃ£o encontrada.';
  END IF;

  IF v_biz_owner != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'VocÃª sÃ³ pode publicar ofertas em empresas das quais Ã© proprietÃ¡rio.';
  END IF;

  -- Contagem de ofertas ativas da empresa
  SELECT COUNT(*)
  INTO v_active_offers_count
  FROM public.offers
  WHERE business_id = NEW.business_id
    AND active = true
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF v_biz_plan = 'gratis' AND v_active_offers_count >= 1 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Limite de 1 oferta ativa atingido para o Plano Gratuito. FaÃ§a upgrade para o Plano PrÃ³ para publicar atÃ© 5 ofertas simultÃ¢neas.';
  ELSIF v_biz_plan = 'pro' AND v_active_offers_count >= 5 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Limite de 5 ofertas ativas atingido para o Plano PrÃ³. FaÃ§a upgrade para o Plano Premium para publicar ofertas ilimitadas.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_validate_offer_submission ON public.offers;
CREATE TRIGGER tr_validate_offer_submission
  BEFORE INSERT OR UPDATE OF active ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.tg_validate_offer_submission();

-- ------------------------------------------------------------------------------
-- 6. RPC: INICIAR ASSINATURA DE PLANO (ESTADO PENDING SEGURO)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.initiate_plan_subscription(
  p_business_id UUID,
  p_plan_tier TEXT,
  p_billing_provider TEXT DEFAULT 'google_play_billing'
)
RETURNS JSONB AS $$
DECLARE
  v_biz_owner UUID;
  v_sub_id UUID;
  v_payment_id UUID;
  v_amount NUMERIC(10, 2) := 0.00;
  v_settings_val JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autenticado.';
  END IF;

  -- Valida proprietÃ¡rio da empresa
  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o responsÃ¡vel pela empresa pode contratar planos.';
  END IF;

  IF p_plan_tier NOT IN ('pro', 'premium') THEN
    RAISE EXCEPTION 'Plano invÃ¡lido para contrataÃ§Ã£o: %', p_plan_tier;
  END IF;

  -- Determina valor no app_settings
  BEGIN
    SELECT value INTO v_settings_val FROM public.app_settings WHERE key = 'monetization';
    IF p_plan_tier = 'pro' THEN
      v_amount := COALESCE((v_settings_val->>'planProMonthly')::NUMERIC(10, 2), 49.90);
    ELSE
      v_amount := COALESCE((v_settings_val->>'planPremiumMonthly')::NUMERIC(10, 2), 149.90);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_amount := CASE WHEN p_plan_tier = 'pro' THEN 49.90 ELSE 149.90 END;
  END;

  -- Cria assinatura com status PENDING
  INSERT INTO public.subscriptions (
    business_id,
    plan_tier,
    status,
    billing_provider,
    current_period_start,
    current_period_end
  ) VALUES (
    p_business_id,
    p_plan_tier,
    'PENDING',
    p_billing_provider,
    NOW(),
    NOW() + INTERVAL '30 days'
  ) RETURNING id INTO v_sub_id;

  -- Registra intenÃ§Ã£o de pagamento com status PENDING
  INSERT INTO public.payments (
    user_id,
    business_id,
    amount,
    currency,
    status,
    payment_method,
    purpose,
    provider_payment_id
  ) VALUES (
    auth.uid(),
    p_business_id,
    v_amount,
    'BRL',
    'PENDING',
    p_billing_provider,
    'subscription_' || p_plan_tier,
    v_sub_id::text
  ) RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'subscription_id', v_sub_id,
    'payment_id', v_payment_id,
    'plan_tier', p_plan_tier,
    'status', 'PENDING',
    'amount', v_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.initiate_plan_subscription(UUID, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. RPC: CONFIRMAÃ‡ÃƒO DE ASSINATURA (TRANSIÃ‡ÃƒO PENDING -> ACTIVE)
-- ValidaÃ§Ã£o segura por Admin ou Provedor de Pagamento
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_plan_subscription(
  p_subscription_id UUID,
  p_provider_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_sub RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ou webhooks autorizados podem ativar assinaturas.';
  END IF;

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE id = p_subscription_id;

  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'Assinatura nÃ£o encontrada.';
  END IF;

  -- Transiciona assinatura para ACTIVE
  UPDATE public.subscriptions
  SET status = 'ACTIVE',
      provider_subscription_id = COALESCE(p_provider_transaction_id, provider_subscription_id),
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '30 days',
      updated_at = NOW()
  WHERE id = p_subscription_id;

  -- Transiciona pagamentos vinculados para COMPLETED
  UPDATE public.payments
  SET status = 'COMPLETED'
  WHERE business_id = v_sub.business_id 
    AND (provider_payment_id = p_subscription_id::text OR status = 'PENDING');

  -- Atualiza o benefÃ­cio (plan_tier) na tabela de empresas
  UPDATE public.businesses
  SET plan_tier = v_sub.plan_tier
  WHERE id = v_sub.business_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'business_id', v_sub.business_id,
    'plan_tier', v_sub.plan_tier,
    'status', 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.confirm_plan_subscription(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. GESTÃƒO TEMPORAL DE DESTAQUES PATROCINADOS (FEATURED_LISTINGS)
-- Plano != Destaque. O destaque tem inÃ­cio e tÃ©rmino definidos.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_featured_listing(
  p_business_id UUID,
  p_days INT,
  p_offer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_biz_owner UUID;
  v_daily_rate NUMERIC(10, 2) := 9.90;
  v_settings_val JSONB;
  v_total_cost NUMERIC(10, 2);
  v_listing_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autenticado.';
  END IF;

  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o proprietÃ¡rio da empresa pode contratar destaque.';
  END IF;

  IF p_days < 1 THEN
    RAISE EXCEPTION 'PerÃ­odo mÃ­nimo de destaque Ã© de 1 dia.';
  END IF;

  BEGIN
    SELECT value INTO v_settings_val FROM public.app_settings WHERE key = 'monetization';
    v_daily_rate := COALESCE((v_settings_val->>'featuredDailyRate')::NUMERIC(10, 2), 9.90);
  EXCEPTION WHEN OTHERS THEN
    v_daily_rate := 9.90;
  END;

  v_total_cost := v_daily_rate * p_days;

  INSERT INTO public.featured_listings (
    business_id,
    offer_id,
    start_date,
    end_date,
    active,
    daily_cost
  ) VALUES (
    p_business_id,
    p_offer_id,
    CURRENT_DATE,
    CURRENT_DATE + (p_days || ' days')::INTERVAL,
    true,
    v_daily_rate
  ) RETURNING id INTO v_listing_id;

  -- Atualiza a flag da empresa
  UPDATE public.businesses
  SET featured = true
  WHERE id = p_business_id;

  RETURN jsonb_build_object(
    'listing_id', v_listing_id,
    'business_id', p_business_id,
    'days', p_days,
    'daily_rate', v_daily_rate,
    'total_cost', v_total_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_featured_listing(UUID, INT, UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 9. RPC: COMPRA TRANSACIONAL DE LEAD (PREVINE RACE CONDITION E DUPLICIDADE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_lead_with_credits(
  p_lead_id UUID,
  p_business_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_lead RECORD;
  v_biz_owner UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autenticado.';
  END IF;

  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o proprietÃ¡rio da empresa pode adquirir este lead.';
  END IF;

  -- Lock no registro do lead para evitar concorrÃªncia simultÃ¢nea
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead nÃ£o encontrado.';
  END IF;

  IF v_lead.status NOT IN ('AVAILABLE', 'NEW') THEN
    RAISE EXCEPTION 'Este lead nÃ£o estÃ¡ mais disponÃ­vel para aquisiÃ§Ã£o.';
  END IF;

  -- Verifica se a empresa jÃ¡ comprou o lead
  IF EXISTS (
    SELECT 1 FROM public.lead_purchases 
    WHERE lead_id = p_lead_id AND business_id = p_business_id
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_purchased', true,
      'lead_id', p_lead_id
    );
  END IF;

  -- Registra a compra atÃ´mica
  INSERT INTO public.lead_purchases (
    lead_id,
    business_id,
    price,
    status
  ) VALUES (
    p_lead_id,
    p_business_id,
    v_lead.price,
    'CONFIRMED'
  );

  -- Atualiza contador transacional de mÃ©tricas da empresa
  UPDATE public.businesses
  SET leads_count = COALESCE(leads_count, 0) + 1
  WHERE id = p_business_id;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'business_id', p_business_id,
    'price', v_lead.price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.purchase_lead_with_credits(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 10. HARDENING LGPD & GOOGLE PLAY: EXCLUSÃƒO ATÃ”MICA TOTAL DE CONTA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  r_quote RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autenticado: faÃ§a login para excluir sua conta.';
  END IF;

  -- 1. Exclui com integridade todas as cotaÃ§Ãµes criadas pelo usuÃ¡rio
  FOR r_quote IN SELECT id FROM public.quote_requests WHERE user_id = v_user_id LOOP
    PERFORM public.delete_quote_request(r_quote.id);
  END LOOP;

  -- 2. Remove notificaÃ§Ãµes e favoritos
  DELETE FROM public.favorites WHERE user_id = v_user_id;
  DELETE FROM public.price_alerts WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.device_tokens WHERE user_id = v_user_id;

  -- 3. Inativa empresas do usuÃ¡rio para nÃ£o deixar registros Ã³rfÃ£os
  UPDATE public.businesses SET active = false WHERE owner_id = v_user_id;

  -- 4. Remove o perfil em public.profiles
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 5. Remove o usuÃ¡rio da autenticaÃ§Ã£o Supabase (auth.users)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
-- ==============================================================================
-- EconomizaJÃ¡ â€” MigraÃ§Ã£o 00027: CorreÃ§Ã£o Definitiva do Aceite, Propostas e MonetizaÃ§Ã£o
-- 1. RPC accept_quote_proposal: Aceite atÃ´mico pelo consumidor com bloqueio transacional
-- 2. RPC submit_quote_proposal: SubmissÃ£o transacional com transiÃ§Ã£o para propostas_recebidas
-- 3. CorreÃ§Ã£o do Destaque: initiate_featured_listing com status PENDING e sem ativaÃ§Ã£o indevida
-- 4. RPC confirm_featured_listing: ConfirmaÃ§Ã£o protegida restrita a administradores
-- 5. Trigger on_proposal_inserted: AtualizaÃ§Ã£o automÃ¡tica para propostas_recebidas
-- 6. Trigger trg_protect_quote_request_status: ValidaÃ§Ã£o rigorosa de mÃ¡quina de estados
-- ==============================================================================

-- 1. RPC: ACEITE DE PROPOSTA PELO CONSUMIDOR (TRANSAÃ‡ÃƒO ATÃ”MICA PROTEGIDA)
CREATE OR REPLACE FUNCTION public.accept_quote_proposal(
  p_quote_request_id UUID,
  p_proposal_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_quote RECORD;
  v_prop RECORD;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autenticado: faÃ§a login para aceitar uma proposta comercial.';
  END IF;

  v_is_admin := public.is_admin();

  -- Lock no quote_request com FOR UPDATE para evitar race condition
  SELECT * INTO v_quote
  FROM public.quote_requests
  WHERE id = p_quote_request_id
  FOR UPDATE;

  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'SolicitaÃ§Ã£o de orÃ§amento nÃ£o encontrada.';
  END IF;

  -- Verifica se o usuÃ¡rio atual Ã© o solicitante ou administrador
  IF v_quote.user_id != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas o cliente solicitante pode aceitar uma proposta comercial para este orÃ§amento.';
  END IF;

  -- Impede aceite se o orÃ§amento jÃ¡ estiver cancelado ou finalizado
  IF v_quote.status = 'cancelado' THEN
    RAISE EXCEPTION 'NÃ£o Ã© possÃ­vel aceitar propostas para um pedido de orÃ§amento encerrado/cancelado.';
  END IF;

  -- Lock na proposta para garantir integridade atÃ´mica
  SELECT * INTO v_prop
  FROM public.quote_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF v_prop.id IS NULL THEN
    RAISE EXCEPTION 'Proposta comercial nÃ£o encontrada.';
  END IF;

  IF v_prop.quote_request_id != p_quote_request_id THEN
    RAISE EXCEPTION 'A proposta informada nÃ£o pertence a este orÃ§amento.';
  END IF;

  IF v_prop.status = 'recusada' THEN
    RAISE EXCEPTION 'Esta proposta foi recusada anteriormente e nÃ£o pode ser reativada.';
  END IF;

  -- ExecuÃ§Ã£o atÃ´mica no banco de dados:
  -- A) Marca a proposta escolhida como 'escolhida'
  UPDATE public.quote_proposals
  SET status = 'escolhida', updated_at = NOW()
  WHERE id = p_proposal_id;

  -- B) Marca todas as demais propostas do mesmo orÃ§amento como 'recusada'
  UPDATE public.quote_proposals
  SET status = 'recusada', updated_at = NOW()
  WHERE quote_request_id = p_quote_request_id AND id != p_proposal_id;

  -- C) Atualiza o status do orÃ§amento para 'escolhido'
  UPDATE public.quote_requests
  SET status = 'escolhido', updated_at = NOW()
  WHERE id = p_quote_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'quote_request_id', p_quote_request_id,
    'proposal_id', p_proposal_id,
    'proposal_status', 'escolhida',
    'quote_status', 'escolhido',
    'business_id', v_prop.business_id,
    'price', v_prop.price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.accept_quote_proposal(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_quote_proposal(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_quote_proposal(UUID, UUID) TO authenticated;


-- 2. RPC: SUBMISSÃƒO SEGURA DE PROPOSTA COM TRANSIÃ‡ÃƒO DE STATUS
CREATE OR REPLACE FUNCTION public.submit_quote_proposal(
  p_quote_request_id UUID,
  p_business_id UUID,
  p_price NUMERIC,
  p_deadline_text TEXT,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_biz RECORD;
  v_quote RECORD;
  v_proposal_id UUID;
  v_monthly_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autenticado: faÃ§a login para submeter uma proposta.';
  END IF;

  -- Valida a empresa e proprietÃ¡rio
  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa prestadora nÃ£o encontrada.';
  END IF;

  IF v_biz.owner_id != v_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'VocÃª sÃ³ pode enviar propostas atravÃ©s de empresas das quais Ã© proprietÃ¡rio.';
  END IF;

  -- Valida o orÃ§amento com lock
  SELECT * INTO v_quote
  FROM public.quote_requests
  WHERE id = p_quote_request_id
  FOR UPDATE;

  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'OrÃ§amento nÃ£o encontrado.';
  END IF;

  IF v_quote.status = 'cancelado' THEN
    RAISE EXCEPTION 'Este pedido de orÃ§amento foi encerrado pelo cliente e nÃ£o recebe mais propostas.';
  END IF;

  IF v_quote.status IN ('escolhido', 'finalizado') THEN
    RAISE EXCEPTION 'Este orÃ§amento jÃ¡ foi definido com outro parceiro comercial.';
  END IF;

  -- OrÃ§amento direcionado a outra empresa especÃ­fica
  IF v_quote.target_business_id IS NOT NULL AND v_quote.target_business_id != p_business_id THEN
    RAISE EXCEPTION 'Este orÃ§amento Ã© exclusivo e foi direcionado a outro parceiro.';
  END IF;

  -- Limite de propostas do plano gratuito (3 propostas/mÃªs)
  IF COALESCE(v_biz.plan_tier, 'gratis') = 'gratis' AND NOT public.is_admin() THEN
    SELECT COUNT(*) INTO v_monthly_count
    FROM public.quote_proposals
    WHERE business_id = p_business_id
      AND created_at >= date_trunc('month', NOW());

    IF v_monthly_count >= 3 THEN
      RAISE EXCEPTION 'Limite de 3 propostas mensais atingido para o Plano Gratuito. FaÃ§a upgrade para o Plano PrÃ³ para enviar propostas ilimitadas.';
    END IF;
  END IF;

  -- Insere ou atualiza a proposta
  INSERT INTO public.quote_proposals (
    quote_request_id,
    business_id,
    price,
    deadline_text,
    description,
    status
  ) VALUES (
    p_quote_request_id,
    p_business_id,
    p_price,
    p_deadline_text,
    p_description,
    'pendente'
  )
  ON CONFLICT (quote_request_id, business_id) DO UPDATE
  SET price = EXCLUDED.price,
      deadline_text = EXCLUDED.deadline_text,
      description = EXCLUDED.description,
      updated_at = NOW()
  RETURNING id INTO v_proposal_id;

  -- Transiciona o orÃ§amento para 'propostas_recebidas' se ainda estiver 'aberto'
  IF v_quote.status = 'aberto' THEN
    UPDATE public.quote_requests
    SET status = 'propostas_recebidas', updated_at = NOW()
    WHERE id = p_quote_request_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'proposal_id', v_proposal_id,
    'quote_request_id', p_quote_request_id,
    'business_id', p_business_id,
    'status', 'pendente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;


-- 3. CORREÃ‡ÃƒO DO DESTAQUE PATROCINADO (STATUS PENDING OBRIGATÃ“RIO, SEM ATIVAÃ‡ÃƒO GRATUITA)
CREATE OR REPLACE FUNCTION public.initiate_featured_listing(
  p_business_id UUID,
  p_days INT,
  p_offer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_biz_owner UUID;
  v_daily_rate NUMERIC(10, 2) := 19.90;
  v_settings_val JSONB;
  v_total_cost NUMERIC(10, 2);
  v_listing_id UUID;
  v_payment_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autenticado: faÃ§a login para contratar destaque.';
  END IF;

  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o proprietÃ¡rio da empresa pode solicitar destaque.';
  END IF;

  IF p_days < 1 THEN
    RAISE EXCEPTION 'PerÃ­odo mÃ­nimo de destaque Ã© de 1 dia.';
  END IF;

  BEGIN
    SELECT value INTO v_settings_val FROM public.app_settings WHERE key = 'monetization';
    v_daily_rate := COALESCE((v_settings_val->>'featuredDailyRate')::NUMERIC(10, 2), 19.90);
  EXCEPTION WHEN OTHERS THEN
    v_daily_rate := 19.90;
  END;

  v_total_cost := v_daily_rate * p_days;

  -- 1. Insere o destaque com active = FALSE (NÃƒO ATIVADO ATÃ‰ CONFIRMAÃ‡ÃƒO)
  INSERT INTO public.featured_listings (
    business_id,
    offer_id,
    start_date,
    end_date,
    active,
    daily_cost
  ) VALUES (
    p_business_id,
    p_offer_id,
    CURRENT_DATE,
    CURRENT_DATE + (p_days || ' days')::INTERVAL,
    false,
    v_daily_rate
  ) RETURNING id INTO v_listing_id;

  -- 2. Gera registro financeiro com status PENDING
  INSERT INTO public.payments (
    user_id,
    business_id,
    amount,
    currency,
    status,
    payment_method,
    purpose,
    provider_payment_id
  ) VALUES (
    auth.uid(),
    p_business_id,
    v_total_cost,
    'BRL',
    'PENDING',
    'pix',
    'featured_listing',
    v_listing_id::text
  ) RETURNING id INTO v_payment_id;

  -- REGRA DE SEGURANÃ‡A: businesses.featured NÃƒO Ã© ativado aqui.
  -- Apenas a confirmaÃ§Ã£o do pagamento pode ativar o benefÃ­cio.

  RETURN jsonb_build_object(
    'listing_id', v_listing_id,
    'payment_id', v_payment_id,
    'business_id', p_business_id,
    'days', p_days,
    'daily_rate', v_daily_rate,
    'total_cost', v_total_cost,
    'status', 'PENDING'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) TO authenticated;

-- Substitui a antiga create_featured_listing para redirecionar para a versÃ£o segura initiate_featured_listing
CREATE OR REPLACE FUNCTION public.create_featured_listing(
  p_business_id UUID,
  p_days INT,
  p_offer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN public.initiate_featured_listing(p_business_id, p_days, p_offer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.create_featured_listing(UUID, INT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_featured_listing(UUID, INT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_featured_listing(UUID, INT, UUID) TO authenticated;


-- 4. RPC: CONFIRMAÃ‡ÃƒO DE DESTAQUE PATROCINADO (RESTRITA A ADMIN OU WEBHOOK)
CREATE OR REPLACE FUNCTION public.confirm_featured_listing(
  p_listing_id UUID,
  p_provider_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_duration_days INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ou webhooks autorizados podem ativar destaques.';
  END IF;

  SELECT * INTO v_listing
  FROM public.featured_listings
  WHERE id = p_listing_id;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Destaque patrocinado nÃ£o encontrado.';
  END IF;

  v_duration_days := GREATEST(1, v_listing.end_date - v_listing.start_date);

  -- 1. Ativa a listagem de destaque a partir da data atual
  UPDATE public.featured_listings
  SET active = true,
      start_date = CURRENT_DATE,
      end_date = CURRENT_DATE + (v_duration_days || ' days')::INTERVAL
  WHERE id = p_listing_id;

  -- 2. Transiciona pagamentos vinculados para COMPLETED
  UPDATE public.payments
  SET status = 'COMPLETED',
      updated_at = NOW()
  WHERE provider_payment_id = p_listing_id::text
    AND status = 'PENDING';

  -- 3. Ativa o benefÃ­cio na empresa
  UPDATE public.businesses
  SET featured = true,
      updated_at = NOW()
  WHERE id = v_listing.business_id;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'business_id', v_listing.business_id,
    'status', 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) TO authenticated;


-- 5. TRIGGER: TRANSIÃ‡ÃƒO AUTOMÃTICA DO ORÃ‡AMENTO QUANDO UMA PROPOSTA Ã‰ INSERIDA
CREATE OR REPLACE FUNCTION public.tg_quote_proposals_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.quote_requests
  SET status = 'propostas_recebidas', updated_at = NOW()
  WHERE id = NEW.quote_request_id AND status = 'aberto';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_proposal_inserted ON public.quote_proposals;
CREATE TRIGGER on_proposal_inserted
AFTER INSERT ON public.quote_proposals
FOR EACH ROW EXECUTE FUNCTION public.tg_quote_proposals_after_insert();


-- 6. TRIGGER: MÃQUINA DE ESTADOS DEFENSIVA EM QUOTE_REQUESTS
CREATE OR REPLACE FUNCTION public.tg_protect_quote_request_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- NÃ£o permitir reabrir um pedido que foi cancelado (exceto admin)
  IF OLD.status = 'cancelado' AND NEW.status != 'cancelado' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'NÃ£o Ã© permitido reabrir uma solicitaÃ§Ã£o de orÃ§amento cancelada.';
    END IF;
  END IF;

  -- NÃ£o permitir alterar um pedido que jÃ¡ foi finalizado (exceto admin)
  IF OLD.status = 'finalizado' AND NEW.status != 'finalizado' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'NÃ£o Ã© permitido alterar o status de uma solicitaÃ§Ã£o de orÃ§amento finalizada.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_protect_quote_request_status ON public.quote_requests;
CREATE TRIGGER trg_protect_quote_request_status
BEFORE UPDATE OF status ON public.quote_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_protect_quote_request_status_transitions();

-- 7. RECARREGAR CACHE DE SCHEMA NO POSTGREST
NOTIFY pgrst, 'reload schema';
-- ==============================================================================
-- EconomizaJa - Migracao 00028: Seguranca Extra do Destaque Patrocinado
-- Idempotente: pode ser executada multiplas vezes sem efeitos colaterais
-- ==============================================================================

-- 1. Trigger para validar que featured so pode ser true quando ha destaque ativo pago
CREATE OR REPLACE FUNCTION public.validate_featured_requires_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_has_active_paid_listing BOOLEAN;
BEGIN
  IF NEW.featured = OLD.featured OR NEW.featured = false THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_admin();
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.featured_listings fl
    JOIN public.payments p ON p.provider_payment_id = fl.id::text
    WHERE fl.business_id = NEW.id
      AND fl.active = true
      AND fl.end_date >= CURRENT_DATE
      AND p.status = 'CONFIRMED'
  ) INTO v_has_active_paid_listing;

  IF NOT v_has_active_paid_listing THEN
    RAISE EXCEPTION
      'SEGURANCA: businesses.featured so pode ser ativado mediante pagamento confirmado de destaque patrocinado.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_validate_featured_payment ON public.businesses;
CREATE TRIGGER trg_validate_featured_payment
  BEFORE UPDATE OF featured ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_featured_requires_payment();

-- 2. Audit log de destaques
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'featured_audit_log'
  ) THEN
    CREATE TABLE public.featured_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
      featured_listing_id UUID REFERENCES public.featured_listings(id) ON DELETE SET NULL,
      action TEXT NOT NULL CHECK (action IN ('ACTIVATED', 'DEACTIVATED', 'EXPIRED')),
      performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_featured_audit_business ON public.featured_audit_log(business_id);
    ALTER TABLE public.featured_audit_log ENABLE ROW LEVEL SECURITY;
    CREATE POLICY admin_read_featured_audit ON public.featured_audit_log
      FOR SELECT USING (public.is_admin());
    RAISE NOTICE 'Tabela featured_audit_log criada.';
  END IF;
END;
$$;

-- 3. Atualiza confirm_featured_listing para registrar audit e ser admin-only
CREATE OR REPLACE FUNCTION public.confirm_featured_listing(
  p_listing_id UUID,
  p_provider_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_payment_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem confirmar pagamentos de destaque patrocinado.';
  END IF;

  SELECT * INTO v_listing FROM public.featured_listings WHERE id = p_listing_id FOR UPDATE;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Destaque patrocinado nao encontrado: %', p_listing_id;
  END IF;

  IF v_listing.active = true THEN
    RAISE EXCEPTION 'Este destaque ja esta ativo.';
  END IF;

  UPDATE public.featured_listings SET active = true, updated_at = NOW() WHERE id = p_listing_id;
  UPDATE public.businesses SET featured = true, updated_at = NOW() WHERE id = v_listing.business_id;

  UPDATE public.payments
  SET status = 'CONFIRMED', provider_payment_id = COALESCE(p_provider_transaction_id, provider_payment_id), updated_at = NOW()
  WHERE provider_payment_id = p_listing_id::text AND status = 'PENDING'
  RETURNING id INTO v_payment_id;

  INSERT INTO public.featured_audit_log (business_id, featured_listing_id, action, performed_by, payment_id, notes)
  VALUES (v_listing.business_id, p_listing_id, 'ACTIVATED', auth.uid(), v_payment_id,
    COALESCE('Confirmado via ' || p_provider_transaction_id, 'Confirmado manualmente pelo administrador'));

  RETURN jsonb_build_object(
    'success', true, 'listing_id', p_listing_id,
    'business_id', v_listing.business_id, 'payment_id', v_payment_id,
    'active_until', v_listing.end_date,
    'message', 'Destaque ativado com sucesso apos confirmacao de pagamento.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) TO authenticated;

-- ==============================================================================
-- EconomizaJá — Migração 00029: Suporte a phone, neighborhood e avatar_url em profiles
-- ==============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

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

  BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, city, state, phone)
    VALUES (new.id, v_name, COALESCE(new.email, ''), v_role, v_city, v_state, v_phone)
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
      BEGIN
        INSERT INTO public.profiles (id, full_name, email, role, city, state)
        VALUES (new.id, v_name, COALESCE(new.email, ''), v_role, v_city, v_state)
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

-- ==============================================================================
-- EconomizaJá - Migração 00032: Correção de updated_at em featured_listings,
-- prevenção de destaques duplicados e visibilidade total de orçamentos regionais
-- Idempotente: pode ser executada com total segurança
-- ==============================================================================

-- 1. ADICIONAR COLUNA updated_at EM featured_listings SE NÃO EXISTIR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'featured_listings' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.featured_listings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Coluna updated_at adicionada com sucesso em featured_listings.';
  END IF;
END;
$$;

-- 2. RECRIAR confirm_featured_listing COM TRATAMENTO SEGURO DE updated_at E DEDUPLICAÇÃO
CREATE OR REPLACE FUNCTION public.confirm_featured_listing(
  p_listing_id UUID,
  p_provider_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_payment_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem confirmar pagamentos de destaque patrocinado.';
  END IF;

  SELECT * INTO v_listing FROM public.featured_listings WHERE id = p_listing_id FOR UPDATE;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Destaque patrocinado não encontrado: %', p_listing_id;
  END IF;

  -- Atualiza o destaque patrocinado (active = true)
  UPDATE public.featured_listings 
  SET active = true 
  WHERE id = p_listing_id;

  -- Atualiza updated_at de forma segura
  BEGIN
    UPDATE public.featured_listings SET updated_at = NOW() WHERE id = p_listing_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Ativa o destaque na empresa vinculada
  UPDATE public.businesses 
  SET featured = true 
  WHERE id = v_listing.business_id;

  BEGIN
    UPDATE public.businesses SET updated_at = NOW() WHERE id = v_listing.business_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Atualiza o pagamento correspondente, se houver
  UPDATE public.payments
  SET status = 'CONFIRMED', provider_payment_id = COALESCE(p_provider_transaction_id, provider_payment_id)
  WHERE provider_payment_id = p_listing_id::text AND status = 'PENDING'
  RETURNING id INTO v_payment_id;

  -- Remove quaisquer outras solicitações pendentes duplicadas da mesma empresa
  DELETE FROM public.featured_listings 
  WHERE business_id = v_listing.business_id 
    AND active = false 
    AND id != p_listing_id;

  -- Registra na tabela de auditoria se ela existir
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'featured_audit_log') THEN
    INSERT INTO public.featured_audit_log (business_id, featured_listing_id, action, performed_by, payment_id, notes)
    VALUES (v_listing.business_id, p_listing_id, 'ACTIVATED', auth.uid(), v_payment_id,
      COALESCE(p_provider_transaction_id, 'Confirmado manualmente pelo administrador'));
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'listing_id', p_listing_id,
    'business_id', v_listing.business_id, 
    'payment_id', v_payment_id,
    'active_until', v_listing.end_date,
    'message', 'Destaque patrocinado ativado com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) TO authenticated;

-- 3. RECRIAR initiate_featured_listing EVITANDO DUPLICAÇÃO DE SOLICITAÇÕES PENDENTES
CREATE OR REPLACE FUNCTION public.initiate_featured_listing(
  p_business_id UUID,
  p_days INT,
  p_offer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_biz_owner UUID;
  v_daily_rate NUMERIC(10, 2) := 19.90;
  v_settings_val JSONB;
  v_total_cost NUMERIC(10, 2);
  v_listing_id UUID;
  v_payment_id UUID;
  v_existing_pending RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para contratar destaque.';
  END IF;

  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa pode solicitar destaque.';
  END IF;

  IF p_days < 1 THEN
    RAISE EXCEPTION 'Período mínimo de destaque é de 1 dia.';
  END IF;

  BEGIN
    SELECT value INTO v_settings_val FROM public.app_settings WHERE key = 'monetization';
    v_daily_rate := COALESCE((v_settings_val->>'featuredDailyRate')::NUMERIC(10, 2), 19.90);
  EXCEPTION WHEN OTHERS THEN
    v_daily_rate := 19.90;
  END;

  v_total_cost := v_daily_rate * p_days;

  -- Verifica se já existe destaque pendente (active = false) para esta empresa
  SELECT * INTO v_existing_pending 
  FROM public.featured_listings 
  WHERE business_id = p_business_id AND active = false 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_existing_pending.id IS NOT NULL THEN
    -- Reutiliza a solicitação pendente existente evitando duplicata
    UPDATE public.featured_listings
    SET start_date = CURRENT_DATE,
        end_date = CURRENT_DATE + (p_days || ' days')::INTERVAL,
        offer_id = p_offer_id,
        daily_cost = v_daily_rate
    WHERE id = v_existing_pending.id;

    v_listing_id := v_existing_pending.id;

    UPDATE public.payments
    SET amount = v_total_cost
    WHERE provider_payment_id = v_listing_id::text AND status = 'PENDING';
  ELSE
    INSERT INTO public.featured_listings (
      business_id,
      offer_id,
      start_date,
      end_date,
      active,
      daily_cost
    ) VALUES (
      p_business_id,
      p_offer_id,
      CURRENT_DATE,
      CURRENT_DATE + (p_days || ' days')::INTERVAL,
      false,
      v_daily_rate
    ) RETURNING id INTO v_listing_id;

    INSERT INTO public.payments (
      user_id,
      business_id,
      amount,
      currency,
      status,
      payment_method,
      purpose,
      provider_payment_id
    ) VALUES (
      auth.uid(),
      p_business_id,
      v_total_cost,
      'BRL',
      'PENDING',
      'PIX',
      'FEATURED_LISTING',
      v_listing_id::text
    ) RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'business_id', p_business_id,
    'days', p_days,
    'daily_rate', v_daily_rate,
    'total_cost', v_total_cost,
    'status', 'PENDING',
    'message', 'Solicitação de destaque registrada. Aguardando confirmação do pagamento.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.initiate_featured_listing(UUID, INT, UUID) TO authenticated;

-- 4. ATUALIZAR RLS DE quote_requests PARA PERMITIR VISIBILIDADE REGIONAL DE ORÇAMENTOS GERAIS
DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
DROP POLICY IF EXISTS "Users can read quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Quote requests select policy" ON public.quote_requests;

CREATE POLICY "quote_requests_select" 
  ON public.quote_requests FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    OR public.is_admin() 
    -- Orçamento direcionado para uma empresa do usuário
    OR (
      target_business_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = quote_requests.target_business_id
          AND b.owner_id = auth.uid()
      )
    )
    -- Empresa do usuário já enviou proposta comercial para este orçamento
    OR EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      JOIN public.businesses b ON b.id = qp.business_id
      WHERE qp.quote_request_id = quote_requests.id
        AND b.owner_id = auth.uid()
    )
    -- Marketplace geral aberto para parceiros e empresas cadastradas da plataforma
    OR (
      target_business_id IS NULL
      AND quote_requests.status IN ('aberto', 'propostas_recebidas')
      AND (
        EXISTS (
          SELECT 1 FROM public.businesses b WHERE b.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('business', 'admin')
        )
      )
    )
  );

-- 5. VIEW SEGURA PARA OPORTUNIDADES GERAIS
CREATE OR REPLACE VIEW public.secure_leads_view AS
SELECT 
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    WHEN qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = qr.target_business_id AND b.owner_id = auth.uid()
    ) THEN qr.user_name
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    WHEN public.is_admin() THEN qr.user_phone
    WHEN qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = qr.target_business_id AND b.owner_id = auth.uid()
    ) THEN qr.user_phone
    ELSE '****-****'
  END AS user_phone,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_email
    WHEN public.is_admin() THEN qr.user_email
    WHEN qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = qr.target_business_id AND b.owner_id = auth.uid()
    ) THEN qr.user_email
    ELSE 'oculto@privado.com'
  END AS user_email,
  qr.city,
  qr.state,
  qr.neighborhood,
  qr.category_id,
  qr.subcategory,
  qr.title,
  qr.description,
  qr.desired_deadline,
  qr.budget_range,
  qr.photos,
  qr.status,
  qr.created_at,
  qr.created_at AS updated_at
FROM public.quote_requests qr
WHERE 
  auth.uid() = qr.user_id 
  OR public.is_admin()
  OR (
    qr.target_business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b 
      WHERE b.id = qr.target_business_id 
        AND b.owner_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.quote_proposals qp
    JOIN public.businesses b ON b.id = qp.business_id
    WHERE qp.quote_request_id = qr.id
      AND b.owner_id = auth.uid()
  )
  OR (
    qr.target_business_id IS NULL
    AND qr.status IN ('aberto', 'propostas_recebidas')
    AND (
      EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('business', 'admin'))
    )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated, anon;

NOTIFY pgrst, 'reload schema';



-- ==============================================================================
-- INTEGRAÇÃO DAS MIGRAÇÕES 00033 E 00034: FIX RLS E STATUS
-- ==============================================================================

-- ==============================================================================
-- EconomizaJá — Migração 00033: Correção de Recursão RLS em quote_requests
-- e Violação de Constraint payments_status_check
-- Idempotente: pode ser executada com total segurança quantas vezes for necessário
-- ==============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 1: FUNÇÕES SECURITY DEFINER PARA QUEBRAR RECURSÃO RLS              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 1.1 Função que retorna os IDs de todas as empresas de um usuário
-- Usa SECURITY DEFINER para BYPASSAR o RLS de businesses, quebrando o ciclo
CREATE OR REPLACE FUNCTION public.get_user_business_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM public.businesses WHERE owner_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_user_business_ids(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_business_ids(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_business_ids(UUID) TO authenticated;

-- 1.2 Função que verifica se um usuário é dono de uma empresa específica
-- Também SECURITY DEFINER — evita que a checagem passe pelo RLS de businesses
CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND owner_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) TO authenticated;

-- 1.3 Função que verifica se o usuário possui alguma empresa ativa
-- Usada para visibilidade do marketplace geral de orçamentos
CREATE OR REPLACE FUNCTION public.user_has_active_business(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE owner_id = p_user_id AND (active IS NULL OR active = true)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.user_has_active_business(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_active_business(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_active_business(UUID) TO authenticated;

-- 1.4 Função que verifica se o usuário possui empresa com categoria e localização compatíveis
-- Para matching regional de orçamentos gerais (sem target_business_id)
CREATE OR REPLACE FUNCTION public.user_has_matching_business(
  p_user_id UUID,
  p_category_id TEXT,
  p_city TEXT
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE owner_id = p_user_id
      AND (active IS NULL OR active = true)
      AND (category_id = p_category_id OR p_category_id IS NULL)
      AND (
        p_city IS NULL
        OR city IS NULL
        OR LOWER(city) = LOWER(p_city)
        OR LOWER(city) LIKE '%' || LOWER(p_city) || '%'
        OR LOWER(p_city) LIKE '%' || LOWER(city) || '%'
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.user_has_matching_business(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_matching_business(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_matching_business(UUID, TEXT, TEXT) TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 2: REESCREVER POLÍTICA RLS DE quote_requests SEM RECURSÃO          ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 2.1 Remover todas as políticas SELECT antigas
DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
DROP POLICY IF EXISTS "Users can read quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Quote requests select policy" ON public.quote_requests;
DROP POLICY IF EXISTS "Customers can view their own quotes" ON public.quote_requests;

-- 2.2 Criar nova política SELECT usando funções SECURITY DEFINER (sem recursão)
CREATE POLICY "quote_requests_select"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (
    -- Regra 1: O próprio solicitante do orçamento
    user_id = auth.uid()

    -- Regra 2: Administradores do sistema
    OR public.is_admin()

    -- Regra 3: Orçamento DIRECIONADO para uma empresa do usuário
    OR (
      target_business_id IS NOT NULL
      AND public.is_business_owner(target_business_id, auth.uid())
    )

    -- Regra 4: Empresa do usuário já enviou proposta para este orçamento
    -- Usa subquery apenas em quote_proposals (sem JOIN em businesses via RLS)
    OR EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      WHERE qp.quote_request_id = quote_requests.id
        AND qp.business_id IN (SELECT public.get_user_business_ids(auth.uid()))
    )

    -- Regra 5: Marketplace geral — orçamentos abertos visíveis para parceiros
    OR (
      target_business_id IS NULL
      AND quote_requests.status IN ('aberto', 'propostas_recebidas')
      AND (
        public.user_has_active_business(auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('business', 'admin')
      )
    )
  );

-- 2.3 Garantir que INSERT, UPDATE e DELETE não tenham recursão
DROP POLICY IF EXISTS "quote_requests_insert" ON public.quote_requests;
CREATE POLICY "quote_requests_insert"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "quote_requests_update" ON public.quote_requests;
CREATE POLICY "quote_requests_update"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "quote_requests_delete" ON public.quote_requests;
CREATE POLICY "quote_requests_delete"
  ON public.quote_requests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 2.4 Garantir permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 3: REESCREVER POLÍTICAS DE quote_proposals SEM RECURSÃO            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "quote_proposals_select" ON public.quote_proposals;
DROP POLICY IF EXISTS "Proposals viewable by requester and proposing business" ON public.quote_proposals;

CREATE POLICY "quote_proposals_select"
  ON public.quote_proposals FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    -- Empresa que enviou a proposta pertence ao usuário
    OR public.is_business_owner(business_id, auth.uid())
    -- O solicitante do orçamento pode ver as propostas recebidas
    OR EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "quote_proposals_insert" ON public.quote_proposals;
DROP POLICY IF EXISTS "Businesses can submit proposals" ON public.quote_proposals;

CREATE POLICY "quote_proposals_insert"
  ON public.quote_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_business_owner(business_id, auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "quote_proposals_update" ON public.quote_proposals;
DROP POLICY IF EXISTS "Requester or proposer can update proposal" ON public.quote_proposals;

CREATE POLICY "quote_proposals_update"
  ON public.quote_proposals FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_business_owner(business_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "quote_proposals_delete" ON public.quote_proposals;
DROP POLICY IF EXISTS "Requester or proposer or admin can delete proposal" ON public.quote_proposals;
DROP POLICY IF EXISTS "Admins or proposing business can delete proposal" ON public.quote_proposals;

CREATE POLICY "quote_proposals_delete"
  ON public.quote_proposals FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_business_owner(business_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    )
  );


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 4: REESCREVER secure_leads_view SEM RECURSÃO                       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP VIEW IF EXISTS public.secure_leads_view;

CREATE VIEW public.secure_leads_view AS
SELECT
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_name
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    WHEN public.is_admin() THEN qr.user_phone
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_phone
    ELSE '****-****'
  END AS user_phone,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_email
    WHEN public.is_admin() THEN qr.user_email
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_email
    ELSE 'oculto@privado.com'
  END AS user_email,
  qr.city,
  qr.state,
  qr.neighborhood,
  qr.category_id,
  qr.subcategory,
  qr.title,
  qr.description,
  qr.desired_deadline,
  qr.budget_range,
  qr.photos,
  qr.status,
  qr.created_at,
  qr.created_at AS updated_at
FROM public.quote_requests qr
WHERE
  auth.uid() = qr.user_id
  OR public.is_admin()
  -- Empresa dona do target_business_id
  OR (
    qr.target_business_id IS NOT NULL
    AND public.is_business_owner(qr.target_business_id, auth.uid())
  )
  -- Empresa do usuário já enviou proposta
  OR EXISTS (
    SELECT 1 FROM public.quote_proposals qp
    WHERE qp.quote_request_id = qr.id
      AND qp.business_id IN (SELECT public.get_user_business_ids(auth.uid()))
  )
  -- Marketplace geral aberto
  OR (
    qr.target_business_id IS NULL
    AND qr.status IN ('aberto', 'propostas_recebidas')
    AND (
      public.user_has_active_business(auth.uid())
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('business', 'admin')
    )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated, anon;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 5: CORRIGIR STATUS 'CONFIRMED' → 'COMPLETED' NA RPC                ║
-- ║  confirm_featured_listing (resolve payments_status_check)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.confirm_featured_listing(
  p_listing_id UUID,
  p_provider_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_payment_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem confirmar pagamentos de destaque patrocinado.';
  END IF;

  SELECT * INTO v_listing FROM public.featured_listings WHERE id = p_listing_id FOR UPDATE;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Destaque patrocinado não encontrado: %', p_listing_id;
  END IF;

  -- Atualiza o destaque patrocinado (active = true)
  UPDATE public.featured_listings
  SET active = true
  WHERE id = p_listing_id;

  -- Atualiza updated_at de forma segura (coluna pode não existir em schemas antigos)
  BEGIN
    UPDATE public.featured_listings SET updated_at = NOW() WHERE id = p_listing_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Ativa o destaque na empresa vinculada
  UPDATE public.businesses
  SET featured = true
  WHERE id = v_listing.business_id;

  BEGIN
    UPDATE public.businesses SET updated_at = NOW() WHERE id = v_listing.business_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- ╔════════════════════════════════════════════════════════════════╗
  -- ║  CORREÇÃO CRÍTICA: 'COMPLETED' em vez de 'CONFIRMED'        ║
  -- ║  A constraint payments_status_check aceita apenas:           ║
  -- ║  'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'               ║
  -- ╚════════════════════════════════════════════════════════════════╝
  UPDATE public.payments
  SET status = 'COMPLETED',
      provider_payment_id = COALESCE(p_provider_transaction_id, provider_payment_id)
  WHERE provider_payment_id = p_listing_id::text AND status = 'PENDING'
  RETURNING id INTO v_payment_id;

  -- Remove quaisquer outras solicitações pendentes duplicadas da mesma empresa
  DELETE FROM public.featured_listings
  WHERE business_id = v_listing.business_id
    AND active = false
    AND id != p_listing_id;

  -- Registra na tabela de auditoria se ela existir
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'featured_audit_log') THEN
    INSERT INTO public.featured_audit_log (business_id, featured_listing_id, action, performed_by, payment_id, notes)
    VALUES (v_listing.business_id, p_listing_id, 'ACTIVATED', auth.uid(), v_payment_id,
      COALESCE(p_provider_transaction_id, 'Confirmado manualmente pelo administrador'));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'business_id', v_listing.business_id,
    'payment_id', v_payment_id,
    'active_until', v_listing.end_date,
    'message', 'Destaque patrocinado ativado com sucesso.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 6: LIMPEZA — Corrigir registros existentes com status inválido     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Atualiza quaisquer payments que tenham ficado com status 'CONFIRMED' (inválido)
UPDATE public.payments
SET status = 'COMPLETED'
WHERE status = 'CONFIRMED';


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 7: CORRIGIR TRIGGER validate_featured_requires_payment             ║
-- ║  O trigger checa p.status = 'CONFIRMED', mas agora o status correto       ║
-- ║  é 'COMPLETED'. Sem essa correção, o trigger bloquearia destaques.        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.validate_featured_requires_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_has_active_paid_listing BOOLEAN;
BEGIN
  -- Se não está ativando featured, permite livremente
  IF NEW.featured IS NOT DISTINCT FROM OLD.featured THEN
    RETURN NEW;
  END IF;

  -- Se está desativando, permite
  IF NEW.featured = false THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_admin();
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Verifica se existe destaque ativo E pagamento COMPLETED (não mais CONFIRMED)
  SELECT EXISTS (
    SELECT 1 FROM public.featured_listings fl
    JOIN public.payments p ON p.provider_payment_id = fl.id::text
    WHERE fl.business_id = NEW.id
      AND fl.active = true
      AND fl.end_date >= CURRENT_DATE
      AND p.status = 'COMPLETED'
  ) INTO v_has_active_paid_listing;

  IF NOT v_has_active_paid_listing THEN
    RAISE EXCEPTION
      'SEGURANCA: businesses.featured so pode ser ativado mediante pagamento confirmado de destaque patrocinado.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, auth;

-- O trigger já existe (criado na migração 00028), apenas recriamos a função acima


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  FINALIZAÇÃO                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

NOTIFY pgrst, 'reload schema';


-- ==============================================================================
-- EconomizaJá — Migração 00034: Correção Final de Recursão RLS (Ciclo Proposals x Requests)
-- ==============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 1: FUNÇÕES SECURITY DEFINER PARA BYPASS DE RLS MÚTUO               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 1. Verifica se a empresa do usuário logado já enviou proposta para um orçamento
-- (Bypassa RLS de quote_proposals para evitar ciclo com quote_requests)
CREATE OR REPLACE FUNCTION public.has_user_proposed(p_quote_request_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_proposals qp
    JOIN public.businesses b ON b.id = qp.business_id
    WHERE qp.quote_request_id = p_quote_request_id
      AND b.owner_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_user_proposed(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_user_proposed(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_user_proposed(UUID, UUID) TO authenticated;

-- 2. Verifica se o usuário é o dono (solicitante) do orçamento original
-- (Bypassa RLS de quote_requests para evitar ciclo com quote_proposals)
CREATE OR REPLACE FUNCTION public.is_quote_requester(p_quote_request_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_requests qr
    WHERE qr.id = p_quote_request_id
      AND qr.user_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_quote_requester(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_quote_requester(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_quote_requester(UUID, UUID) TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 2: ATUALIZAR POLÍTICAS DE quote_requests                           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "quote_requests_select" ON public.quote_requests;
CREATE POLICY "quote_requests_select"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (
    -- Regra 1: O próprio solicitante do orçamento
    user_id = auth.uid()
    -- Regra 2: Administradores do sistema
    OR public.is_admin()
    -- Regra 3: Orçamento DIRECIONADO para uma empresa do usuário
    OR (
      target_business_id IS NOT NULL
      AND public.is_business_owner(target_business_id, auth.uid())
    )
    -- Regra 4: Empresa do usuário já enviou proposta para este orçamento
    -- (USANDO A NOVA FUNÇÃO SECURITY DEFINER)
    OR public.has_user_proposed(id, auth.uid())
    -- Regra 5: Marketplace geral
    OR (
      target_business_id IS NULL
      AND quote_requests.status IN ('aberto', 'propostas_recebidas')
      AND (
        public.user_has_active_business(auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('business', 'admin')
      )
    )
  );

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 3: ATUALIZAR POLÍTICAS DE quote_proposals                          ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "quote_proposals_select" ON public.quote_proposals;
CREATE POLICY "quote_proposals_select"
  ON public.quote_proposals FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    -- Empresa que enviou a proposta pertence ao usuário
    OR public.is_business_owner(business_id, auth.uid())
    -- O solicitante do orçamento pode ver as propostas recebidas
    -- (USANDO A NOVA FUNÇÃO SECURITY DEFINER)
    OR public.is_quote_requester(quote_request_id, auth.uid())
  );

DROP POLICY IF EXISTS "quote_proposals_update" ON public.quote_proposals;
CREATE POLICY "quote_proposals_update"
  ON public.quote_proposals FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_business_owner(business_id, auth.uid())
    -- (USANDO A NOVA FUNÇÃO SECURITY DEFINER)
    OR public.is_quote_requester(quote_request_id, auth.uid())
  );

DROP POLICY IF EXISTS "quote_proposals_delete" ON public.quote_proposals;
CREATE POLICY "quote_proposals_delete"
  ON public.quote_proposals FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_business_owner(business_id, auth.uid())
    -- (USANDO A NOVA FUNÇÃO SECURITY DEFINER)
    OR public.is_quote_requester(quote_request_id, auth.uid())
  );

-- Recarregar cache de schema
NOTIFY pgrst, 'reload schema';


-- ==============================================================================
-- EconomizaJá — Migração 00035: Notificações Automáticas e WhatsApp pós-Aceite
-- ==============================================================================

DROP VIEW IF EXISTS public.secure_leads_view;

CREATE VIEW public.secure_leads_view AS
SELECT
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_name
    WHEN EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      WHERE qp.quote_request_id = qr.id
        AND qp.status = 'escolhida'
        AND public.is_business_owner(qp.business_id, auth.uid())
    ) THEN qr.user_name
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    WHEN public.is_admin() THEN qr.user_phone
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_phone
    WHEN EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      WHERE qp.quote_request_id = qr.id
        AND qp.status = 'escolhida'
        AND public.is_business_owner(qp.business_id, auth.uid())
    ) THEN qr.user_phone
    ELSE '****-****'
  END AS user_phone,
  CASE
    WHEN auth.uid() = qr.user_id THEN qr.user_email
    WHEN public.is_admin() THEN qr.user_email
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_email
    WHEN EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      WHERE qp.quote_request_id = qr.id
        AND qp.status = 'escolhida'
        AND public.is_business_owner(qp.business_id, auth.uid())
    ) THEN qr.user_email
    ELSE 'oculto@privado.com'
  END AS user_email,
  qr.city,
  qr.state,
  qr.neighborhood,
  qr.category_id,
  qr.subcategory,
  qr.title,
  qr.description,
  qr.desired_deadline,
  qr.budget_range,
  qr.photos,
  qr.status,
  qr.created_at,
  qr.created_at AS updated_at
FROM public.quote_requests qr
WHERE
  auth.uid() = qr.user_id
  OR public.is_admin()
  OR (
    qr.target_business_id IS NOT NULL
    AND public.is_business_owner(qr.target_business_id, auth.uid())
  )
  OR public.has_user_proposed(qr.id, auth.uid())
  OR (
    qr.target_business_id IS NULL
    AND qr.status IN ('aberto', 'propostas_recebidas')
    AND (
      public.user_has_active_business(auth.uid())
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('business', 'admin')
    )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_business(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_user_proposed(UUID, UUID) TO anon, authenticated;

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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications(user_id, created_at DESC);

-- Triggers de Notificações
CREATE OR REPLACE FUNCTION public.fn_notify_on_quote_request()
RETURNS TRIGGER AS $$
DECLARE
  v_biz_owner UUID;
  v_biz_name TEXT;
BEGIN
  IF NEW.target_business_id IS NOT NULL THEN
    SELECT owner_id, name INTO v_biz_owner, v_biz_name
    FROM public.businesses
    WHERE id = NEW.target_business_id;

    IF v_biz_owner IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        read,
        link_action
      ) VALUES (
        v_biz_owner,
        '📋 Novo Orçamento Direcionado!',
        'Um cliente solicitou um orçamento exclusivo para sua empresa: "' || NEW.title || '" em ' || COALESCE(NEW.neighborhood, NEW.city) || '.',
        'quote_directed',
        false,
        'business_portal'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_quote_request ON public.quote_requests;
CREATE TRIGGER tr_notify_quote_request
  AFTER INSERT ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_quote_request();

CREATE OR REPLACE FUNCTION public.fn_notify_on_proposal_submitted()
RETURNS TRIGGER AS $$
DECLARE
  v_quote RECORD;
  v_biz_name TEXT;
BEGIN
  SELECT user_id, title INTO v_quote
  FROM public.quote_requests
  WHERE id = NEW.quote_request_id;

  SELECT name INTO v_biz_name
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF v_quote.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      read,
      link_action
    ) VALUES (
      v_quote.user_id,
      '💼 Nova Proposta Recebida!',
      'A empresa "' || COALESCE(v_biz_name, 'Parceira') || '" enviou uma proposta de R$ ' || TO_CHAR(NEW.price, 'FM999G999G990D00') || ' para o seu pedido "' || v_quote.title || '".',
      'proposal_received',
      false,
      'quotes'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_proposal_submitted ON public.quote_proposals;
CREATE TRIGGER tr_notify_proposal_submitted
  AFTER INSERT ON public.quote_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_proposal_submitted();

CREATE OR REPLACE FUNCTION public.fn_notify_on_proposal_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_quote RECORD;
  v_biz RECORD;
BEGIN
  IF NEW.status = 'escolhida' AND (OLD.status IS NULL OR OLD.status != 'escolhida') THEN
    SELECT user_id, title INTO v_quote
    FROM public.quote_requests
    WHERE id = NEW.quote_request_id;

    SELECT owner_id, name INTO v_biz
    FROM public.businesses
    WHERE id = NEW.business_id;

    IF v_biz.owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        read,
        link_action
      ) VALUES (
        v_biz.owner_id,
        '🎉 Parabéns! Sua Proposta foi Escolhida!',
        'O cliente aceitou sua proposta de R$ ' || TO_CHAR(NEW.price, 'FM999G999G990D00') || ' para o orçamento "' || v_quote.title || '". O WhatsApp do cliente já está liberado para agendamento!',
        'proposal_accepted',
        false,
        'business_portal'
      );
    END IF;

    IF v_quote.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        read,
        link_action
      ) VALUES (
        v_quote.user_id,
        '🎉 Contratação Confirmada!',
        'Você escolheu a proposta de "' || COALESCE(v_biz.name, 'Empresa Parceira') || '". O contato via WhatsApp está disponível para combinar o atendimento.',
        'proposal_chosen',
        false,
        'quotes'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_proposal_accepted ON public.quote_proposals;
CREATE TRIGGER tr_notify_proposal_accepted
  AFTER UPDATE OF status ON public.quote_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_proposal_accepted();

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE id = p_notification_id
    AND (user_id = auth.uid() OR public.is_admin());
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE user_id = auth.uid();
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- EconomizaJá — Migração 00037: Saldo de Créditos de Leads para Parceiros & RPC
-- ==============================================================================

-- 1. ADICIONA COLUNA lead_credits NA TABELA businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS lead_credits INTEGER NOT NULL DEFAULT 0;

-- Adiciona verificação de integridade (não pode ser negativo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_lead_credits_non_negative'
  ) THEN
    ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_lead_credits_non_negative CHECK (lead_credits >= 0);
  END IF;
END $$;

-- 2. RPC: ADICIONAR / CREDITAR LEADS PARA EMPRESA (ADMIN OU SISTEMA DE PAGAMENTO)
CREATE OR REPLACE FUNCTION public.add_lead_credits(
  p_business_id UUID,
  p_credits INT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_biz RECORD;
  v_new_credits INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para executar esta ação.';
  END IF;

  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'A quantidade de créditos a adicionar deve ser maior que zero.';
  END IF;

  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  -- Apenas administradores ou o próprio proprietário da empresa podem adicionar
  IF NOT public.is_admin() AND v_biz.owner_id != v_user_id THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ou proprietários podem alterar os créditos desta empresa.';
  END IF;

  UPDATE public.businesses
  SET lead_credits = COALESCE(lead_credits, 0) + p_credits,
      updated_at = NOW()
  WHERE id = p_business_id
  RETURNING lead_credits INTO v_new_credits;

  -- Registro de auditoria administrativa se for admin
  IF public.is_admin() THEN
    INSERT INTO public.admin_action_logs (
      performed_by,
      action,
      entity_type,
      entity_id,
      entity_name,
      notes
    ) VALUES (
      v_user_id,
      'CREDITOS_LEAD_ADICIONADOS',
      'business',
      p_business_id,
      v_biz.name,
      COALESCE(p_notes, format('+%s créditos de leads adicionados', p_credits))
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'credits_added', p_credits,
    'total_lead_credits', v_new_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.add_lead_credits(UUID, INT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_lead_credits(UUID, INT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_lead_credits(UUID, INT, TEXT) TO authenticated;

-- 3. RPC: SUBMISSÃO ATÔMICA DE PROPOSTA COM CONTROLE DE LIMITES E SALDO DE LEADS
CREATE OR REPLACE FUNCTION public.submit_quote_proposal(
  p_quote_request_id UUID,
  p_business_id UUID,
  p_price NUMERIC,
  p_deadline_text TEXT,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_biz RECORD;
  v_quote RECORD;
  v_proposal_id UUID;
  v_existing_proposal_id UUID;
  v_monthly_count INT;
  v_credit_deducted BOOLEAN := FALSE;
  v_remaining_credits INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para submeter uma proposta.';
  END IF;

  -- Valida a empresa e proprietário
  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa prestadora não encontrada.';
  END IF;

  IF v_biz.owner_id != v_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Você só pode enviar propostas através de empresas das quais é proprietário.';
  END IF;

  -- Valida o orçamento com lock
  SELECT * INTO v_quote
  FROM public.quote_requests
  WHERE id = p_quote_request_id
  FOR UPDATE;

  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado.';
  END IF;

  IF v_quote.status = 'cancelado' THEN
    RAISE EXCEPTION 'Este pedido de orçamento foi encerrado pelo cliente e não recebe mais propostas.';
  END IF;

  IF v_quote.status IN ('escolhido', 'finalizado') THEN
    RAISE EXCEPTION 'Este orçamento já foi definido com outro parceiro comercial.';
  END IF;

  -- Orçamento direcionado a outra empresa específica
  IF v_quote.target_business_id IS NOT NULL AND v_quote.target_business_id != p_business_id THEN
    RAISE EXCEPTION 'Este orçamento é exclusivo e foi direcionado a outro parceiro.';
  END IF;

  -- Verifica se já existe proposta desta empresa para este orçamento
  SELECT id INTO v_existing_proposal_id
  FROM public.quote_proposals
  WHERE quote_request_id = p_quote_request_id
    AND business_id = p_business_id;

  -- Limite de propostas do plano gratuito (3 propostas gratuitas / mês)
  -- Se for uma proposta NOVA (não atualização de proposta já enviada):
  IF v_existing_proposal_id IS NULL AND COALESCE(v_biz.plan_tier, 'gratis') = 'gratis' AND NOT public.is_admin() THEN
    SELECT COUNT(*) INTO v_monthly_count
    FROM public.quote_proposals
    WHERE business_id = p_business_id
      AND created_at >= date_trunc('month', NOW());

    -- Se já atingiu 3 propostas gratuitas neste mês
    IF v_monthly_count >= 3 THEN
      -- Verifica se possui créditos de leads disponíveis
      IF COALESCE(v_biz.lead_credits, 0) > 0 THEN
        UPDATE public.businesses
        SET lead_credits = lead_credits - 1,
            updated_at = NOW()
        WHERE id = p_business_id
        RETURNING lead_credits INTO v_remaining_credits;

        v_credit_deducted := TRUE;
      ELSE
        RAISE EXCEPTION 'Limite de 3 propostas gratuitas mensais atingido. Adquira saldo de leads avulso ou faça upgrade para o Plano Pró para continuar respondendo.';
      END IF;
    END IF;
  END IF;

  -- Insere ou atualiza a proposta
  INSERT INTO public.quote_proposals (
    quote_request_id,
    business_id,
    price,
    deadline_text,
    description,
    status
  ) VALUES (
    p_quote_request_id,
    p_business_id,
    p_price,
    p_deadline_text,
    p_description,
    'pendente'
  )
  ON CONFLICT (quote_request_id, business_id) DO UPDATE
  SET price = EXCLUDED.price,
      deadline_text = EXCLUDED.deadline_text,
      description = EXCLUDED.description,
      updated_at = NOW()
  RETURNING id INTO v_proposal_id;

  -- Transiciona o orçamento para 'propostas_recebidas' se ainda estiver 'aberto'
  IF v_quote.status = 'aberto' THEN
    UPDATE public.quote_requests
    SET status = 'propostas_recebidas', updated_at = NOW()
    WHERE id = p_quote_request_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'proposal_id', v_proposal_id,
    'quote_request_id', p_quote_request_id,
    'business_id', p_business_id,
    'credit_deducted', v_credit_deducted,
    'remaining_lead_credits', COALESCE(v_remaining_credits, v_biz.lead_credits),
    'status', 'pendente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;

-- ==============================================================================
-- MIGRAÇÃO 00038: GOOGLE PLAY BILLING, ATIVAÇÃO MANUAL COM AUDITORIA E UGC MODERAÇÃO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.initiate_plan_subscription(
  p_business_id UUID,
  p_plan_tier TEXT,
  p_billing_provider TEXT DEFAULT 'google_play_billing'
)
RETURNS JSONB AS $$
DECLARE
  v_biz RECORD;
  v_sub_id UUID;
  v_amount NUMERIC(10, 2);
  v_existing_sub RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  IF v_biz.owner_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão para alterar assinatura desta empresa.';
  END IF;

  IF p_plan_tier NOT IN ('pro', 'premium') THEN
    RAISE EXCEPTION 'Plano inválido para contratação: %', p_plan_tier;
  END IF;

  v_amount := CASE WHEN p_plan_tier = 'pro' THEN 79.90 ELSE 159.90 END;

  SELECT * INTO v_existing_sub
  FROM public.subscriptions
  WHERE business_id = p_business_id
    AND plan_tier = p_plan_tier
    AND status = 'PENDING'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_sub.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'subscription_id', v_existing_sub.id,
      'status', 'PENDING',
      'amount', v_amount,
      'plan_tier', p_plan_tier,
      'billing_provider', p_billing_provider,
      'reused', true
    );
  END IF;

  INSERT INTO public.subscriptions (
    business_id,
    plan_tier,
    status,
    billing_provider,
    current_period_start,
    current_period_end
  ) VALUES (
    p_business_id,
    p_plan_tier,
    'PENDING',
    p_billing_provider,
    NOW(),
    NOW() + INTERVAL '30 days'
  ) RETURNING id INTO v_sub_id;

  INSERT INTO public.payments (
    user_id,
    business_id,
    amount,
    currency,
    status,
    payment_method,
    purpose,
    provider_payment_id
  ) VALUES (
    auth.uid(),
    p_business_id,
    v_amount,
    'BRL',
    'PENDING',
    p_billing_provider,
    'subscription_' || p_plan_tier,
    v_sub_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'status', 'PENDING',
    'amount', v_amount,
    'plan_tier', p_plan_tier,
    'billing_provider', p_billing_provider
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.initiate_plan_subscription(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_google_play_purchase(
  p_business_id UUID,
  p_product_id TEXT,
  p_purchase_token TEXT,
  p_order_id TEXT DEFAULT NULL,
  p_purchase_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_biz RECORD;
  v_plan_tier TEXT;
  v_sub_id UUID;
  v_existing_token_sub RECORD;
  v_amount NUMERIC(10, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF p_purchase_token IS NULL OR trim(p_purchase_token) = '' THEN
    RAISE EXCEPTION 'Purchase token inválido ou vazio.';
  END IF;

  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  IF v_biz.owner_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa ou administradores podem vincular compras.';
  END IF;

  IF p_product_id = 'economizaja_pro_monthly' OR p_product_id = 'pro-monthly' THEN
    v_plan_tier := 'pro';
    v_amount := 79.90;
  ELSIF p_product_id = 'economizaja_premium_monthly' OR p_product_id = 'premium-monthly' THEN
    v_plan_tier := 'premium';
    v_amount := 159.90;
  ELSE
    RAISE EXCEPTION 'Produto não reconhecido pelo Google Play: %', p_product_id;
  END IF;

  SELECT * INTO v_existing_token_sub
  FROM public.subscriptions
  WHERE provider_subscription_id = p_purchase_token
  LIMIT 1;

  IF v_existing_token_sub.id IS NOT NULL AND v_existing_token_sub.business_id != p_business_id THEN
    RAISE EXCEPTION 'Violação de segurança: Este comprovante de compra do Google Play já foi utilizado por outra conta.';
  END IF;

  IF v_existing_token_sub.id IS NOT NULL AND v_existing_token_sub.business_id = p_business_id AND v_existing_token_sub.status = 'ACTIVE' THEN
    UPDATE public.businesses
    SET plan_tier = v_plan_tier
    WHERE id = p_business_id;

    RETURN jsonb_build_object(
      'success', true,
      'subscription_id', v_existing_token_sub.id,
      'business_id', p_business_id,
      'plan_tier', v_plan_tier,
      'status', 'ACTIVE',
      'idempotent', true
    );
  END IF;

  IF v_existing_token_sub.id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET status = 'ACTIVE',
        plan_tier = v_plan_tier,
        billing_provider = 'google_play_billing',
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE id = v_existing_token_sub.id
    RETURNING id INTO v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (
      business_id,
      plan_tier,
      status,
      billing_provider,
      provider_subscription_id,
      current_period_start,
      current_period_end
    ) VALUES (
      p_business_id,
      v_plan_tier,
      'ACTIVE',
      'google_play_billing',
      p_purchase_token,
      NOW(),
      NOW() + INTERVAL '30 days'
    ) RETURNING id INTO v_sub_id;
  END IF;

  INSERT INTO public.payments (
    user_id,
    business_id,
    amount,
    currency,
    status,
    payment_method,
    purpose,
    provider_payment_id
  ) VALUES (
    auth.uid(),
    p_business_id,
    v_amount,
    'BRL',
    'COMPLETED',
    'google_play_billing',
    'subscription_' || v_plan_tier,
    COALESCE(p_order_id, p_purchase_token)
  );

  UPDATE public.businesses
  SET plan_tier = v_plan_tier,
      updated_at = NOW()
  WHERE id = p_business_id;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_action_logs') THEN
    INSERT INTO public.admin_action_logs (
      performed_by,
      action,
      entity_type,
      entity_id,
      entity_name,
      notes
    ) VALUES (
      auth.uid(),
      'GOOGLE_PLAY_PURCHASE_VERIFIED',
      'subscription',
      v_sub_id,
      v_biz.name,
      jsonb_build_object(
        'product_id', p_product_id,
        'plan_tier', v_plan_tier,
        'order_id', p_order_id,
        'token_prefix', substring(p_purchase_token, 1, 12) || '...'
      )::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'business_id', p_business_id,
    'plan_tier', v_plan_tier,
    'status', 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.process_google_play_purchase(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_activate_business_plan(
  p_business_id UUID,
  p_plan_tier TEXT,
  p_reason TEXT,
  p_duration_days INT DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_biz RECORD;
  v_sub_id UUID;
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem ativar planos manualmente.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'É obrigatório informar uma justificativa detalhada para ativação administrativa.';
  END IF;

  IF p_plan_tier NOT IN ('free', 'gratis', 'pro', 'premium') THEN
    RAISE EXCEPTION 'Plano inválido: %', p_plan_tier;
  END IF;

  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  SELECT email INTO v_admin_email
  FROM auth.users
  WHERE id = auth.uid();

  IF p_plan_tier = 'free' THEN
    p_plan_tier := 'gratis';
  END IF;

  INSERT INTO public.subscriptions (
    business_id,
    plan_tier,
    status,
    billing_provider,
    provider_subscription_id,
    current_period_start,
    current_period_end
  ) VALUES (
    p_business_id,
    p_plan_tier,
    'ACTIVE',
    'admin_manual',
    'manual-by-' || COALESCE(auth.uid()::text, 'admin'),
    NOW(),
    NOW() + (p_duration_days || ' days')::interval
  ) RETURNING id INTO v_sub_id;

  UPDATE public.businesses
  SET plan_tier = p_plan_tier,
      updated_at = NOW()
  WHERE id = p_business_id;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_action_logs') THEN
    INSERT INTO public.admin_action_logs (
      performed_by,
      action,
      entity_type,
      entity_id,
      entity_name,
      notes
    ) VALUES (
      auth.uid(),
      'ADMIN_MANUAL_PLAN_ACTIVATION',
      'business',
      p_business_id,
      v_biz.name,
      jsonb_build_object(
        'plan_tier', p_plan_tier,
        'duration_days', p_duration_days,
        'reason', p_reason,
        'admin_email', v_admin_email,
        'timestamp', NOW()
      )::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'business_id', p_business_id,
    'plan_tier', p_plan_tier,
    'billing_provider', 'admin_manual',
    'status', 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.admin_activate_business_plan(UUID, TEXT, TEXT, INT) TO authenticated;

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('review', 'business', 'offer', 'quote', 'user')),
  content_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN')),
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON public.content_reports(content_type, content_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can submit content reports" ON public.content_reports;
CREATE POLICY "Authenticated users can submit content reports"
  ON public.content_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Users can view own reports" ON public.content_reports;
CREATE POLICY "Users can view own reports"
  ON public.content_reports FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.content_reports;
CREATE POLICY "Admins can update reports"
  ON public.content_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_user_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own blocks" ON public.user_blocks;
CREATE POLICY "Users can manage own blocks"
  ON public.user_blocks FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_content_report(
  p_content_type TEXT,
  p_content_id TEXT,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar logado para denunciar conteúdo.';
  END IF;

  IF p_content_type NOT IN ('review', 'business', 'offer', 'quote', 'user') THEN
    RAISE EXCEPTION 'Tipo de conteúdo inválido: %', p_content_type;
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 2 THEN
    RAISE EXCEPTION 'Informe o motivo da denúncia.';
  END IF;

  INSERT INTO public.content_reports (
    reporter_user_id,
    content_type,
    content_id,
    reason,
    details
  ) VALUES (
    auth.uid(),
    p_content_type,
    p_content_id,
    p_reason,
    p_details
  ) RETURNING id INTO v_report_id;

  IF p_content_type = 'review' THEN
    UPDATE public.reviews
    SET reported = true
    WHERE id = p_content_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'message', 'Denúncia enviada com sucesso para moderação.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_content_report(TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_moderate_content(
  p_report_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem moderar conteúdo.';
  END IF;

  SELECT * INTO v_report
  FROM public.content_reports
  WHERE id = p_report_id;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Denúncia não encontrada.';
  END IF;

  IF p_action = 'DISMISS' THEN
    UPDATE public.content_reports
    SET status = 'DISMISSED',
        action_taken = COALESCE(p_notes, 'Denúncia descartada após revisão.'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_report_id;

  ELSIF p_action = 'HIDE_CONTENT' THEN
    IF v_report.content_type = 'review' THEN
      UPDATE public.reviews
      SET active = false, reported = true
      WHERE id = v_report.content_id;
    ELSIF v_report.content_type = 'offer' THEN
      UPDATE public.offers
      SET active = false
      WHERE id = v_report.content_id;
    ELSIF v_report.content_type = 'business' THEN
      UPDATE public.businesses
      SET active = false, featured = false
      WHERE id = v_report.content_id::uuid;
    END IF;

    UPDATE public.content_reports
    SET status = 'ACTION_TAKEN',
        action_taken = COALESCE(p_notes, 'Conteúdo ocultado/desativado por moderação.'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_report_id;

  ELSIF p_action = 'SUSPEND_USER' THEN
    UPDATE public.profiles
    SET role = 'customer'
    WHERE id = v_report.content_id::uuid;

    UPDATE public.content_reports
    SET status = 'ACTION_TAKEN',
        action_taken = COALESCE(p_notes, 'Usuário suspenso por infração às diretrizes.'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_report_id;
  ELSE
    RAISE EXCEPTION 'Ação de moderação inválida: %', p_action;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', p_report_id,
    'status', 'ACTION_TAKEN',
    'action', p_action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_moderate_content(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.block_user(p_blocked_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF auth.uid() = p_blocked_user_id THEN
    RAISE EXCEPTION 'Não é permitido bloquear a si mesmo.';
  END IF;

  INSERT INTO public.user_blocks (blocker_id, blocked_user_id)
  VALUES (auth.uid(), p_blocked_user_id)
  ON CONFLICT (blocker_id, blocked_user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Usuário bloqueado com sucesso.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.block_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  r_quote RECORD;
  r_biz RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para excluir sua conta.';
  END IF;

  FOR r_quote IN SELECT id FROM public.quote_requests WHERE user_id = v_user_id LOOP
    BEGIN
      PERFORM public.delete_quote_request(r_quote.id);
    EXCEPTION WHEN OTHERS THEN
      DELETE FROM public.quote_proposals WHERE quote_request_id = r_quote.id;
      DELETE FROM public.quote_requests WHERE id = r_quote.id;
    END;
  END LOOP;

  FOR r_biz IN SELECT id FROM public.businesses WHERE owner_id = v_user_id LOOP
    UPDATE public.featured_listings SET active = false WHERE business_id = r_biz.id;
    UPDATE public.businesses SET active = false, featured = false WHERE id = r_biz.id;
    UPDATE public.offers SET active = false WHERE business_id = r_biz.id;
  END LOOP;

  DELETE FROM public.user_blocks WHERE blocker_id = v_user_id OR blocked_user_id = v_user_id;
  UPDATE public.content_reports SET reporter_user_id = NULL WHERE reporter_user_id = v_user_id;

  DELETE FROM public.favorites WHERE user_id = v_user_id;
  DELETE FROM public.price_alerts WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_tokens') THEN
    DELETE FROM public.device_tokens WHERE user_id = v_user_id;
  END IF;

  DELETE FROM public.profiles WHERE id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

NOTIFY pgrst, 'reload schema';

