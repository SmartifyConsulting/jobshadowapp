-- New required consent checkbox from the prototyping call: parent/guardian attests the
-- submitted information is accurate, separate from the existing T&Cs / POPI consents.
alter table public.scholar_profiles add column if not exists info_accurate boolean not null default false;
