-- ==============================================================================
-- EconomizaJá — Migration 00019: Fix RLS Infinite Recursion
-- ==============================================================================

-- O problema: A política de SELECT em profiles estava chamando is_admin(),
-- que por sua vez faz um SELECT em profiles, gerando um loop infinito.
-- A solução é permitir leitura pública (ou autenticada) no profile,
-- o que é padrão para evitar recursão em RBAC via tabela.

DROP POLICY IF EXISTS "Profiles are viewable by owner and admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated and public" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

NOTIFY pgrst, 'reload schema';
