-- ==============================================================================
-- MIGRAÇÃO 00041: ASSINATURAS GOOGLE PLAY VALIDADAS SOMENTE NO SERVIDOR
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Problema: process_google_play_purchase podia ser chamada direto pelo app
-- (GRANT ... TO authenticated) com qualquer token, ativando Pro/Premium sem
-- pagamento.
--
-- Solução:
--  * Nova RPC apply_verified_google_play_purchase, executável apenas pelo
--    service_role, chamada pela Edge Function verify-play-purchase depois de
--    confirmar a assinatura na Google Play Developer API.
--  * Revoga a execução de process_google_play_purchase pelos clientes.
--  * Função expire_lapsed_google_play_subscriptions() rebaixa empresas cuja
--    assinatura venceu (agendada via pg_cron quando disponível).
--
-- ORDEM DE IMPLANTAÇÃO: publique a Edge Function e configure o secret
-- GOOGLE_PLAY_SERVICE_ACCOUNT_JSON antes (ou logo depois) de aplicar esta migração.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.apply_verified_google_play_purchase(
  p_user_id UUID,
  p_business_id UUID,
  p_product_id TEXT,
  p_purchase_token TEXT,
  p_order_id TEXT,
  p_expiry_time TIMESTAMPTZ,
  p_purchase_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_biz RECORD;
  v_plan_tier TEXT;
  v_amount NUMERIC(10, 2);
  v_existing RECORD;
  v_sub_id UUID;
BEGIN
  IF p_user_id IS NULL OR p_purchase_token IS NULL OR trim(p_purchase_token) = '' THEN
    RAISE EXCEPTION 'Parâmetros inválidos.';
  END IF;

  SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id;
  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;
  IF v_biz.owner_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa pode vincular esta assinatura.';
  END IF;

  IF p_product_id = 'economizaja_pro_monthly' THEN
    v_plan_tier := 'pro';
    v_amount := 79.90;
  ELSIF p_product_id = 'economizaja_premium_monthly' THEN
    v_plan_tier := 'premium';
    v_amount := 159.90;
  ELSE
    RAISE EXCEPTION 'Produto não reconhecido: %', p_product_id;
  END IF;

  -- Anti-replay: o mesmo token não pode beneficiar outra empresa
  SELECT * INTO v_existing
  FROM public.subscriptions
  WHERE provider_subscription_id = p_purchase_token
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NOT NULL AND v_existing.business_id <> p_business_id THEN
    RAISE EXCEPTION 'Este comprovante do Google Play já foi utilizado por outra empresa.';
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET status = 'ACTIVE',
        plan_tier = v_plan_tier,
        billing_provider = 'google_play_billing',
        current_period_end = p_expiry_time,
        updated_at = NOW()
    WHERE id = v_existing.id
    RETURNING id INTO v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (
      business_id, plan_tier, status, billing_provider,
      provider_subscription_id, current_period_start, current_period_end
    ) VALUES (
      p_business_id, v_plan_tier, 'ACTIVE', 'google_play_billing',
      p_purchase_token, NOW(), p_expiry_time
    ) RETURNING id INTO v_sub_id;

    INSERT INTO public.payments (
      user_id, business_id, amount, currency, status,
      payment_method, purpose, provider_payment_id
    ) VALUES (
      p_user_id, p_business_id, v_amount, 'BRL', 'COMPLETED',
      'google_play_billing', 'subscription_' || v_plan_tier,
      COALESCE(p_order_id, p_purchase_token)
    );
  END IF;

  UPDATE public.businesses
  SET plan_tier = v_plan_tier,
      updated_at = NOW()
  WHERE id = p_business_id;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_action_logs') THEN
    INSERT INTO public.admin_action_logs (
      performed_by, action, entity_type, entity_id, entity_name, notes
    ) VALUES (
      p_user_id,
      'GOOGLE_PLAY_PURCHASE_VERIFIED',
      'subscription',
      v_sub_id,
      v_biz.name,
      jsonb_build_object(
        'product_id', p_product_id,
        'plan_tier', v_plan_tier,
        'order_id', p_order_id,
        'expiry_time', p_expiry_time,
        'token_prefix', substring(p_purchase_token, 1, 12) || '...',
        'payload', p_purchase_payload
      )::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'business_id', p_business_id,
    'plan_tier', v_plan_tier,
    'status', 'ACTIVE',
    'current_period_end', p_expiry_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.apply_verified_google_play_purchase(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_google_play_purchase(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB) TO service_role;

-- O app não pode mais ativar planos diretamente
REVOKE EXECUTE ON FUNCTION public.process_google_play_purchase(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- Rebaixa empresas cuja assinatura do Google Play venceu sem renovação validada
CREATE OR REPLACE FUNCTION public.expire_lapsed_google_play_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH expired AS (
    UPDATE public.subscriptions
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'ACTIVE'
      AND billing_provider = 'google_play_billing'
      -- 3 dias de tolerância para o app revalidar a renovação
      AND current_period_end < NOW() - INTERVAL '3 days'
    RETURNING business_id
  )
  UPDATE public.businesses b
  SET plan_tier = 'gratis', updated_at = NOW()
  WHERE b.id IN (SELECT business_id FROM expired)
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.business_id = b.id AND s.status = 'ACTIVE' AND s.current_period_end >= NOW()
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.expire_lapsed_google_play_subscriptions() FROM PUBLIC, anon, authenticated;

-- Agenda a expiração diária se o pg_cron estiver habilitado no projeto
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-google-play-subscriptions';
    PERFORM cron.schedule(
      'expire-google-play-subscriptions',
      '0 6 * * *',
      'SELECT public.expire_lapsed_google_play_subscriptions();'
    );
  ELSE
    RAISE NOTICE 'pg_cron não habilitado: ative em Database > Extensions e reaplique este bloco para agendar a expiração diária.';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
