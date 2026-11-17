DROP POLICY IF EXISTS "anyone can subscribe" ON public.role_notify_subscriptions;
CREATE POLICY "anyone can subscribe" ON public.role_notify_subscriptions
FOR INSERT TO anon, authenticated
WITH CHECK (
  notified_at IS NULL
  AND length(btrim(career)) BETWEEN 1 AND 200
  AND length(email) <= 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);