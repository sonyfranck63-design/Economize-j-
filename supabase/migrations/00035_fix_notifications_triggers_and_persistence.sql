-- ==============================================================================
-- EconomizaJá — Migração 00035: Notificações Automáticas e WhatsApp pós-Aceite
-- ==============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 1: ATUALIZAR secure_leads_view (LIBERA WHATSAPP PARA EMPRESA ACEITA)║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DROP VIEW IF EXISTS public.secure_leads_view;

CREATE VIEW public.secure_leads_view AS
SELECT
  qr.id,
  qr.user_id,
  qr.target_business_id,
  CASE
    -- 1. O próprio solicitante do orçamento
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    -- 2. Administradores do sistema
    WHEN public.is_admin() THEN qr.user_name
    -- 3. Empresa para a qual o orçamento foi diretamente direcionado
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_name
    -- 4. Empresa cuja proposta foi ESCOLHIDA/ACEITA pelo cliente (contato legítimo autorizado)
    WHEN EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      WHERE qp.quote_request_id = qr.id
        AND qp.status = 'escolhida'
        AND public.is_business_owner(qp.business_id, auth.uid())
    ) THEN qr.user_name
    -- Caso contrário, nome protegido
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE
    -- 1. O próprio solicitante do orçamento
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    -- 2. Administradores do sistema
    WHEN public.is_admin() THEN qr.user_phone
    -- 3. Empresa direcionada
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_phone
    -- 4. Empresa com PROPOSTA ESCOLHIDA/ACEITA (WhatsApp real do cliente liberado)
    WHEN EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      WHERE qp.quote_request_id = qr.id
        AND qp.status = 'escolhida'
        AND public.is_business_owner(qp.business_id, auth.uid())
    ) THEN qr.user_phone
    -- Caso contrário, telefone mascarado
    ELSE '****-****'
  END AS user_phone,
  CASE
    -- 1. O próprio solicitante do orçamento
    WHEN auth.uid() = qr.user_id THEN qr.user_email
    -- 2. Administradores do sistema
    WHEN public.is_admin() THEN qr.user_email
    -- 3. Empresa direcionada
    WHEN qr.target_business_id IS NOT NULL
         AND public.is_business_owner(qr.target_business_id, auth.uid())
      THEN qr.user_email
    -- 4. Empresa com proposta aceita
    WHEN EXISTS (
      SELECT 1 FROM public.quote_proposals qp
      WHERE qp.quote_request_id = qr.id
        AND qp.status = 'escolhida'
        AND public.is_business_owner(qp.business_id, auth.uid())
    ) THEN qr.user_email
    -- Caso contrário, email mascarado
    ELSE 'oculto@privado.com'
  END AS user_email,
  qr.city,
  qr.state,
  qr.neighborhood,
  qr.category_id,
  qr.subcategory,
  qr.title,
  qr.description,
  qr.desired_deadline,
  qr.budget_range,
  qr.photos,
  qr.status,
  qr.created_at,
  qr.created_at AS updated_at
FROM public.quote_requests qr
WHERE
  auth.uid() = qr.user_id
  OR public.is_admin()
  -- Empresa direcionada
  OR (
    qr.target_business_id IS NOT NULL
    AND public.is_business_owner(qr.target_business_id, auth.uid())
  )
  -- Empresa que enviou proposta (usando função sem recursão)
  OR public.has_user_proposed(qr.id, auth.uid())
  -- Marketplace regional aberto
  OR (
    qr.target_business_id IS NULL
    AND qr.status IN ('aberto', 'propostas_recebidas')
    AND (
      public.user_has_active_business(auth.uid())
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('business', 'admin')
    )
  );

GRANT SELECT ON public.secure_leads_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_business(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_user_proposed(UUID, UUID) TO anon, authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 2: CRIAÇÃO, POLÍTICAS RLS E ÍNDICES PARA TABELA NOTIFICATIONS       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  link_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

-- 1. Leitura de notificações próprias ou admin
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 2. Inserção autorizada
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 3. Atualização (para marcar como lida)
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 4. Exclusão de notificações
CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications(user_id, created_at DESC);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 3: TRIGGERS AUTOMÁTICOS DE NOTIFICAÇÕES (SECURITY DEFINER)          ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 1. Trigger: Orçamento Direcionado para Empresa
CREATE OR REPLACE FUNCTION public.fn_notify_on_quote_request()
RETURNS TRIGGER AS $$
DECLARE
  v_biz_owner UUID;
  v_biz_name TEXT;
BEGIN
  -- Se o orçamento foi direcionado para uma empresa específica
  IF NEW.target_business_id IS NOT NULL THEN
    SELECT owner_id, name INTO v_biz_owner, v_biz_name
    FROM public.businesses
    WHERE id = NEW.target_business_id;

    IF v_biz_owner IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        read,
        link_action
      ) VALUES (
        v_biz_owner,
        '📋 Novo Orçamento Direcionado!',
        'Um cliente solicitou um orçamento exclusivo para sua empresa: "' || NEW.title || '" em ' || COALESCE(NEW.neighborhood, NEW.city) || '.',
        'quote_directed',
        false,
        'business_portal'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_quote_request ON public.quote_requests;
CREATE TRIGGER tr_notify_quote_request
  AFTER INSERT ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_quote_request();


-- 2. Trigger: Proposta Comercial Enviada pela Empresa -> Notifica o Consumidor
CREATE OR REPLACE FUNCTION public.fn_notify_on_proposal_submitted()
RETURNS TRIGGER AS $$
DECLARE
  v_quote RECORD;
  v_biz_name TEXT;
BEGIN
  -- Obtém dados do orçamento solicitante
  SELECT user_id, title INTO v_quote
  FROM public.quote_requests
  WHERE id = NEW.quote_request_id;

  -- Obtém nome da empresa proponente
  SELECT name INTO v_biz_name
  FROM public.businesses
  WHERE id = NEW.business_id;

  -- Notifica o consumidor que solicitou o orçamento
  IF v_quote.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      read,
      link_action
    ) VALUES (
      v_quote.user_id,
      '💼 Nova Proposta Recebida!',
      'A empresa "' || COALESCE(v_biz_name, 'Parceira') || '" enviou uma proposta de R$ ' || TO_CHAR(NEW.price, 'FM999G999G990D00') || ' para o seu pedido "' || v_quote.title || '".',
      'proposal_received',
      false,
      'quotes'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_proposal_submitted ON public.quote_proposals;
CREATE TRIGGER tr_notify_proposal_submitted
  AFTER INSERT ON public.quote_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_proposal_submitted();


-- 3. Trigger: Proposta Escolhida/Aceita -> Notifica Empresa e Consumidor
CREATE OR REPLACE FUNCTION public.fn_notify_on_proposal_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_quote RECORD;
  v_biz RECORD;
BEGIN
  -- Dispara apenas quando o status transicionar para 'escolhida'
  IF NEW.status = 'escolhida' AND (OLD.status IS NULL OR OLD.status != 'escolhida') THEN
    
    -- Localiza o orçamento
    SELECT user_id, title INTO v_quote
    FROM public.quote_requests
    WHERE id = NEW.quote_request_id;

    -- Localiza o dono e nome da empresa
    SELECT owner_id, name INTO v_biz
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- 1. Notifica a empresa contratada
    IF v_biz.owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        read,
        link_action
      ) VALUES (
        v_biz.owner_id,
        '🎉 Parabéns! Sua Proposta foi Escolhida!',
        'O cliente aceitou sua proposta de R$ ' || TO_CHAR(NEW.price, 'FM999G999G990D00') || ' para o orçamento "' || v_quote.title || '". O WhatsApp do cliente já está liberado para agendamento!',
        'proposal_accepted',
        false,
        'business_portal'
      );
    END IF;

    -- 2. Notifica o consumidor confirmando a contratação
    IF v_quote.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        read,
        link_action
      ) VALUES (
        v_quote.user_id,
        '🎉 Contratação Confirmada!',
        'Você escolheu a proposta de "' || COALESCE(v_biz.name, 'Empresa Parceira') || '". O contato via WhatsApp está disponível para combinar o atendimento.',
        'proposal_chosen',
        false,
        'quotes'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_proposal_accepted ON public.quote_proposals;
CREATE TRIGGER tr_notify_proposal_accepted
  AFTER UPDATE OF status ON public.quote_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_proposal_accepted();


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PARTE 4: RPCs DE GERENCIAMENTO DE NOTIFICAÇÕES                             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Marca notificação individual como lida
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE id = p_notification_id
    AND (user_id = auth.uid() OR public.is_admin());
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

-- Marca todas as notificações do usuário como lidas
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE user_id = auth.uid();
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
