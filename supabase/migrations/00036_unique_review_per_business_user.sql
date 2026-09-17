-- ==============================================================================
-- MIGRATION: 00036_unique_review_per_business_user.sql
-- DESCRIÇÃO: Garante que um mesmo usuário só possa avaliar a mesma empresa uma vez.
-- ==============================================================================

-- 1. Remove duplicatas existentes mantendo apenas a avaliação mais recente de cada usuário por empresa
DELETE FROM public.reviews a
USING public.reviews b
WHERE a.created_at < b.created_at
  AND a.business_id = b.business_id
  AND a.user_id = b.user_id;

-- 2. Adiciona constraint UNIQUE (business_id, user_id) se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.reviews'::regclass 
      AND (
        conname = 'reviews_business_id_user_id_key' 
        OR conname = 'unique_business_user_review'
      )
  ) THEN
    ALTER TABLE public.reviews
    ADD CONSTRAINT unique_business_user_review UNIQUE (business_id, user_id);
  END IF;
END $$;
