-- ==============================================================================
-- MIGRAÇÃO 00044: "SUSPENDER USUÁRIO" ATINGE O AUTOR REAL DO CONTEÚDO
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Problema: em admin_moderate_content, SUSPEND_USER usava content_reports.content_id
-- como se fosse o id do usuário. Para denúncias de avaliação, oferta ou empresa
-- (o caso comum) nenhum usuário era suspenso, mas a denúncia ficava "resolvida".
--
-- Agora o autor é resolvido pelo tipo do conteúdo:
--   review   -> reviews.user_id
--   business -> businesses.owner_id
--   offer    -> businesses.owner_id da empresa da oferta
--   user     -> o próprio content_id
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.resolve_reported_content_author(
  p_content_type TEXT,
  p_content_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_uuid UUID := public.try_cast_uuid(p_content_id);
  v_author UUID;
BEGIN
  IF v_uuid IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_content_type = 'review' THEN
    SELECT user_id INTO v_author FROM public.reviews WHERE id = v_uuid;
  ELSIF p_content_type = 'business' THEN
    SELECT owner_id INTO v_author FROM public.businesses WHERE id = v_uuid;
  ELSIF p_content_type = 'offer' THEN
    SELECT b.owner_id INTO v_author
    FROM public.offers o JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = v_uuid;
  ELSIF p_content_type = 'user' THEN
    v_author := v_uuid;
  END IF;

  RETURN v_author;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.resolve_reported_content_author(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_moderate_content(
  p_report_id UUID,
  p_action TEXT, -- 'DISMISS', 'HIDE_CONTENT', 'SUSPEND_USER'
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report RECORD;
  v_content_uuid UUID;
  v_author UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem moderar conteúdo.';
  END IF;

  SELECT * INTO v_report FROM public.content_reports WHERE id = p_report_id;
  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Denúncia não encontrada.';
  END IF;

  v_content_uuid := public.try_cast_uuid(v_report.content_id);

  IF p_action = 'DISMISS' THEN
    IF v_report.content_type = 'review' AND v_content_uuid IS NOT NULL THEN
      UPDATE public.reviews SET reported = false WHERE id = v_content_uuid;
    END IF;

    UPDATE public.content_reports
    SET status = 'DISMISSED',
        action_taken = COALESCE(p_notes, 'Denúncia descartada após revisão.'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_report_id;

  ELSIF p_action = 'HIDE_CONTENT' THEN
    IF v_content_uuid IS NULL THEN
      RAISE EXCEPTION 'Identificador do conteúdo denunciado é inválido.';
    END IF;

    IF v_report.content_type = 'review' THEN
      UPDATE public.reviews SET active = false, reported = true, moderated = true WHERE id = v_content_uuid;
    ELSIF v_report.content_type = 'offer' THEN
      UPDATE public.offers SET active = false WHERE id = v_content_uuid;
    ELSIF v_report.content_type = 'business' THEN
      UPDATE public.businesses SET active = false, featured = false WHERE id = v_content_uuid;
    ELSE
      RAISE EXCEPTION 'Este tipo de conteúdo não pode ser ocultado; use Suspender Usuário.';
    END IF;

    UPDATE public.content_reports
    SET status = 'ACTION_TAKEN',
        action_taken = COALESCE(p_notes, 'Conteúdo ocultado/desativado por moderação.'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_report_id;

  ELSIF p_action = 'SUSPEND_USER' THEN
    v_author := public.resolve_reported_content_author(v_report.content_type, v_report.content_id);
    IF v_author IS NULL THEN
      RAISE EXCEPTION 'Não foi possível identificar o autor deste conteúdo (ele pode ter sido excluído).';
    END IF;
    IF v_author = auth.uid() THEN
      RAISE EXCEPTION 'Você não pode suspender a própria conta.';
    END IF;

    -- Remove privilégios de parceiro e oculta todo o conteúdo publicado pelo autor
    UPDATE public.profiles SET role = 'customer' WHERE id = v_author AND role <> 'admin';
    UPDATE public.reviews SET active = false, moderated = true WHERE user_id = v_author;
    UPDATE public.businesses SET active = false, featured = false WHERE owner_id = v_author;
    UPDATE public.offers SET active = false
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = v_author);

    -- Resolve também as outras denúncias pendentes do mesmo autor
    UPDATE public.content_reports
    SET status = 'ACTION_TAKEN',
        action_taken = COALESCE(p_notes, 'Usuário suspenso por infração às diretrizes.'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_report_id
       OR (status = 'PENDING' AND public.resolve_reported_content_author(content_type, content_id) = v_author);
  ELSE
    RAISE EXCEPTION 'Ação de moderação inválida: %', p_action;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', p_report_id,
    'status', CASE WHEN p_action = 'DISMISS' THEN 'DISMISSED' ELSE 'ACTION_TAKEN' END,
    'action', p_action,
    'suspended_user_id', v_author
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_moderate_content(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
