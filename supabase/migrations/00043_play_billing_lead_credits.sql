-- ==============================================================================
-- MIGRAÇÃO 00043: PACOTES DE LEADS PELO GOOGLE PLAY + PROTEÇÃO DO SALDO DE LEADS
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Brechas corrigidas (auditoria 2026-10-12):
--  1. add_lead_credits permitia que o PRÓPRIO DONO da empresa se desse créditos.
--  2. Nenhum gatilho protegia businesses.lead_credits; a policy de UPDATE do dono
--     permitia "UPDATE businesses SET lead_credits = 9999" direto pela API.
--
-- Produtos de compra única (consumíveis) na Play Console:
--   economizaja_leads_1   ->  1 crédito
--   economizaja_leads_5   ->  5 créditos
--   economizaja_leads_20  -> 20 créditos
-- ==============================================================================

-- 1. Créditos manuais: somente administradores
CREATE OR REPLACE FUNCTION public.add_lead_credits(
  p_business_id UUID,
  p_credits INT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_biz RECORD;
  v_new_credits INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem adicionar créditos manualmente.';
  END IF;

  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'A quantidade de créditos a adicionar deve ser maior que zero.';
  END IF;

  SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id FOR UPDATE;
  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  UPDATE public.businesses
  SET lead_credits = COALESCE(lead_credits, 0) + p_credits,
      updated_at = NOW()
  WHERE id = p_business_id
  RETURNING lead_credits INTO v_new_credits;

  INSERT INTO public.admin_action_logs (
    performed_by, action, entity_type, entity_id, entity_name, notes
  ) VALUES (
    auth.uid(),
    'CREDITOS_LEAD_ADICIONADOS',
    'business',
    p_business_id,
    v_biz.name,
    COALESCE(p_notes, format('+%s créditos de leads adicionados', p_credits))
  );

  RETURN jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'credits_added', p_credits,
    'total_lead_credits', v_new_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.add_lead_credits(UUID, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_lead_credits(UUID, INT, TEXT) TO authenticated;

-- 2. Gatilho: clientes (anon/authenticated) não podem aumentar o próprio saldo.
--    Funções SECURITY DEFINER (ex.: submit_quote_proposal, compras validadas)
--    executam como o dono das funções e continuam podendo alterar o saldo.
CREATE OR REPLACE FUNCTION public.tg_protect_lead_credits()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.lead_credits := 0;
  ELSIF COALESCE(NEW.lead_credits, 0) > COALESCE(OLD.lead_credits, 0) THEN
    NEW.lead_credits := OLD.lead_credits;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_protect_lead_credits ON public.businesses;
CREATE TRIGGER trg_protect_lead_credits
  BEFORE INSERT OR UPDATE OF lead_credits ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.tg_protect_lead_credits();

-- 3. Registro dos créditos concedidos por compra
ALTER TABLE public.play_product_purchases ADD COLUMN IF NOT EXISTS lead_credits_granted INT;

-- 4. Concessão de créditos após validação no Google Play (somente service_role)
CREATE OR REPLACE FUNCTION public.apply_verified_leads_purchase(
  p_user_id UUID,
  p_business_id UUID,
  p_product_id TEXT,
  p_purchase_token TEXT,
  p_order_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_biz RECORD;
  v_credits INT;
  v_amount NUMERIC(10, 2);
  v_existing RECORD;
  v_new_total INT;
BEGIN
  IF p_user_id IS NULL OR p_purchase_token IS NULL OR trim(p_purchase_token) = '' THEN
    RAISE EXCEPTION 'Parâmetros inválidos.';
  END IF;

  v_credits := CASE p_product_id
    WHEN 'economizaja_leads_1' THEN 1
    WHEN 'economizaja_leads_5' THEN 5
    WHEN 'economizaja_leads_20' THEN 20
    ELSE NULL
  END;
  IF v_credits IS NULL THEN
    RAISE EXCEPTION 'Pacote de leads não reconhecido: %', p_product_id;
  END IF;

  -- Valores de referência para relatórios internos (o preço cobrado é o da Play Console)
  v_amount := CASE v_credits WHEN 1 THEN 15.00 WHEN 5 THEN 59.90 ELSE 199.90 END;

  -- Idempotência / anti-reuso
  SELECT * INTO v_existing FROM public.play_product_purchases WHERE purchase_token = p_purchase_token;
  IF v_existing.purchase_token IS NOT NULL THEN
    IF v_existing.business_id IS DISTINCT FROM p_business_id THEN
      RAISE EXCEPTION 'Este comprovante do Google Play já foi utilizado por outra empresa.';
    END IF;
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'credits_added', 0);
  END IF;

  SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id FOR UPDATE;
  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;
  IF v_biz.owner_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa pode comprar créditos para ela.';
  END IF;

  UPDATE public.businesses
  SET lead_credits = COALESCE(lead_credits, 0) + v_credits,
      updated_at = NOW()
  WHERE id = p_business_id
  RETURNING lead_credits INTO v_new_total;

  INSERT INTO public.payments (
    user_id, business_id, amount, currency, status, payment_method, purpose, provider_payment_id
  ) VALUES (
    p_user_id, p_business_id, v_amount, 'BRL', 'COMPLETED', 'google_play_billing',
    'lead_credits_' || v_credits, COALESCE(p_order_id, p_purchase_token)
  );

  INSERT INTO public.play_product_purchases (
    purchase_token, product_id, business_id, user_id, order_id, lead_credits_granted
  ) VALUES (
    p_purchase_token, p_product_id, p_business_id, p_user_id, p_order_id, v_credits
  );

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_action_logs') THEN
    INSERT INTO public.admin_action_logs (
      performed_by, action, entity_type, entity_id, entity_name, notes
    ) VALUES (
      p_user_id,
      'GOOGLE_PLAY_LEADS_PURCHASE_VERIFIED',
      'business',
      p_business_id,
      v_biz.name,
      jsonb_build_object(
        'product_id', p_product_id,
        'credits', v_credits,
        'total_after', v_new_total,
        'order_id', p_order_id,
        'token_prefix', substring(p_purchase_token, 1, 12) || '...'
      )::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'credits_added', v_credits,
    'total_lead_credits', v_new_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.apply_verified_leads_purchase(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_leads_purchase(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
