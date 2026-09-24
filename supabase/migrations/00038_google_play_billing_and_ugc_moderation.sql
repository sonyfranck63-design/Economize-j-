-- ==============================================================================
-- MIGRAÇÃO 00038: GOOGLE PLAY BILLING, ATIVAÇÃO MANUAL COM AUDITORIA E UGC MODERAÇÃO
-- EconomizaJá - Produção Real
-- ==============================================================================

-- 1. ALINHAMENTO DE PREÇOS OFICIAIS DOS PLANOS NA FUNÇÃO INITIATE_PLAN_SUBSCRIPTION
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

  -- Preços oficiais da Google Play Store (alinhados com billingService.ts e Play Console)
  v_amount := CASE WHEN p_plan_tier = 'pro' THEN 79.90 ELSE 159.90 END;

  -- Verifica se já existe assinatura pendente recente para reutilizar
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

  -- Cria nova assinatura pendente
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

  -- Registra intenção de pagamento pendente
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


-- ==============================================================================
-- 2. RPC SEGURA: PROCESSAMENTO DE COMPRA DO GOOGLE PLAY BILLING
-- Chamada pelo cliente Android após o sucesso do fluxo nativo do Google Play
-- Implementa anti-replay, validação de propriedade da empresa e ativação segura
-- ==============================================================================
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

  -- 1. Verifica empresa
  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  IF v_biz.owner_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa ou administradores podem vincular compras.';
  END IF;

  -- 2. Mapeia product_id para plan_tier
  IF p_product_id = 'economizaja_pro_monthly' OR p_product_id = 'pro-monthly' THEN
    v_plan_tier := 'pro';
    v_amount := 79.90;
  ELSIF p_product_id = 'economizaja_premium_monthly' OR p_product_id = 'premium-monthly' THEN
    v_plan_tier := 'premium';
    v_amount := 159.90;
  ELSE
    RAISE EXCEPTION 'Produto não reconhecido pelo Google Play: %', p_product_id;
  END IF;

  -- 3. Proteção Anti-Replay: Verifica se este purchase_token já foi usado por OUTRA empresa
  SELECT * INTO v_existing_token_sub
  FROM public.subscriptions
  WHERE provider_subscription_id = p_purchase_token
  LIMIT 1;

  IF v_existing_token_sub.id IS NOT NULL AND v_existing_token_sub.business_id != p_business_id THEN
    RAISE EXCEPTION 'Violação de segurança: Este comprovante de compra do Google Play já foi utilizado por outra conta.';
  END IF;

  -- 4. Idempotência: Se já está ativo para esta mesma empresa com este token, retorna sucesso
  IF v_existing_token_sub.id IS NOT NULL AND v_existing_token_sub.business_id = p_business_id AND v_existing_token_sub.status = 'ACTIVE' THEN
    -- Garante que a empresa permaneça com o plan_tier correto
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

  -- 5. Atualiza ou insere na tabela subscriptions
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

  -- 6. Registra pagamento com status COMPLETED
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

  -- 7. Atualiza benefício real na tabela businesses (bypassa trigger pois roda em SECURITY DEFINER)
  UPDATE public.businesses
  SET plan_tier = v_plan_tier,
      updated_at = NOW()
  WHERE id = p_business_id;

  -- 8. Auditoria na tabela admin_action_logs
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


-- ==============================================================================
-- 3. RPC: ATIVAÇÃO ADMINISTRATIVA MANUAL COM AUDITORIA SEPARADA
-- Exclusivo para administradores realizarem suporte, testes e regularização
-- ==============================================================================
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
  -- 1. Apenas administradores autorizados
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

  -- Normaliza nome do plano gratuito
  IF p_plan_tier = 'free' THEN
    p_plan_tier := 'gratis';
  END IF;

  -- 2. Registra assinatura com provedor admin_manual
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

  -- 3. Atualiza plan_tier na empresa
  UPDATE public.businesses
  SET plan_tier = p_plan_tier,
      updated_at = NOW()
  WHERE id = p_business_id;

  -- 4. Grava auditoria obrigatória em admin_action_logs
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


-- ==============================================================================
-- 4. UGC: SISTEMA DE DENÚNCIAS, MODERAÇÃO E BLOQUEIO DE USUÁRIOS
-- Conformidade estrita com as políticas de Conteúdo Gerado por Usuário da Google Play
-- ==============================================================================

-- Tabela de Denúncias de Conteúdo (content_reports)
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

-- Qualquer usuário autenticado pode criar uma denúncia
DROP POLICY IF EXISTS "Authenticated users can submit content reports" ON public.content_reports;
CREATE POLICY "Authenticated users can submit content reports"
  ON public.content_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

-- O autor da denúncia pode ver o status de suas próprias denúncias
DROP POLICY IF EXISTS "Users can view own reports" ON public.content_reports;
CREATE POLICY "Users can view own reports"
  ON public.content_reports FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid() OR public.is_admin());

-- Apenas administradores podem atualizar denúncias (moderação)
DROP POLICY IF EXISTS "Admins can update reports" ON public.content_reports;
CREATE POLICY "Admins can update reports"
  ON public.content_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tabela de Bloqueio de Usuários (user_blocks)
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

-- RPC para envio de denúncia
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

  -- Se for denúncia de review, marca a coluna reported = true na tabela reviews de forma segura
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


-- RPC Administrativa para Moderar Denúncia
CREATE OR REPLACE FUNCTION public.admin_moderate_content(
  p_report_id UUID,
  p_action TEXT, -- 'DISMISS', 'HIDE_CONTENT', 'SUSPEND_USER'
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
    -- Desativa perfis associados
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


-- RPC para Bloqueio de Usuário entre Consumidores/Parceiros
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


-- ==============================================================================
-- 5. ATUALIZAÇÃO DA RPC DELETE_OWN_ACCOUNT
-- Garante exclusão sem falhas de integridade referencial nas novas tabelas
-- ==============================================================================
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

  -- a) Remove cotações criadas pelo próprio usuário
  FOR r_quote IN SELECT id FROM public.quote_requests WHERE user_id = v_user_id LOOP
    BEGIN
      PERFORM public.delete_quote_request(r_quote.id);
    EXCEPTION WHEN OTHERS THEN
      DELETE FROM public.quote_proposals WHERE quote_request_id = r_quote.id;
      DELETE FROM public.quote_requests WHERE id = r_quote.id;
    END;
  END LOOP;

  -- b) Desativa empresas do parceiro e revoga destaques
  FOR r_biz IN SELECT id FROM public.businesses WHERE owner_id = v_user_id LOOP
    UPDATE public.featured_listings SET active = false WHERE business_id = r_biz.id;
    UPDATE public.businesses SET active = false, featured = false WHERE id = r_biz.id;
    UPDATE public.offers SET active = false WHERE business_id = r_biz.id;
  END LOOP;

  -- c) Remove dados de bloqueio e desvincula denúncias
  DELETE FROM public.user_blocks WHERE blocker_id = v_user_id OR blocked_user_id = v_user_id;
  UPDATE public.content_reports SET reporter_user_id = NULL WHERE reporter_user_id = v_user_id;

  -- d) Remove dados pessoais e de engajamento do usuário
  DELETE FROM public.favorites WHERE user_id = v_user_id;
  DELETE FROM public.price_alerts WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_tokens') THEN
    DELETE FROM public.device_tokens WHERE user_id = v_user_id;
  END IF;

  -- e) Remove perfil público em public.profiles
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- f) Remove usuário do cadastro de autenticação do Supabase (auth.users)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
