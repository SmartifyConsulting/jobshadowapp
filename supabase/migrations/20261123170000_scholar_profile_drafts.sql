-- Preview only: save incomplete profile steps without marking the profile complete.
begin;
create table public.scholar_profile_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 32768),
  step text not null default 'personal'
    check (step in ('personal', 'school', 'diversity', 'guardian')),
  updated_at timestamptz not null default now()
);
alter table public.scholar_profile_drafts enable row level security;
revoke all on public.scholar_profile_drafts from public, anon;
grant select, insert, update, delete on public.scholar_profile_drafts to authenticated;
create policy "Users read own profile draft" on public.scholar_profile_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own profile draft" on public.scholar_profile_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own profile draft" on public.scholar_profile_drafts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete own profile draft" on public.scholar_profile_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);
comment on table public.scholar_profile_drafts is
  'Private incomplete scholar profile. Next saves each step; final validation writes scholar_profiles and removes the draft. No email or role grants.';
commit;
