-- ==============================================================================
-- EconomizaJá — Fix Quote Proposals RLS Migration
-- ==============================================================================

ALTER TABLE public.quote_proposals ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. FUNCTIONS & TRIGGERS FOR STRUCTURAL PROTECTION
-- ------------------------------------------------------------------------------
-- We use a BEFORE UPDATE trigger to strictly lock structural columns and 
-- enforce business rules that RLS cannot easily handle at the column level.

CREATE OR REPLACE FUNCTION public.tg_quote_proposals_protect()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_requester BOOLEAN;
  v_is_proposer BOOLEAN;
BEGIN
  -- 1. Structural Locks (Freeze FKs)
  IF NEW.quote_request_id IS DISTINCT FROM OLD.quote_request_id THEN
    RAISE EXCEPTION 'Não é permitido transferir a proposta para outro orçamento.';
  END IF;
  
  IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
    RAISE EXCEPTION 'Não é permitido transferir a proposta para outra empresa.';
  END IF;

  -- 2. Identify roles for the current transaction
  v_is_admin := public.is_admin();
  
  SELECT EXISTS (
    SELECT 1 FROM public.quote_requests 
    WHERE id = OLD.quote_request_id AND user_id = auth.uid()
  ) INTO v_is_requester;

  SELECT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = OLD.business_id AND owner_id = auth.uid()
  ) INTO v_is_proposer;

  -- 3. Status Modification Rules
  -- Only the customer (requester) or admin can change the status (e.g. accept/reject).
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (v_is_admin OR v_is_requester) THEN
      RAISE EXCEPTION 'Apenas o cliente solicitante ou administradores podem alterar o status da proposta.';
    END IF;
  END IF;

  -- 4. Content Modification Rules
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_quote_proposals_protect ON public.quote_proposals;
CREATE TRIGGER tr_quote_proposals_protect
BEFORE UPDATE ON public.quote_proposals
FOR EACH ROW EXECUTE FUNCTION public.tg_quote_proposals_protect();

-- ------------------------------------------------------------------------------
-- 2. RLS POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Admins, the customer who requested the quote, or the business who made the proposal
DROP POLICY IF EXISTS "Proposals viewable by requester and proposing business" ON public.quote_proposals;
CREATE POLICY "Proposals viewable by requester and proposing business"
  ON public.quote_proposals FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.quote_requests qr WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- INSERT: Only the owner of the business can submit a proposal on its behalf
DROP POLICY IF EXISTS "Businesses can submit proposals" ON public.quote_proposals;
CREATE POLICY "Businesses can submit proposals"
  ON public.quote_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- UPDATE: Both requester (to accept) and proposer (to edit price) can access the row.
-- Column-level rules and FK locks are enforced by the trigger above.
DROP POLICY IF EXISTS "Requester or proposer can update proposal" ON public.quote_proposals;
CREATE POLICY "Requester or proposer can update proposal"
  ON public.quote_proposals FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.quote_requests qr WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.quote_requests qr WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- DELETE: Only admins or the proposing business can delete a proposal
DROP POLICY IF EXISTS "Admins or proposing business can delete proposal" ON public.quote_proposals;
CREATE POLICY "Admins or proposing business can delete proposal"
  ON public.quote_proposals FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 3. GRANTS
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_proposals TO authenticated;

NOTIFY pgrst, 'reload schema';
