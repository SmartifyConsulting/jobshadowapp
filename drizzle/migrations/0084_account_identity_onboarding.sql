BEGIN;
-- Personal onboarding is independent of any individual booking.
CREATE TABLE IF NOT EXISTS public.scholar_identity_verifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'forus' CHECK (provider='forus'),
  session_id uuid UNIQUE,
  reference text NOT NULL UNIQUE,
  environment text CHECK(environment IN ('test','live')),
  status text NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','creating','creation_failed','in_progress','awaiting_user','approved','declined','review_required','resubmission_required','abandoned','expired')),
  verification_url text CHECK(verification_url IS NULL OR verification_url LIKE 'https://%'),
  consent_version text,
  consent_recorded_at timestamptz,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(verified_at IS NULL OR (status='approved' AND environment='live'))
);
CREATE TABLE IF NOT EXISTS public.scholar_onboarding_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signer_role text NOT NULL CHECK(signer_role IN ('scholar','parent')),
  document_key text NOT NULL DEFAULT 'form_a' CHECK(document_key='form_a'),
  document_version text NOT NULL,
  document_body text NOT NULL,
  document_hash text NOT NULL CHECK(document_hash ~ '^[a-f0-9]{64}$'),
  signature_name text NOT NULL CHECK(length(trim(signature_name)) BETWEEN 1 AND 200),
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  UNIQUE(scholar_user_id, signer_user_id, document_key, document_version),
  CHECK((signer_role='scholar' AND signer_user_id=scholar_user_id) OR (signer_role='parent' AND signer_user_id<>scholar_user_id))
);
ALTER TABLE public.scholar_identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_onboarding_signatures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scholar_identity_verifications, public.scholar_onboarding_signatures FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.scholar_identity_verifications, public.scholar_onboarding_signatures TO authenticated;
GRANT ALL ON public.scholar_identity_verifications, public.scholar_onboarding_signatures TO service_role;
CREATE POLICY scholar_identity_read_own ON public.scholar_identity_verifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY scholar_onboarding_signatures_read_own ON public.scholar_onboarding_signatures FOR SELECT TO authenticated USING(scholar_user_id=auth.uid() OR signer_user_id=auth.uid());
-- All writes go through authenticated server handlers using service_role.
-- Handlers enforce parent linkage and role, exact document snapshot/hash, signer identity,
-- server time/IP, recorded Form A consent before starting KYC, provider response matching,
-- polling/idempotency and test/live separation. No browser-supplied approval is accepted.
-- Existing booking signatures and KYC are preserved. Legacy live approval is reusable only
-- after the server rechecks its existing provider session against that scholar.
CREATE OR REPLACE FUNCTION public.gate_booking_on_mentor_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.scholar_identity_verifications v WHERE v.user_id=NEW.user_id AND v.status='approved' AND v.environment='live' AND v.verified_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Complete your personal identity verification before submitting a booking request.';
  END IF;
  NEW.status := 'pending_approval';
  RETURN NEW;
END;
$$;
COMMIT;
