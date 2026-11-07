ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS mentor_name text,
  ADD COLUMN IF NOT EXISTS mentor_phone text,
  ADD COLUMN IF NOT EXISTS mentor_email text,
  ADD COLUMN IF NOT EXISTS mentor_position text,
  ADD COLUMN IF NOT EXISTS hr_contact_name text,
  ADD COLUMN IF NOT EXISTS hr_contact_phone text,
  ADD COLUMN IF NOT EXISTS hr_contact_email text,
  ADD COLUMN IF NOT EXISTS backup_mentor_name text,
  ADD COLUMN IF NOT EXISTS backup_mentor_phone text,
  ADD COLUMN IF NOT EXISTS backup_mentor_email text;
UPDATE public.companies SET hr_contact_name = hr_name, hr_contact_phone = hr_phone, hr_contact_email = hr_email;
CREATE OR REPLACE FUNCTION public.sync_company_hr_contacts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.hr_contact_name := coalesce(NEW.hr_contact_name, NEW.hr_name);
    NEW.hr_contact_phone := coalesce(NEW.hr_contact_phone, NEW.hr_phone);
    NEW.hr_contact_email := coalesce(NEW.hr_contact_email, NEW.hr_email);
  ELSE
    IF NEW.hr_contact_name IS NOT DISTINCT FROM OLD.hr_contact_name AND NEW.hr_name IS DISTINCT FROM OLD.hr_name THEN NEW.hr_contact_name := NEW.hr_name; END IF;
    IF NEW.hr_contact_phone IS NOT DISTINCT FROM OLD.hr_contact_phone AND NEW.hr_phone IS DISTINCT FROM OLD.hr_phone THEN NEW.hr_contact_phone := NEW.hr_phone; END IF;
    IF NEW.hr_contact_email IS NOT DISTINCT FROM OLD.hr_contact_email AND NEW.hr_email IS DISTINCT FROM OLD.hr_email THEN NEW.hr_contact_email := NEW.hr_email; END IF;
  END IF;
  NEW.hr_name := NEW.hr_contact_name;
  NEW.hr_phone := NEW.hr_contact_phone;
  NEW.hr_email := NEW.hr_contact_email;
  RETURN NEW;
END; $$;
CREATE TRIGGER sync_company_hr_contacts BEFORE INSERT OR UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.sync_company_hr_contacts();
CREATE OR REPLACE FUNCTION public.reconcile_deleted_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_email text;
BEGIN
  IF TG_TABLE_SCHEMA = 'auth' THEN
    deleted_email := OLD.email;
  ELSIF TG_TABLE_NAME = 'scholar_profiles' THEN
    SELECT email INTO deleted_email FROM auth.users WHERE id = OLD.user_id;
  ELSE
    deleted_email := OLD.email;
  END IF;
  IF nullif(trim(deleted_email), '') IS NOT NULL THEN
    DELETE FROM public.legacy_applications WHERE lower(trim(email)) = lower(trim(deleted_email));
    IF TG_TABLE_NAME <> 'legacy_users' THEN
      DELETE FROM public.legacy_users WHERE lower(trim(email)) = lower(trim(deleted_email));
    END IF;
  END IF;
  RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION public.reconcile_deleted_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reconcile_deleted_auth_user BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.reconcile_deleted_user();
CREATE TRIGGER reconcile_deleted_scholar_profile BEFORE DELETE ON public.scholar_profiles FOR EACH ROW EXECUTE FUNCTION public.reconcile_deleted_user();
CREATE TRIGGER reconcile_deleted_legacy_user BEFORE DELETE ON public.legacy_users FOR EACH ROW EXECUTE FUNCTION public.reconcile_deleted_user();
CREATE INDEX IF NOT EXISTS legacy_users_normalized_email_idx ON public.legacy_users (lower(trim(email)));
CREATE INDEX IF NOT EXISTS legacy_applications_normalized_email_idx ON public.legacy_applications (lower(trim(email)));