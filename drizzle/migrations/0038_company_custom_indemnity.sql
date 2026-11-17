-- Company-specific indemnity document upload + AI-extracted clause text.
-- companies rows are per job-listing (see 0000_migration.sql), so each listing can carry its own uploaded form.
alter table public.companies add column if not exists custom_indemnity_path text;
alter table public.companies add column if not exists custom_indemnity_text text;

-- Tracks whether the scholar's parent/guardian has signed the company-specific indemnity
-- (in addition to the standard JobShadow indemnity already tracked via bookings.indemnity_path / submit_indemnity()).
alter table public.bookings add column if not exists company_indemnity_path text;
alter table public.bookings add column if not exists company_indemnity_signed_at timestamptz;

-- Admin-only bucket for the company's original uploaded indemnity document (source file, pre-AI-extraction).
insert into storage.buckets (id, name, public, allowed_mime_types) values
  ('company-indemnity', 'company-indemnity', false, array['application/pdf','image/png','image/jpeg','image/jpg',
   'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  on conflict (id) do nothing;

drop policy if exists "admins manage company indemnity" on storage.objects;
create policy "admins manage company indemnity" on storage.objects for all to authenticated
  using (bucket_id = 'company-indemnity' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'company-indemnity' and public.has_role(auth.uid(),'admin'));
