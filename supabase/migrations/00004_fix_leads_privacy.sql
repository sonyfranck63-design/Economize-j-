-- 1. DROP the insecure policy
DROP POLICY IF EXISTS "Customers can view their own quotes" ON public.quote_requests;

-- 2. CREATE STRICT RLS for quote_requests
-- Only the owner and admins can SELECT from the raw table directly
CREATE POLICY "Customers can view their own quotes"
  ON public.quote_requests FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- 3. CREATE A SECURE VIEW for businesses to see masked leads
CREATE OR REPLACE VIEW public.secure_leads_view AS
SELECT 
  qr.id,
  qr.user_id,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_name
    WHEN public.is_admin() THEN qr.user_name
    ELSE SPLIT_PART(qr.user_name, ' ', 1) || ' (Cliente)'
  END AS user_name,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_phone
    WHEN public.is_admin() THEN qr.user_phone
    ELSE '****-****'
  END AS user_phone,
  CASE 
    WHEN auth.uid() = qr.user_id THEN qr.user_email
    WHEN public.is_admin() THEN qr.user_email
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
  qr.updated_at
FROM public.quote_requests qr
WHERE 
  auth.uid() = qr.user_id 
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.owner_id = auth.uid() 
      AND b.category_id = qr.category_id 
      AND LOWER(b.city) = LOWER(qr.city)
  );

-- We need to grant access to the view
GRANT SELECT ON public.secure_leads_view TO authenticated, anon;
