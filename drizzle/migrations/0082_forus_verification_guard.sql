BEGIN;
CREATE OR REPLACE FUNCTION public.guard_forus_verification_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR (auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin')) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.kyc_session_id IS NOT NULL OR NEW.kyc_environment IS NOT NULL
       OR NEW.kyc_status IS NOT NULL OR NEW.kyc_verification_url IS NOT NULL
       OR NEW.kyc_updated_at IS NOT NULL OR NEW.kyc_last_checked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Identity verification results can only be recorded by the verification service.';
    END IF;
  ELSIF ROW(NEW.kyc_session_id, NEW.kyc_environment, NEW.kyc_status,
             NEW.kyc_verification_url, NEW.kyc_updated_at, NEW.kyc_last_checked_at)
        IS DISTINCT FROM
        ROW(OLD.kyc_session_id, OLD.kyc_environment, OLD.kyc_status,
             OLD.kyc_verification_url, OLD.kyc_updated_at, OLD.kyc_last_checked_at) THEN
    RAISE EXCEPTION 'Identity verification results can only be recorded by the verification service.';
  END IF;
  RETURN NEW;
END $$;
DO $install$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.bookings'::regclass AND tgname = 'bookings_guard_forus_verification') THEN
    CREATE TRIGGER bookings_guard_forus_verification
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.guard_forus_verification_fields();
  END IF;
END $install$;
COMMIT;
