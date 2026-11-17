GRANT INSERT ON public.role_notify_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_notify_subscriptions TO authenticated;
GRANT ALL ON public.role_notify_subscriptions TO service_role;