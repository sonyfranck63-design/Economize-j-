-- ==============================================================================
-- MIGRAÇÃO 00042: DESTAQUE PATROCINADO VENDIDO PELO GOOGLE PLAY (COMPRA ÚNICA)
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Produtos de compra única (consumíveis) cadastrados na Play Console:
--   economizaja_destaque_7_dias   ->  7 dias
--   economizaja_destaque_15_dias  -> 15 dias
--   economizaja_destaque_30_dias  -> 30 dias
--
-- Fluxo: app compra -> Edge Function verify-play-purchase confirma na Google Play
-- Developer API -> chama apply_verified_featured_purchase (somente service_role)
-- -> a Edge Function consome a compra no Google, permitindo recompra.
--
-- O gatilho de segurança de businesses.featured (00028/00033) exige um destaque
-- ativo com pagamento COMPLETED cujo provider_payment_id = featured_listings.id;
-- esta função cria exatamente esse par.
-- ==============================================================================

-- Registro anti-reuso de comprovantes de compras únicas do Google Play
CREATE TABLE IF NOT EXISTS public.play_product_purchases (
  purchase_token TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id TEXT,
  featured_listing_id UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.play_product_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins can view play product purchases" ON public.play_product_purchases;
CREATE POLICY "Owners and admins can view play product purchases"
  ON public.play_product_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.apply_verified_featured_purchase(
  p_user_id UUID,
  p_business_id UUID,
  p_product_id TEXT,
  p_purchase_token TEXT,
  p_order_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_biz RECORD;
  v_days INT;
  v_amount NUMERIC(10, 2);
  v_existing RECORD;
  v_start DATE;
  v_end DATE;
  v_listing_id UUID;
BEGIN
  IF p_user_id IS NULL OR p_purchase_token IS NULL OR trim(p_purchase_token) = '' THEN
    RAISE EXCEPTION 'Parâmetros inválidos.';
  END IF;

  v_days := CASE p_product_id
    WHEN 'economizaja_destaque_7_dias' THEN 7
    WHEN 'economizaja_destaque_15_dias' THEN 15
    WHEN 'economizaja_destaque_30_dias' THEN 30
    ELSE NULL
  END;
  IF v_days IS NULL THEN
    RAISE EXCEPTION 'Produto de destaque não reconhecido: %', p_product_id;
  END IF;

  -- Valores de referência para relatórios internos (o preço cobrado é o da Play Console)
  v_amount := CASE v_days WHEN 7 THEN 139.90 WHEN 15 THEN 279.90 ELSE 499.90 END;

  -- Idempotência / anti-reuso: um comprovante só pode ser aplicado uma vez
  SELECT * INTO v_existing FROM public.play_product_purchases WHERE purchase_token = p_purchase_token;
  IF v_existing.purchase_token IS NOT NULL THEN
    IF v_existing.business_id IS DISTINCT FROM p_business_id THEN
      RAISE EXCEPTION 'Este comprovante do Google Play já foi utilizado por outra empresa.';
    END IF;
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'featured_listing_id', v_existing.featured_listing_id
    );
  END IF;

  SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id;
  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;
  IF v_biz.owner_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Apenas o proprietário da empresa pode contratar o destaque.';
  END IF;

  -- Se já houver destaque vigente, o novo período começa logo após o último
  SELECT GREATEST(CURRENT_DATE, COALESCE(MAX(end_date) + 1, CURRENT_DATE)) INTO v_start
  FROM public.featured_listings
  WHERE business_id = p_business_id AND active = true AND end_date >= CURRENT_DATE;
  v_end := v_start + (v_days - 1);

  INSERT INTO public.featured_listings (business_id, start_date, end_date, active, daily_cost)
  VALUES (p_business_id, v_start, v_end, true, round(v_amount / v_days, 2))
  RETURNING id INTO v_listing_id;

  -- Pagamento vinculado ao destaque (exigido pelo gatilho de businesses.featured)
  INSERT INTO public.payments (
    user_id, business_id, amount, currency, status, payment_method, purpose, provider_payment_id
  ) VALUES (
    p_user_id, p_business_id, v_amount, 'BRL', 'COMPLETED', 'google_play_billing',
    'featured_listing_' || v_days || 'd', v_listing_id::text
  );

  INSERT INTO public.play_product_purchases (
    purchase_token, product_id, business_id, user_id, order_id, featured_listing_id
  ) VALUES (
    p_purchase_token, p_product_id, p_business_id, p_user_id, p_order_id, v_listing_id
  );

  UPDATE public.businesses SET featured = true WHERE id = p_business_id;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_action_logs') THEN
    INSERT INTO public.admin_action_logs (
      performed_by, action, entity_type, entity_id, entity_name, notes
    ) VALUES (
      p_user_id,
      'GOOGLE_PLAY_FEATURED_PURCHASE_VERIFIED',
      'featured_listing',
      v_listing_id,
      v_biz.name,
      jsonb_build_object(
        'product_id', p_product_id,
        'days', v_days,
        'start_date', v_start,
        'end_date', v_end,
        'order_id', p_order_id,
        'token_prefix', substring(p_purchase_token, 1, 12) || '...'
      )::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'featured_listing_id', v_listing_id,
    'business_id', p_business_id,
    'start_date', v_start,
    'end_date', v_end,
    'days', v_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.apply_verified_featured_purchase(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_featured_purchase(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
