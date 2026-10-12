-- ==============================================================================
-- MIGRAÇÃO 00040: CORRIGE O FLUXO DE DENÚNCIA E MODERAÇÃO DE UGC
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Problemas corrigidos (detectados na auditoria de 2026-10-11):
--  1. public.reviews não tinha a coluna "active"; a ação HIDE_CONTENT de
--     admin_moderate_content falhava para avaliações.
--  2. submit_content_report e admin_moderate_content comparavam colunas UUID
--     com TEXT (uuid = text), o que gera erro no Postgres ao denunciar
--     avaliações e ofertas.
--  3. Avaliações ocultadas pela moderação continuavam visíveis ao público.
-- ==============================================================================

-- 1. Colunas de visibilidade/moderação das avaliações (ausentes em produção)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderated BOOLEAN NOT NULL DEFAULT false;

-- 2. Avaliações ocultadas ficam visíveis apenas para o autor e administradores
DROP POLICY IF EXISTS "Reviews viewable by public" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Active reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Active reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (active = true OR user_id = auth.uid() OR public.is_admin());

-- Helper: converte texto em UUID sem lançar erro
CREATE OR REPLACE FUNCTION public.try_cast_uuid(p_value TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN p_value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Denúncia de conteúdo (com conversão segura de UUID)
CREATE OR REPLACE FUNCTION public.submit_content_report(
  p_content_type TEXT,
  p_content_id TEXT,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report_id UUID;
  v_content_uuid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar logado para denunciar conteúdo.';
  END IF;

  IF p_content_type NOT IN ('review', 'business', 'offer', 'quote', 'user') THEN
    RAISE EXCEPTION 'Tipo de conteúdo inválido: %', p_content_type;
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 2 THEN
    RAISE EXCEPTION 'Informe o motivo da denúncia.';
  END IF;

  v_content_uuid := public.try_cast_uuid(p_content_id);
  IF v_content_uuid IS NULL THEN
    RAISE EXCEPTION 'Conteúdo inválido para denúncia.';
  END IF;

  -- Evita denúncias duplicadas pendentes do mesmo usuário para o mesmo conteúdo
  SELECT id INTO v_report_id
  FROM public.content_reports
  WHERE reporter_user_id = auth.uid()
    AND content_type = p_content_type
    AND content_id = p_content_id
    AND status = 'PENDING'
  LIMIT 1;

  IF v_report_id IS NULL THEN
    INSERT INTO public.content_reports (
      reporter_user_id,
      content_type,
      content_id,
      reason,
      details
    ) VALUES (
      auth.uid(),
      p_content_type,
      p_content_id,
      left(p_reason, 200),
      left(p_details, 1000)
    ) RETURNING id INTO v_report_id;
  END IF;

  IF p_content_type = 'review' THEN
    UPDATE public.reviews
    SET reported = true
    WHERE id = v_content_uuid;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'message', 'Denúncia enviada com sucesso para moderação.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_content_report(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. Moderação administrativa (com conversão segura de UUID)
CREATE OR REPLACE FUNCTION public.admin_moderate_content(
  p_report_id UUID,
  p_action TEXT, -- 'DISMISS', 'HIDE_CONTENT', 'SUSPEND_USER'
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report RECORD;
  v_content_uuid UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem moderar conteúdo.';
  END IF;

  SELECT * INTO v_report
  FROM public.content_reports
  WHERE id = p_report_id;

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
      UPDATE public.reviews
      SET active = false, reported = true, moderated = true
      WHERE id = v_content_uuid;
    ELSIF v_report.content_type = 'offer' THEN
      UPDATE public.offers
      SET active = false
      WHERE id = v_content_uuid;
    ELSIF v_report.content_type = 'business' THEN
      UPDATE public.businesses
      SET active = false, featured = false
      WHERE id = v_content_uuid;
    END IF;

    UPDATE public.content_reports
    SET status = 'ACTION_TAKEN',
        action_taken = COALESCE(p_notes, 'Conteúdo ocultado/desativado por moderação.'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_report_id;

  ELSIF p_action = 'SUSPEND_USER' THEN
    IF v_content_uuid IS NULL THEN
      RAISE EXCEPTION 'Identificador do usuário denunciado é inválido.';
    END IF;

    -- Remove privilégios de parceiro e oculta todo o conteúdo publicado pelo usuário
    UPDATE public.profiles SET role = 'customer' WHERE id = v_content_uuid;
    UPDATE public.reviews SET active = false, moderated = true WHERE user_id = v_content_uuid;
    UPDATE public.businesses SET active = false, featured = false WHERE owner_id = v_content_uuid;
    UPDATE public.offers SET active = false
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = v_content_uuid);

    UPDATE public.content_reports
    SET status = 'ACTION_TAKEN',
        action_taken = COALESCE(p_notes, 'Usuário suspenso por infração às diretrizes.'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_report_id;
  ELSE
    RAISE EXCEPTION 'Ação de moderação inválida: %', p_action;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', p_report_id,
    'status', CASE WHEN p_action = 'DISMISS' THEN 'DISMISSED' ELSE 'ACTION_TAKEN' END,
    'action', p_action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_moderate_content(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
