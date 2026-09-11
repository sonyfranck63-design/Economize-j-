-- ==============================================================================
-- EconomizaJá — Migração 00026: Hardening de Produção, Segurança e Conformidade
-- Atende a:
-- 1. Status PENDING e FAILED para assinaturas e default PENDING
-- 2. Limites de planos validados estritamente no banco (backend)
-- 3. Precificação dinâmica e automática de leads comerciais via app_settings
-- 4. Isolamento estrito de orçamentos direcionados (bloqueio de propostas indevidas)
-- 5. Revogação de acesso anon na secure_leads_view
-- 6. RPCs seguras de transação para assinaturas e leads
-- 7. Desacoplamento de plano e destaque patrocinado (validação temporal)
-- 8. Limpeza atômica completa para LGPD / Google Play
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUM E DEFAULTS DE SUBSCRIPTION STATUS
-- ------------------------------------------------------------------------------
DO $$ 
BEGIN
  -- Adiciona PENDING se não existir no enum subscription_status_type
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    WHERE t.typname = 'subscription_status_type' AND e.enumlabel = 'PENDING'
  ) THEN
    ALTER TYPE public.subscription_status_type ADD VALUE 'PENDING';
  END IF;

  -- Adiciona FAILED se não existir no enum subscription_status_type
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    WHERE t.typname = 'subscription_status_type' AND e.enumlabel = 'FAILED'
  ) THEN
    ALTER TYPE public.subscription_status_type ADD VALUE 'FAILED';
  END IF;
END $$;

-- Garante que subscriptions.status tenha default PENDING
ALTER TABLE public.subscriptions 
  ALTER COLUMN status SET DEFAULT 'PENDING'::public.subscription_status_type;

-- ------------------------------------------------------------------------------
-- 2. REVOGAÇÃO DE ACESSO ANON NA VIEW SECURE_LEADS_VIEW
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.secure_leads_view FROM anon;
GRANT SELECT ON public.secure_leads_view TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER: PRECIFICAÇÃO DINÂMICA E CRIAÇÃO AUTOMÁTICA DE LEADS
-- Lê o preço configurado pelo Admin em app_settings ('monetization'->'costPerLead')
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_auto_create_lead_from_quote()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_price NUMERIC(10, 2) := 15.00;
  v_settings_val JSONB;
BEGIN
  -- Orçamentos direcionados para uma empresa específica são exclusivos
  -- e NÃO viram leads à venda no marketplace geral.
  IF NEW.target_business_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Tenta buscar o preço parametrizado pelo Admin em app_settings
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
-- 4. TRIGGER: VALIDAÇÃO DE LIMITES DE PLANO E ORÇAMENTOS DIRECIONADOS EM PROPOSTAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_validate_quote_proposal_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_biz_owner UUID;
  v_biz_plan public.business_plan_type;
  v_target_biz UUID;
  v_monthly_count INT;
BEGIN
  -- 1. Verifica se a empresa existe e se o usuário atual é o proprietário ou admin
  SELECT owner_id, COALESCE(plan_tier, 'gratis'::public.business_plan_type)
  INTO v_biz_owner, v_biz_plan
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF v_biz_owner IS NULL THEN
    RAISE EXCEPTION 'Empresa proponente não encontrada.';
  END IF;

  IF v_biz_owner != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Você só pode enviar propostas através de empresas das quais é proprietário.';
  END IF;

  -- 2. Verifica se o orçamento é direcionado para OUTRA empresa
  SELECT target_business_id
  INTO v_target_biz
  FROM public.quote_requests
  WHERE id = NEW.quote_request_id;

  IF v_target_biz IS NOT NULL AND v_target_biz != NEW.business_id THEN
    RAISE EXCEPTION 'Este orçamento é exclusivo e foi direcionado a outro parceiro.';
  END IF;

  -- 3. Limite do Plano Gratuito: máximo 3 propostas por mês
  IF v_biz_plan = 'gratis' AND NOT public.is_admin() THEN
    SELECT COUNT(*)
    INTO v_monthly_count
    FROM public.quote_proposals
    WHERE business_id = NEW.business_id
      AND created_at >= date_trunc('month', NOW());

    IF v_monthly_count >= 3 THEN
      RAISE EXCEPTION 'Limite de 3 propostas mensais atingido para o Plano Gratuito. Faça upgrade para o Plano Pró para enviar propostas ilimitadas.';
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
-- 5. TRIGGER: VALIDAÇÃO DE LIMITES DE OFERTAS ATIVAS POR PLANO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_validate_offer_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_biz_owner UUID;
  v_biz_plan public.business_plan_type;
  v_active_offers_count INT;
BEGIN
  -- Só aplica checagem em novas inserções ativas ou ativação de oferta
  IF NEW.active IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT owner_id, COALESCE(plan_tier, 'gratis'::public.business_plan_type)
  INTO v_biz_owner, v_biz_plan
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF v_biz_owner IS NULL THEN
    RAISE EXCEPTION 'Empresa vinculada à oferta não encontrada.';
  END IF;

  IF v_biz_owner != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Você só pode publicar ofertas em empresas das quais é proprietário.';
  END IF;

  -- Contagem de ofertas ativas da empresa
  SELECT COUNT(*)
  INTO v_active_offers_count
  FROM public.offers
  WHERE business_id = NEW.business_id
    AND active = true
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF v_biz_plan = 'gratis' AND v_active_offers_count >= 1 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Limite de 1 oferta ativa atingido para o Plano Gratuito. Faça upgrade para o Plano Pró para publicar até 5 ofertas simultâneas.';
  ELSIF v_biz_plan = 'pro' AND v_active_offers_count >= 5 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Limite de 5 ofertas ativas atingido para o Plano Pró. Faça upgrade para o Plano Premium para publicar ofertas ilimitadas.';
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
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  -- Valida proprietário da empresa
  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o responsável pela empresa pode contratar planos.';
  END IF;

  IF p_plan_tier NOT IN ('pro', 'premium') THEN
    RAISE EXCEPTION 'Plano inválido para contratação: %', p_plan_tier;
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
    p_plan_tier::public.business_plan_type,
    'PENDING'::public.subscription_status_type,
    p_billing_provider,
    NOW(),
    NOW() + INTERVAL '30 days'
  ) RETURNING id INTO v_sub_id;

  -- Registra intenção de pagamento com status PENDING
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
    'PENDING'::public.payment_status_type,
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
-- 7. RPC: CONFIRMAÇÃO DE ASSINATURA (TRANSIÇÃO PENDING -> ACTIVE)
-- Validação segura por Admin ou Provedor de Pagamento
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
    RAISE EXCEPTION 'Assinatura não encontrada.';
  END IF;

  -- Transiciona assinatura para ACTIVE
  UPDATE public.subscriptions
  SET status = 'ACTIVE'::public.subscription_status_type,
      provider_subscription_id = COALESCE(p_provider_transaction_id, provider_subscription_id),
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '30 days',
      updated_at = NOW()
  WHERE id = p_subscription_id;

  -- Transiciona pagamentos vinculados para COMPLETED
  UPDATE public.payments
  SET status = 'COMPLETED'::public.payment_status_type
  WHERE business_id = v_sub.business_id 
    AND (provider_payment_id = p_subscription_id::text OR status = 'PENDING');

  -- Atualiza o benefício (plan_tier) na tabela de empresas
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
-- 8. GESTÃO TEMPORAL DE DESTAQUES PATROCINADOS (FEATURED_LISTINGS)
-- Plano != Destaque. O destaque tem início e término definidos.
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
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa pode contratar destaque.';
  END IF;

  IF p_days < 1 THEN
    RAISE EXCEPTION 'Período mínimo de destaque é de 1 dia.';
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
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_owner IS NULL OR (v_biz_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa pode adquirir este lead.';
  END IF;

  -- Lock no registro do lead para evitar concorrência simultânea
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead não encontrado.';
  END IF;

  IF v_lead.status NOT IN ('AVAILABLE', 'NEW') THEN
    RAISE EXCEPTION 'Este lead não está mais disponível para aquisição.';
  END IF;

  -- Verifica se a empresa já comprou o lead
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

  -- Registra a compra atômica
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

  -- Atualiza contador transacional de métricas da empresa
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
-- 10. HARDENING LGPD & GOOGLE PLAY: EXCLUSÃO ATÔMICA TOTAL DE CONTA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  r_quote RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para excluir sua conta.';
  END IF;

  -- 1. Exclui com integridade todas as cotações criadas pelo usuário
  FOR r_quote IN SELECT id FROM public.quote_requests WHERE user_id = v_user_id LOOP
    PERFORM public.delete_quote_request(r_quote.id);
  END LOOP;

  -- 2. Remove notificações e favoritos
  DELETE FROM public.favorites WHERE user_id = v_user_id;
  DELETE FROM public.price_alerts WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.device_tokens WHERE user_id = v_user_id;

  -- 3. Inativa empresas do usuário para não deixar registros órfãos
  UPDATE public.businesses SET active = false WHERE owner_id = v_user_id;

  -- 4. Remove o perfil em public.profiles
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 5. Remove o usuário da autenticação Supabase (auth.users)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
