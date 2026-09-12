-- ==============================================================================
-- EconomizaJa - Migracao 00028: Seguranca Extra do Destaque Patrocinado
-- Idempotente: pode ser executada multiplas vezes sem efeitos colaterais
-- ==============================================================================

-- 1. Trigger para validar que featured so pode ser true quando ha destaque ativo pago
CREATE OR REPLACE FUNCTION public.validate_featured_requires_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_has_active_paid_listing BOOLEAN;
BEGIN
  IF NEW.featured = OLD.featured OR NEW.featured = false THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_admin();
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.featured_listings fl
    JOIN public.payments p ON p.provider_payment_id = fl.id::text
    WHERE fl.business_id = NEW.id
      AND fl.active = true
      AND fl.end_date >= CURRENT_DATE
      AND p.status = 'CONFIRMED'
  ) INTO v_has_active_paid_listing;

  IF NOT v_has_active_paid_listing THEN
    RAISE EXCEPTION
      'SEGURANCA: businesses.featured so pode ser ativado mediante pagamento confirmado de destaque patrocinado.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_validate_featured_payment ON public.businesses;
CREATE TRIGGER trg_validate_featured_payment
  BEFORE UPDATE OF featured ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_featured_requires_payment();

-- 2. Audit log de destaques
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'featured_audit_log'
  ) THEN
    CREATE TABLE public.featured_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
      featured_listing_id UUID REFERENCES public.featured_listings(id) ON DELETE SET NULL,
      action TEXT NOT NULL CHECK (action IN ('ACTIVATED', 'DEACTIVATED', 'EXPIRED')),
      performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_featured_audit_business ON public.featured_audit_log(business_id);
    ALTER TABLE public.featured_audit_log ENABLE ROW LEVEL SECURITY;
    CREATE POLICY admin_read_featured_audit ON public.featured_audit_log
      FOR SELECT USING (public.is_admin());
    RAISE NOTICE 'Tabela featured_audit_log criada.';
  END IF;
END;
$$;

-- 3. Atualiza confirm_featured_listing para registrar audit e ser admin-only
CREATE OR REPLACE FUNCTION public.confirm_featured_listing(
  p_listing_id UUID,
  p_provider_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_payment_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem confirmar pagamentos de destaque patrocinado.';
  END IF;

  SELECT * INTO v_listing FROM public.featured_listings WHERE id = p_listing_id FOR UPDATE;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Destaque patrocinado nao encontrado: %', p_listing_id;
  END IF;

  IF v_listing.active = true THEN
    RAISE EXCEPTION 'Este destaque ja esta ativo.';
  END IF;

  UPDATE public.featured_listings SET active = true, updated_at = NOW() WHERE id = p_listing_id;
  UPDATE public.businesses SET featured = true, updated_at = NOW() WHERE id = v_listing.business_id;

  UPDATE public.payments
  SET status = 'CONFIRMED', provider_payment_id = COALESCE(p_provider_transaction_id, provider_payment_id), updated_at = NOW()
  WHERE provider_payment_id = p_listing_id::text AND status = 'PENDING'
  RETURNING id INTO v_payment_id;

  INSERT INTO public.featured_audit_log (business_id, featured_listing_id, action, performed_by, payment_id, notes)
  VALUES (v_listing.business_id, p_listing_id, 'ACTIVATED', auth.uid(), v_payment_id,
    COALESCE('Confirmado via ' || p_provider_transaction_id, 'Confirmado manualmente pelo administrador'));

  RETURN jsonb_build_object(
    'success', true, 'listing_id', p_listing_id,
    'business_id', v_listing.business_id, 'payment_id', v_payment_id,
    'active_until', v_listing.end_date,
    'message', 'Destaque ativado com sucesso apos confirmacao de pagamento.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_featured_listing(UUID, TEXT) TO authenticated;
