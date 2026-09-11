-- ==============================================================================
-- EconomizaJá — Migração 00020: RPC para Exclusão de Conta pelo Próprio Usuário
-- Atende aos requisitos da Google Play Store e LGPD (Art. 18)
-- ==============================================================================

-- 1. Cria a função RPC delete_own_account com SECURITY DEFINER
-- Permite que o usuário autenticado exclua sua própria conta em auth.users
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obtém o ID do usuário autenticado na requisição JWT
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: faça login para excluir sua conta.';
  END IF;

  -- Remove explicitamente vínculos e dados do usuário (caso não haja CASCADE automático)
  DELETE FROM public.favorites WHERE user_id = v_user_id;
  DELETE FROM public.quote_requests WHERE user_id = v_user_id;
  UPDATE public.businesses SET active = false WHERE owner_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- Remove o usuário da tabela principal de autenticação do Supabase
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Concede permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- 3. Notifica o PostgREST para recarregar o schema cache imediatamente
NOTIFY pgrst, 'reload schema';
