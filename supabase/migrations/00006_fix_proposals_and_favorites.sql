-- Migração 00006: Criação/Correção da tabela favorites e RLS para Aceite de Propostas

-- 1. Criação resiliente da tabela favorites caso não tenha sido executada na migração inicial
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

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;
CREATE POLICY "Users manage own favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Permite que o solicitante do orçamento (cliente) e a empresa proponente possam atualizar o status da proposta
DROP POLICY IF EXISTS "Requester or proposer can update proposal" ON public.quote_proposals;

CREATE POLICY "Requester or proposer can update proposal"
  ON public.quote_proposals FOR UPDATE USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.quote_requests qr 
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.businesses b 
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.quote_requests qr 
      WHERE qr.id = quote_request_id AND qr.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.businesses b 
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- 3. Índices únicos para tabela favorites para garantir integridade e evitar duplicações
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_business 
  ON public.favorites (user_id, business_id) 
  WHERE business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_offer 
  ON public.favorites (user_id, offer_id) 
  WHERE offer_id IS NOT NULL;

-- 4. Grants explícitos de manipulação para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quote_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quote_requests TO authenticated;
