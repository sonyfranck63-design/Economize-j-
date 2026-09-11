-- ==============================================================================
-- EconomizaJá — Migração 00023: Correção de Segurança RLS e RPC
-- Auditoria de RLS, permissões restritas e correção do fluxo de quote_requests
-- ==============================================================================

-- 1. ADD TARGET_BUSINESS_ID IF NOT EXISTS
ALTER TABLE public.quote_requests 
ADD COLUMN IF NOT EXISTS target_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

-- 2. CENTRALIZED ROLES & SECURITY
-- Define and secure is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email TEXT;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT LOWER(email) INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email = 'matheusfranck2013@gmail.com' THEN
    RETURN TRUE;
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Prevent role escalation in profiles
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Não é permitido alterar sua própria role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_prevent_sensitive_profile_updates ON public.profiles;
CREATE TRIGGER trg_prevent_sensitive_profile_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sensitive_profile_updates();

-- Prevent sensitive business attributes from being updated by standard users
CREATE OR REPLACE FUNCTION public.prevent_sensitive_business_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Não é permitido alterar o dono da empresa.';
    END IF;
    IF NEW.verified IS DISTINCT FROM OLD.verified THEN
      RAISE EXCEPTION 'Não é permitido alterar a verificação.';
    END IF;
    IF NEW.featured IS DISTINCT FROM OLD.featured THEN
      RAISE EXCEPTION 'Não é permitido alterar o destaque.';
    END IF;
    IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
      RAISE EXCEPTION 'Não é permitido alterar o plano.';
    END IF;
    IF NEW.active IS DISTINCT FROM OLD.active THEN
      RAISE EXCEPTION 'Não é permitido alterar o status diretamente.';
    END IF;
    IF NEW.rating IS DISTINCT FROM OLD.rating THEN
      RAISE EXCEPTION 'Não é permitido alterar as avaliações.';
    END IF;
    IF NEW.review_count IS DISTINCT FROM OLD.review_count THEN
      RAISE EXCEPTION 'Não é permitido alterar a contagem de avaliações.';
    END IF;
    IF NEW.leads_count IS DISTINCT FROM OLD.leads_count THEN
      RAISE EXCEPTION 'Não é permitido alterar a contagem de leads.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_prevent_sensitive_business_updates ON public.businesses;
CREATE TRIGGER trg_prevent_sensitive_business_updates
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sensitive_business_updates();


-- 3. RLS FOR QUOTE_REQUESTS
DROP POLICY IF EXISTS "Customers can view their own quotes" ON public.quote_requests;
DROP POLICY IF EXISTS "Customers can insert their own quotes" ON public.quote_requests;
DROP POLICY IF EXISTS "Customers can update their own quotes" ON public.quote_requests;
DROP POLICY IF EXISTS "Customers can delete their own quotes" ON public.quote_requests;

-- Select
CREATE POLICY "quote_requests_select" 
  ON public.quote_requests FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    OR public.is_admin() 
    OR EXISTS ( 
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = auth.uid()
      AND b.active = true
      AND (
        b.id = quote_requests.target_business_id
        OR (
          quote_requests.target_business_id IS NULL
          AND quote_requests.status = 'aberto'
          AND b.category_id = quote_requests.category_id
          AND LOWER(b.city) = LOWER(quote_requests.city)
          AND b.state = quote_requests.state
        )
      )
    )
  );

-- Insert
CREATE POLICY "quote_requests_insert" 
  ON public.quote_requests FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Update
CREATE POLICY "quote_requests_update" 
  ON public.quote_requests FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Delete
CREATE POLICY "quote_requests_delete" 
  ON public.quote_requests FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid() OR public.is_admin());


-- 4. RLS FOR QUOTE_PROPOSALS
DROP POLICY IF EXISTS "Proposals viewable by requester and proposing business" ON public.quote_proposals;
DROP POLICY IF EXISTS "Businesses can submit proposals" ON public.quote_proposals;
DROP POLICY IF EXISTS "Requester or proposer can update proposal" ON public.quote_proposals;
DROP POLICY IF EXISTS "Admins or proposing business can delete proposal" ON public.quote_proposals;
DROP POLICY IF EXISTS "Requester or proposer or admin can delete proposal" ON public.quote_proposals;

-- Select
CREATE POLICY "quote_proposals_select"
  ON public.quote_proposals FOR SELECT
  TO authenticated
  USING (
    public.is_admin() 
    OR 
    EXISTS (
      SELECT 1 FROM public.quote_requests qr 
      WHERE qr.id = quote_proposals.quote_request_id AND qr.user_id = auth.uid()
    ) 
    OR 
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = quote_proposals.business_id AND b.owner_id = auth.uid()
    )
  );

-- Insert
CREATE POLICY "quote_proposals_insert"
  ON public.quote_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      JOIN public.businesses b2 ON b2.id = business_id
      WHERE qr.id = quote_request_id
      AND b2.owner_id = auth.uid()
      AND b2.active = true
      AND (
        qr.target_business_id = b2.id
        OR (
          qr.target_business_id IS NULL
          AND qr.status = 'aberto'
          AND qr.category_id = b2.category_id
          AND LOWER(qr.city) = LOWER(b2.city)
          AND qr.state = b2.state
        )
      )
    )
  );

-- Update
CREATE POLICY "quote_proposals_update"
  ON public.quote_proposals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      JOIN public.businesses b2 ON b2.id = business_id
      WHERE qr.id = quote_request_id
      AND b2.owner_id = auth.uid()
      AND b2.active = true
      AND (
        qr.target_business_id = b2.id
        OR (
          qr.target_business_id IS NULL
          AND qr.status = 'aberto'
          AND qr.category_id = b2.category_id
          AND LOWER(qr.city) = LOWER(b2.city)
          AND qr.state = b2.state
        )
      )
    )
  );

-- Delete
CREATE POLICY "quote_proposals_delete"
  ON public.quote_proposals FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    OR 
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );


-- 5. RPC DELETE_QUOTE_REQUEST
CREATE OR REPLACE FUNCTION public.delete_quote_request(p_quote_request_id UUID)
RETURNS boolean AS $$
DECLARE
  v_user_id UUID;
  v_owner_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para excluir uma solicitação de orçamento.';
  END IF;

  SELECT user_id INTO v_owner_id FROM public.quote_requests WHERE id = p_quote_request_id;
  
  -- Se a solicitação não existir, retornar TRUE ou tratar de forma idempotente.
  IF v_owner_id IS NULL THEN
    RETURN TRUE;
  END IF;

  v_is_admin := public.is_admin();

  -- Permitir exclusão somente se: auth.uid() = quote_requests.user_id OU admin
  IF v_owner_id != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas o solicitante do orçamento ou administradores podem excluir este pedido.';
  END IF;

  -- Excluir dependências seguras caso cascade não pegue (usamos schema bypass por ser SECURITY DEFINER)
  DELETE FROM public.messages WHERE conversation_id IN (
    SELECT id FROM public.conversations WHERE quote_request_id = p_quote_request_id
  );
  DELETE FROM public.conversations WHERE quote_request_id = p_quote_request_id;
  DELETE FROM public.leads WHERE quote_request_id = p_quote_request_id;
  DELETE FROM public.quote_proposals WHERE quote_request_id = p_quote_request_id;
  
  -- Exclui a solicitação (o banco e triggers tratarão o resto)
  DELETE FROM public.quote_requests WHERE id = p_quote_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.delete_quote_request(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_quote_request(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_quote_request(UUID) TO authenticated;

-- Notify postgrest
NOTIFY pgrst, 'reload schema';


-- 6. RLS FOR BUSINESSES
DROP POLICY IF EXISTS "Active businesses are viewable by public" ON public.businesses;
DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
DROP POLICY IF EXISTS "Owners and admins can update business" ON public.businesses;
DROP POLICY IF EXISTS "Owners and admins can delete business" ON public.businesses;
DROP POLICY IF EXISTS "Admins only can delete business" ON public.businesses;

-- Select: anyone can see active businesses. Owners and admins can see all.
CREATE POLICY "businesses_select"
  ON public.businesses FOR SELECT
  USING (active = true OR owner_id = auth.uid() OR public.is_admin());

-- Insert: authenticated user must be the owner
CREATE POLICY "businesses_insert"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Update: owner or admin
CREATE POLICY "businesses_update"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- Delete: owner or admin
CREATE POLICY "businesses_delete"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());
