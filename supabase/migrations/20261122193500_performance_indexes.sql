CREATE INDEX IF NOT EXISTS idx_email_outbox_queued ON public.email_outbox (created_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_email_outbox_booking ON public.email_outbox (booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_company_date ON public.bookings (company_id, shadow_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON public.bookings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scholar_guardian_email ON public.scholar_profiles (lower(guardian_email));
CREATE INDEX IF NOT EXISTS idx_companies_hr_email ON public.companies (lower(hr_email));
CREATE INDEX IF NOT EXISTS idx_companies_mentor_email ON public.companies (lower(mentor_email));
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id, role);
