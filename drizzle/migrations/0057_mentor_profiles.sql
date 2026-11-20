-- Mentor profiles, modelled on the "crew member profile" pattern from dialacrew-cyprus (skills,
-- experience, portfolio links) but scoped to what Job Shadow needs: credibility signals a
-- student/HR can see BEFORE a mentor's identity is revealed, not a full public portfolio.
create table if not exists public.host_profiles (
  mentor_email text primary key,
  bio text,
  specialties text[] not null default '{}',
  certifications text,
  linkedin_url text,
  cv_path text,
  updated_at timestamptz not null default now()
);
grant all on public.host_profiles to service_role;
alter table public.host_profiles enable row level security;

create or replace function public.get_my_host_profile()
returns public.host_profiles
language plpgsql security definer set search_path = public as $$
declare my_email text; p public.host_profiles;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then raise exception 'Not signed in.'; end if;
  insert into public.host_profiles(mentor_email) values (my_email) on conflict (mentor_email) do nothing;
  select * into p from public.host_profiles where lower(mentor_email) = lower(my_email);
  return p;
end $$;
grant execute on function public.get_my_host_profile() to authenticated;

create or replace function public.update_my_host_profile(_bio text, _specialties text[], _certifications text, _linkedin_url text, _cv_path text)
returns void
language plpgsql security definer set search_path = public as $$
declare my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then raise exception 'Not signed in.'; end if;
  if _cv_path is not null and _cv_path not like my_email || '/%' then
    raise exception 'Invalid file path.';
  end if;
  insert into public.host_profiles(mentor_email, bio, specialties, certifications, linkedin_url, cv_path, updated_at)
  values (my_email, _bio, coalesce(_specialties,'{}'), _certifications, _linkedin_url, _cv_path, now())
  on conflict (mentor_email) do update set
    bio = excluded.bio, specialties = excluded.specialties, certifications = excluded.certifications,
    linkedin_url = excluded.linkedin_url, cv_path = coalesce(excluded.cv_path, host_profiles.cv_path), updated_at = now();
end $$;
grant execute on function public.update_my_host_profile(text,text[],text,text,text) to authenticated;

-- Anonymized profile for a specific placement (company row), shown to a scholar before a host's
-- identity is revealed: bio/specialties/certifications only - no name, email or phone.
create or replace function public.get_host_profile_for_placement(_company_id int)
returns table(bio text, specialties text[], certifications text)
language sql stable security definer set search_path = public as $$
  select p.bio, p.specialties, p.certifications
  from public.companies c join public.host_profiles p on lower(p.mentor_email) = lower(c.mentor_email)
  where c.id = _company_id
$$;
grant execute on function public.get_host_profile_for_placement(int) to authenticated, anon;

-- Admin-only bucket for mentor CV uploads (not public, not sent to students).
insert into storage.buckets (id, name, public, allowed_mime_types) values
  ('host-docs', 'host-docs', false, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  on conflict (id) do nothing;

drop policy if exists "hosts manage own docs" on storage.objects;
create policy "hosts manage own docs" on storage.objects for all to authenticated
  using (bucket_id = 'host-docs' and (storage.foldername(name))[1] = (select email from auth.users where id = auth.uid()))
  with check (bucket_id = 'host-docs' and (storage.foldername(name))[1] = (select email from auth.users where id = auth.uid()));

drop policy if exists "admins read host docs" on storage.objects;
create policy "admins read host docs" on storage.objects for select to authenticated
  using (bucket_id = 'host-docs' and public.has_role(auth.uid(),'admin'));
