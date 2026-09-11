-- ==============================================================================
-- EconomizaJá — Migração 00027: Correção Definitiva do Aceite, Propostas e Monetização
-- 1. RPC accept_quote_proposal: Aceite atômico pelo consumidor com bloqueio transacional
-- 2. RPC submit_quote_proposal: Submissão transacional com transição para propostas_recebidas
-- 3. Correção do Destaque: initiate_featured_listing com status PENDING e sem ativação indevida
-- 4. RPC confirm_featured_listing: Confirmação protegida restrita a administradores
-- 5. Trigger on_proposal_inserted: Atualização automática para propostas_recebidas
-- 6. Trigger trg_protect_quote_request_status: Validação rigorosa de máquina de estados
-- ==============================================================================

-- 1. RPC: ACEITE DE PROPOSTA PELO CONSUMIDOR (TRANSAÇÃO ATÔMICA PROTEGIDA)
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
    RAISE EXCEPTION 'Não autenticado: faça login para aceitar uma proposta comercial.';
  END IF;

  v_is_admin := public.is_admin();

  -- Lock no quote_request com FOR UPDATE para evitar race condition
  SELECT * INTO v_quote
  FROM public.quote_requests
  WHERE id = p_quote_request_id
  FOR UPDATE;

  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Solicitação de orçamento não encontrada.';
  END IF;

  -- Verifica se o usuário atual é o solicitante ou administrador
  IF v_quote.user_id != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas o cliente solicitante pode aceitar uma proposta comercial para este orçamento.';
  END IF;

  -- Impede aceite se o orçamento já estiver cancelado ou finalizado
  IF v_quote.status = 'cancelado' THEN
    RAISE EXCEPTION 'Não é possível aceitar propostas para um pedido de orçamento encerrado/cancelado.';
  END IF;

  -- Lock na proposta para garantir integridade atômica
  SELECT * INTO v_prop
  FROM public.quote_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF v_prop.id IS NULL THEN
    RAISE EXCEPTION 'Proposta comercial não encontrada.';
  END IF;

  IF v_prop.quote_request_id != p_quote_request_id THEN
    RAISE EXCEPTION 'A proposta informada não pertence a este orçamento.';
  END IF;

  IF v_prop.status = 'recusada' THEN
    RAISE EXCEPTION 'Esta proposta foi recusada anteriormente e não pode ser reativada.';
  END IF;

  -- Execução atômica no banco de dados:
  -- A) Marca a proposta escolhida como 'escolhida'
  UPDATE public.quote_proposals
  SET status = 'escolhida', updated_at = NOW()
  WHERE id = p_proposal_id;

  -- B) Marca todas as demais propostas do mesmo orçamento como 'recusada'
  UPDATE public.quote_proposals
  SET status = 'recusada', updated_at = NOW()
  WHERE quote_request_id = p_quote_request_id AND id != p_proposal_id;

  -- C) Atualiza o status do orçamento para 'escolhido'
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


-- 2. RPC: SUBMISSÃO SEGURA DE PROPOSTA COM TRANSIÇÃO DE STATUS
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
    RAISE EXCEPTION 'Não autenticado: faça login para submeter uma proposta.';
  END IF;

  -- Valida a empresa e proprietário
  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id;

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

  -- Limite de propostas do plano gratuito (3 propostas/mês)
  IF COALESCE(v_biz.plan_tier, 'gratis') = 'gratis' AND NOT public.is_admin() THEN
    SELECT COUNT(*) INTO v_monthly_count
    FROM public.quote_proposals
    WHERE business_id = p_business_id
      AND created_at >= date_trunc('month', NOW());

    IF v_monthly_count >= 3 THEN
      RAISE EXCEPTION 'Limite de 3 propostas mensais atingido para o Plano Gratuito. Faça upgrade para o Plano Pró para enviar propostas ilimitadas.';
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
    'status', 'pendente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_quote_proposal(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;


-- 3. CORREÇÃO DO DESTAQUE PATROCINADO (STATUS PENDING OBRIGATÓRIO, SEM ATIVAÇÃO GRATUITA)
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

  -- 1. Insere o destaque com active = FALSE (NÃO ATIVADO ATÉ CONFIRMAÇÃO)
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

  -- REGRA DE SEGURANÇA: businesses.featured NÃO é ativado aqui.
  -- Apenas a confirmação do pagamento pode ativar o benefício.

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

-- Substitui a antiga create_featured_listing para redirecionar para a versão segura initiate_featured_listing
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


-- 4. RPC: CONFIRMAÇÃO DE DESTAQUE PATROCINADO (RESTRITA A ADMIN OU WEBHOOK)
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
    RAISE EXCEPTION 'Destaque patrocinado não encontrado.';
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

  -- 3. Ativa o benefício na empresa
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


-- 5. TRIGGER: TRANSIÇÃO AUTOMÁTICA DO ORÇAMENTO QUANDO UMA PROPOSTA É INSERIDA
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


-- 6. TRIGGER: MÁQUINA DE ESTADOS DEFENSIVA EM QUOTE_REQUESTS
CREATE OR REPLACE FUNCTION public.tg_protect_quote_request_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- Não permitir reabrir um pedido que foi cancelado (exceto admin)
  IF OLD.status = 'cancelado' AND NEW.status != 'cancelado' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Não é permitido reabrir uma solicitação de orçamento cancelada.';
    END IF;
  END IF;

  -- Não permitir alterar um pedido que já foi finalizado (exceto admin)
  IF OLD.status = 'finalizado' AND NEW.status != 'finalizado' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Não é permitido alterar o status de uma solicitação de orçamento finalizada.';
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
