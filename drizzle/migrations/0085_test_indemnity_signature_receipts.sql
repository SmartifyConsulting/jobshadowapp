BEGIN;
ALTER TABLE public.scholar_onboarding_signatures ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.scholar_onboarding_signatures DROP CONSTRAINT IF EXISTS scholar_onboarding_signatures_document_key_check;
ALTER TABLE public.scholar_onboarding_signatures ADD CONSTRAINT scholar_onboarding_signatures_document_key_check CHECK(document_key IN ('form_a','form_d_test'));
ALTER TABLE public.scholar_onboarding_signatures ADD CONSTRAINT scholar_onboarding_signatures_document_mode_check CHECK((document_key='form_a' AND is_test=false) OR (document_key='form_d_test' AND is_test=true));
-- Existing Form A signatures remain unchanged and retain is_test=false.
-- Existing grants/RLS remain unchanged: browser clients cannot insert/update receipts.
-- Authenticated server handlers restrict Form D test signing to the fixed test profiles,
-- derive the signer from the session and verify the parent/child relationship.
-- Each receipt saves the exact visible form text/version, signer, server timestamp and request IP.
-- Test signatures do not approve a real booking, consent, payment or KYC verification.
COMMIT;