-- ==============================================================================
-- MIGRAÇÃO 00047: CRÉDITOS DE LEADS VOLTAM A LIBERAR PROPOSTAS
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Problema (teste de cenário 2026-10-12): o gatilho tg_validate_quote_proposal_submission
-- repetia o limite de 3 propostas/mês do plano gratuito SEM considerar créditos de
-- leads. Mesmo com saldo, a 4ª proposta era bloqueada: créditos comprados eram inúteis.
--
-- O limite (com consumo de créditos) já é aplicado de forma atômica por
-- submit_quote_proposal, que é o único caminho usado pelo app. Por isso:
--   * o gatilho deixa de aplicar o limite (mantém as checagens de dono e de
--     orçamento direcionado);
--   * INSERT direto em quote_proposals pela API passa a ser exclusivo de admin,
--     para ninguém contornar o limite inserindo propostas sem a RPC.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.tg_validate_quote_proposal_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_biz_owner UUID;
  v_target_biz UUID;
BEGIN
  -- 1. A empresa existe e o usuário atual é o proprietário (ou admin)
  SELECT owner_id INTO v_biz_owner
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF v_biz_owner IS NULL THEN
    RAISE EXCEPTION 'Empresa proponente não encontrada.';
  END IF;

  IF v_biz_owner != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Você só pode enviar propostas através de empresas das quais é proprietário.';
  END IF;

  -- 2. Orçamento direcionado para OUTRA empresa
  SELECT target_business_id INTO v_target_biz
  FROM public.quote_requests
  WHERE id = NEW.quote_request_id;

  IF v_target_biz IS NOT NULL AND v_target_biz != NEW.business_id THEN
    RAISE EXCEPTION 'Este orçamento é exclusivo e foi direcionado a outro parceiro.';
  END IF;

  -- 3. Limite do plano gratuito e consumo de créditos: aplicados em submit_quote_proposal
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "quote_proposals_insert" ON public.quote_proposals;
DROP POLICY IF EXISTS "quote_proposals_insert_admin_only" ON public.quote_proposals;
CREATE POLICY "quote_proposals_insert_admin_only"
  ON public.quote_proposals FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
