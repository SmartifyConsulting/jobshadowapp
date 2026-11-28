-- Track the FORUS-hosted KYC verification session for a scholar's booking (Step 6: Identity
-- Verification). FORUS proxies to Didit's sandbox for test keys. We never store identity
-- documents/numbers here - only FORUS's own session id, status and hosted verification_url.
alter table public.bookings add column if not exists kyc_session_id uuid;
alter table public.bookings add column if not exists kyc_environment text;
alter table public.bookings add column if not exists kyc_status text;
alter table public.bookings add column if not exists kyc_verification_url text;
alter table public.bookings add column if not exists kyc_updated_at timestamptz;
alter table public.bookings add column if not exists kyc_last_checked_at timestamptz;
