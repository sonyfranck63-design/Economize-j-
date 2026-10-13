-- ==============================================================================
-- MIGRAÇÃO 00045: GATILHOS DE PROTEÇÃO DE EMPRESAS x FUNÇÕES CONFIÁVEIS DO SERVIDOR
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Problema (teste de cenário 2026-10-12): os gatilhos tg_businesses_protect_admin_cols
-- e prevent_sensitive_business_updates bloqueavam qualquer alteração de plano,
-- destaque, status ou nota quando auth.uid() não era admin, INCLUSIVE dentro das
-- funções internas do servidor. Consequências:
--   * assinatura paga no Google Play não ativava o plano (apply_verified_google_play_purchase);
--   * destaque comprado não era ativado (apply_verified_featured_purchase);
--   * dono de empresa não conseguia excluir a conta (delete_own_account);
--   * a nota média não podia ser recalculada após uma avaliação.
--
-- Correção: as funções de gatilho passam a SECURITY INVOKER e liberam a alteração
-- quando ela vem de uma função SECURITY DEFINER do servidor ou do service_role
-- (current_user diferente de anon/authenticated). Alterações diretas pela API
-- (anon/authenticated) continuam protegidas exatamente como antes.
-- Todas as funções SECURITY DEFINER executáveis por usuários foram auditadas: as que
-- alteram campos protegidos exigem administrador ou só afetam a empresa do próprio dono.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.tg_businesses_protect_admin_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Funções internas do servidor / service_role: confiáveis
  IF current_user NOT IN ('anon', 'authenticated') THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.verified := FALSE;
      NEW.featured := FALSE;
      NEW.plan_tier := 'gratis';
      NEW.leads_count := 0;
      NEW.rating := 5.00;
      NEW.review_count := 0;
      NEW.active := TRUE;
      NEW.owner_id := auth.uid();
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    IF NEW.verified IS DISTINCT FROM OLD.verified THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o status de verificação da empresa.';
    END IF;
    IF NEW.featured IS DISTINCT FROM OLD.featured THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o status de destaque da empresa.';
    END IF;
    IF NEW.active IS DISTINCT FROM OLD.active THEN
      RAISE EXCEPTION 'Apenas administradores podem ativar ou inativar a empresa.';
    END IF;
    IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o plano da empresa diretamente.';
    END IF;
    IF NEW.leads_count IS DISTINCT FROM OLD.leads_count THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar o contador de leads.';
    END IF;
    IF NEW.rating IS DISTINCT FROM OLD.rating THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar a nota de avaliação.';
    END IF;
    IF NEW.review_count IS DISTINCT FROM OLD.review_count THEN
      RAISE EXCEPTION 'Apenas o sistema pode alterar a contagem de avaliações.';
    END IF;
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Apenas administradores podem transferir a propriedade da empresa.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_sensitive_business_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Funções internas do servidor / service_role: confiáveis
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

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
$function$;

NOTIFY pgrst, 'reload schema';
