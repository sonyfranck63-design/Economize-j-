-- ==============================================================================
-- MIGRAÇÃO 00016: PRODUCTION HARDENING
-- ==============================================================================

-- 1. PROTEÇÃO DE PROFILES (Evitar exposição de dados pessoais)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated and public" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner and admin" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner and admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- 2. PROTEÇÃO DE OFFERS (Evitar manipulação de métricas e status administrativo)
CREATE OR REPLACE FUNCTION public.tg_offers_protect_cols()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.verified_discount := false;
      NEW.views_count := 0;
      NEW.claims_count := 0;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin() THEN
      NEW.verified_discount := OLD.verified_discount;
      NEW.views_count := OLD.views_count;
      NEW.claims_count := OLD.claims_count;
      NEW.business_id := OLD.business_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS enforce_offers_cols ON public.offers;
CREATE TRIGGER enforce_offers_cols
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.tg_offers_protect_cols();

-- 3. PROTEÇÃO DE REVIEWS (Evitar auto-aprovação de avaliações)
CREATE OR REPLACE FUNCTION public.tg_reviews_protect_cols()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.verified_service := false;
      NEW.reported := false;
      NEW.moderated := false;
      NEW.user_id := auth.uid();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin() THEN
      NEW.verified_service := OLD.verified_service;
      NEW.reported := OLD.reported;
      NEW.moderated := OLD.moderated;
      NEW.user_id := OLD.user_id;
      NEW.business_id := OLD.business_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS enforce_reviews_cols ON public.reviews;
CREATE TRIGGER enforce_reviews_cols
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_reviews_protect_cols();

-- 4. AUTOMAÇÃO E SEGURANÇA DE STATUS EM QUOTE_REQUESTS E QUOTE_PROPOSALS
-- Atualiza orçamentos automaticamente quando uma proposta é enviada
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

-- Atualiza orçamentos e rejeita demais propostas automaticamente quando uma proposta é escolhida
CREATE OR REPLACE FUNCTION public.tg_quote_proposals_after_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'escolhida' AND OLD.status IS DISTINCT FROM 'escolhida' THEN
    -- Update the quote request status
    UPDATE public.quote_requests
    SET status = 'escolhido', updated_at = NOW()
    WHERE id = NEW.quote_request_id AND status != 'escolhido';
    
    -- Reject other proposals
    UPDATE public.quote_proposals
    SET status = 'recusada', updated_at = NOW()
    WHERE quote_request_id = NEW.quote_request_id AND id != NEW.id AND status != 'recusada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_proposal_updated ON public.quote_proposals;
CREATE TRIGGER on_proposal_updated
AFTER UPDATE ON public.quote_proposals
FOR EACH ROW EXECUTE FUNCTION public.tg_quote_proposals_after_update();

-- Recarregar cache de esquema
NOTIFY pgrst, 'reload schema';
