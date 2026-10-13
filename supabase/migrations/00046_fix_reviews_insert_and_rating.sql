-- ==============================================================================
-- MIGRAÇÃO 00046: AVALIAÇÕES VOLTAM A FUNCIONAR + NOTA MÉDIA DA EMPRESA
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Problemas encontrados no teste de cenário de 2026-10-12:
--  1. public.reviews só tinha policy de SELECT em produção: nenhum usuário
--     conseguia publicar avaliação (INSERT barrado pelo RLS).
--  2. Nenhum gatilho recalculava businesses.rating / review_count: toda empresa
--     ficava com nota 5,0 e 0 avaliações.
--  3. O app enviava verified_service = true para qualquer avaliação, então todo
--     autor aparecia como "Cliente Verificado".
-- ==============================================================================

-- 0. Uma avaliação por cliente por empresa (a constraint da 00036 não existia em produção)
DELETE FROM public.reviews r
USING public.reviews newer
WHERE r.business_id = newer.business_id
  AND r.user_id = newer.user_id
  AND (r.created_at, r.id) < (newer.created_at, newer.id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_business_user ON public.reviews (business_id, user_id);

-- 1. Policies de escrita
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
CREATE POLICY "Users can create own reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    -- empresa não pode avaliar a si mesma
    AND NOT EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Edição direta fica restrita a administradores (usuários comuns não podem
-- reativar avaliação oculta nem limpar a marcação de denúncia)
DROP POLICY IF EXISTS "Users can edit own reviews; admins can moderate" ON public.reviews;
DROP POLICY IF EXISTS "Admins can moderate reviews" ON public.reviews;
CREATE POLICY "Admins can moderate reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Campos controlados pelo servidor na criação
CREATE OR REPLACE FUNCTION public.tg_reviews_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.active := true;
  NEW.reported := false;
  NEW.moderated := false;
  -- "Cliente Verificado" somente se o autor contratou a empresa por um orçamento aceito
  NEW.verified_service := EXISTS (
    SELECT 1
    FROM public.quote_proposals qp
    JOIN public.quote_requests qr ON qr.id = qp.quote_request_id
    WHERE qp.business_id = NEW.business_id
      AND qr.user_id = NEW.user_id
      AND qp.status = 'escolhida'
  );
  NEW.comment := left(trim(COALESCE(NEW.comment, '')), 1000);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_reviews_before_insert ON public.reviews;
CREATE TRIGGER trg_reviews_before_insert
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_reviews_before_insert();

-- 3. Nota média e contagem (somente avaliações ativas)
CREATE OR REPLACE FUNCTION public.refresh_business_rating(p_business_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.businesses b
  SET review_count = s.cnt,
      rating = CASE WHEN s.cnt > 0 THEN s.avg_rating ELSE 5.00 END
  FROM (
    SELECT count(*)::int AS cnt, round(avg(rating)::numeric, 1) AS avg_rating
    FROM public.reviews
    WHERE business_id = p_business_id AND active = true
  ) s
  WHERE b.id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.refresh_business_rating(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_reviews_refresh_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_business_rating(NEW.business_id);
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.business_id IS DISTINCT FROM NEW.business_id) THEN
    PERFORM public.refresh_business_rating(OLD.business_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_reviews_refresh_rating ON public.reviews;
CREATE TRIGGER trg_reviews_refresh_rating
  AFTER INSERT OR UPDATE OF rating, active, business_id OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_reviews_refresh_rating();

-- Recalcula as notas existentes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.businesses LOOP
    PERFORM public.refresh_business_rating(r.id);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
