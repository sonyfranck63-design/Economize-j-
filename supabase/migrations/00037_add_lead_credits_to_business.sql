-- ==============================================================================
-- EconomizaJá — Schema de Produção PostgreSQL / Supabase
-- Migração 00037: Adiciona saldo de créditos de leads para parceiros e atualiza RPC
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
