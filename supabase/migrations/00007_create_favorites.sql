-- ==============================================================================
-- MIGRAÇÃO 00007: CRIAÇÃO E POLÍTICAS DE SEGURANÇA DA TABELA FAVORITES
-- ==============================================================================

-- 1. Criação da tabela favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_favorites_target CHECK (
    (business_id IS NOT NULL AND offer_id IS NULL)
    OR
    (business_id IS NULL AND offer_id IS NOT NULL)
  )
);

-- 2. Habilitação de RLS (Row Level Security)
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 3. Política de RLS: cada usuário gerencia SOMENTE seus próprios favoritos
DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;
CREATE POLICY "Users manage own favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Índices únicos para impedir duplicidades
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_business
  ON public.favorites (user_id, business_id)
  WHERE business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_offer
  ON public.favorites (user_id, offer_id)
  WHERE offer_id IS NOT NULL;

-- 5. Concessão de permissões de DML para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
