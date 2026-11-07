alter table public.scholar_profiles
  add column if not exists popi_accepted boolean not null default false,
  add column if not exists popi_accepted_at timestamptz;
