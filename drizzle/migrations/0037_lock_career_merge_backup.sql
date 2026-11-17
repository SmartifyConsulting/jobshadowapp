ALTER TABLE public.career_merge_backup_2026 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_merge_backup_2026 FROM anon, authenticated;
GRANT SELECT ON public.career_merge_backup_2026 TO authenticated;
GRANT ALL ON public.career_merge_backup_2026 TO service_role;
CREATE POLICY "admins read career backup" ON public.career_merge_backup_2026 FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));