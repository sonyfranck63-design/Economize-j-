-- ==============================================================================
-- EconomizaJá — Migration 00014: Fix Proposal Acceptance & Auth Resilience
-- ==============================================================================
-- This migration updates the trigger on quote_proposals to be more robust
-- and ensures the master admin bypasses all status modification restrictions.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.tg_quote_proposals_protect()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_requester BOOLEAN;
  v_is_proposer BOOLEAN;
  v_user_email TEXT;
BEGIN
  -- 1. Identify roles for the current transaction
  -- First, check if it's the master admin directly for maximum resilience
  SELECT LOWER(email) INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email = 'matheusfranck2013@gmail.com' THEN
    v_is_admin := TRUE;
  ELSE
    v_is_admin := public.is_admin();
  END IF;

  -- 2. Structural Locks (Freeze FKs)
  -- Even admins shouldn't move proposals between requests or businesses usually, 
  -- but we allow it for admins just in case of data correction.
  IF NOT v_is_admin THEN
    IF NEW.quote_request_id IS DISTINCT FROM OLD.quote_request_id THEN
      RAISE EXCEPTION 'Não é permitido transferir a proposta para outro orçamento.';
    END IF;
    
    IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
      RAISE EXCEPTION 'Não é permitido transferir a proposta para outra empresa.';
    END IF;
  END IF;

  -- 3. Identify requester and proposer
  SELECT EXISTS (
    SELECT 1 FROM public.quote_requests 
    WHERE id = OLD.quote_request_id AND user_id = auth.uid()
  ) INTO v_is_requester;

  SELECT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = OLD.business_id AND owner_id = auth.uid()
  ) INTO v_is_proposer;

  -- 4. Status Modification Rules
  -- Only the customer (requester) or admin can change the status (e.g. accept/reject).
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (v_is_admin OR v_is_requester) THEN
      RAISE EXCEPTION 'Apenas o cliente solicitante ou administradores podem alterar o status da proposta.';
    END IF;
  END IF;

  -- 5. Content Modification Rules
  -- Only the business (proposer) or admin can change price, deadline, or description.
  IF (NEW.price IS DISTINCT FROM OLD.price) OR 
     (NEW.deadline_text IS DISTINCT FROM OLD.deadline_text) OR 
     (NEW.description IS DISTINCT FROM OLD.description) THEN
    IF NOT (v_is_admin OR v_is_proposer) THEN
      RAISE EXCEPTION 'Apenas a empresa proponente ou administradores podem alterar os valores e descrição da proposta.';
    END IF;
  END IF;

  -- Update timestamp automatically
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

NOTIFY pgrst, 'reload schema';
