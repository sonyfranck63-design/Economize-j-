-- ==============================================================================
-- MIGRAÇÃO 00039: RESTRINGE LEITURA DE PROFILES (LGPD / Google Play User Data)
-- EconomizaJá - Produção Real
-- ==============================================================================
-- Problema: a migração 00019 criou a policy "Profiles are viewable by everyone"
-- (USING true), expondo e-mail, telefone e endereço de todos os usuários para
-- qualquer pessoa com a chave anon (que é pública e embutida no app).
--
-- A recursão citada na 00019 não ocorre mais: desde a 00023, public.is_admin()
-- é SECURITY DEFINER e não passa pelo RLS de profiles.
--
-- Impacto no app: o cliente só lê o próprio perfil. Os joins
-- `profiles:user_id ( full_name )` em quote_requests passam a retornar null para
-- terceiros, e o app já usa quote_requests.user_name como fallback.
-- ==============================================================================

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated and public" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner and admin" ON public.profiles;

CREATE POLICY "Profiles are viewable by owner and admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

NOTIFY pgrst, 'reload schema';
