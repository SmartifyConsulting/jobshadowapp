-- Approved in-app Mentor and Host application submission and admin review.
BEGIN;

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_type text NOT NULL CHECK (applicant_type IN ('mentor','host')),
  company text NOT NULL CHECK (length(trim(company)) BETWEEN 1 AND 200),
  first_name text NOT NULL CHECK (length(trim(first_name)) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (length(trim(last_name)) BETWEEN 1 AND 100),
  email text NOT NULL,
  phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{6,14}$'),
  message text NOT NULL DEFAULT '' CHECK (length(message) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_applications FROM anon, authenticated;
GRANT SELECT ON public.partner_applications TO authenticated;
GRANT UPDATE (status, reviewed_at) ON public.partner_applications TO authenticated;
GRANT ALL ON public.partner_applications TO service_role;

DROP POLICY IF EXISTS partner_applications_read ON public.partner_applications;
CREATE POLICY partner_applications_read ON public.partner_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS partner_applications_review ON public.partner_applications;
CREATE POLICY partner_applications_review ON public.partner_applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS partner_applications_service ON public.partner_applications;
CREATE POLICY partner_applications_service ON public.partner_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.submit_partner_application(
  _applicant_type text, _company text, _first_name text, _last_name text,
  _phone text, _message text DEFAULT ''
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE result_id uuid; account_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in to submit your application.'; END IF;
  SELECT email INTO account_email FROM auth.users WHERE id = auth.uid();
  IF account_email IS NULL THEN RAISE EXCEPTION 'Account email is required.'; END IF;
  INSERT INTO public.partner_applications
    (user_id, applicant_type, company, first_name, last_name, email, phone, message)
  VALUES
    (auth.uid(), _applicant_type, trim(_company), trim(_first_name), trim(_last_name), account_email, trim(_phone), coalesce(_message,''))
  RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_partner_application(text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(text,text,text,text,text,text) TO authenticated;

COMMIT;
