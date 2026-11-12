DROP POLICY IF EXISTS "anyone can read booking settings" ON public.booking_settings;
REVOKE SELECT ON public.booking_settings FROM anon;
CREATE POLICY "admins read booking settings" ON public.booking_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));