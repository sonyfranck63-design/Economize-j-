-- ==============================================================================
-- EconomizaJa - Migracao 00030: Log de Acoes Administrativas Gerais
-- Idempotente: pode ser executada multiplas vezes sem efeitos colaterais
-- ==============================================================================

-- 1. Tabela de auditoria geral de acoes do admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_action_logs'
  ) THEN
    CREATE TABLE public.admin_action_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      action      TEXT NOT NULL,
      entity_type TEXT NOT NULL,  -- 'business', 'offer', 'quote', 'featured'
      entity_id   UUID,
      entity_name TEXT,           -- Nome amigavel para exibicao no painel
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_admin_action_logs_performed_by ON public.admin_action_logs(performed_by);
    CREATE INDEX idx_admin_action_logs_created_at   ON public.admin_action_logs(created_at DESC);
    CREATE INDEX idx_admin_action_logs_entity       ON public.admin_action_logs(entity_type, entity_id);

    ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

    -- Somente administradores podem ler os logs
    CREATE POLICY admin_read_action_logs ON public.admin_action_logs
      FOR SELECT USING (public.is_admin());

    RAISE NOTICE 'Tabela admin_action_logs criada com sucesso.';
  ELSE
    RAISE NOTICE 'Tabela admin_action_logs ja existe — nada a fazer.';
  END IF;
END;
$$;

-- 2. Funcao RPC para inserir log de acao administrativa (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action       TEXT,
  p_entity_type  TEXT,
  p_entity_id    UUID   DEFAULT NULL,
  p_entity_name  TEXT   DEFAULT NULL,
  p_notes        TEXT   DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem gravar logs de auditoria.';
  END IF;

  INSERT INTO public.admin_action_logs (performed_by, action, entity_type, entity_id, entity_name, notes)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_entity_name, p_notes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, TEXT, TEXT) FROM anon;
GRANT  EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;

-- 3. Funcao RPC para o admin ler os logs (JOIN com profiles para exibir o nome do executor)
CREATE OR REPLACE FUNCTION public.get_admin_action_logs(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id           UUID,
  action       TEXT,
  entity_type  TEXT,
  entity_id    UUID,
  entity_name  TEXT,
  notes        TEXT,
  performed_by UUID,
  performer_name TEXT,
  created_at   TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem consultar logs de auditoria.';
  END IF;

  RETURN QUERY
    SELECT
      l.id,
      l.action,
      l.entity_type,
      l.entity_id,
      l.entity_name,
      l.notes,
      l.performed_by,
      COALESCE(p.full_name, 'Admin') AS performer_name,
      l.created_at
    FROM public.admin_action_logs l
    LEFT JOIN public.profiles p ON p.id = l.performed_by
    ORDER BY l.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.get_admin_action_logs(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_action_logs(INT) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_admin_action_logs(INT) TO authenticated;
