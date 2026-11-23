-- Classify a mentor as an Independent Mentor (IM) or Company Mentor (CM) from data the mentor
-- actually provides, instead of only guessing from email-domain heuristics: does this mentorship
-- happen through a company, and if so, do they report results to an HR admin (and who is that).
alter table public.host_profiles add column if not exists via_company boolean not null default false;
alter table public.host_profiles add column if not exists has_hr_admin boolean not null default false;
alter table public.host_profiles add column if not exists hr_first_name text;
alter table public.host_profiles add column if not exists hr_last_name text;
alter table public.host_profiles add column if not exists hr_email text;

drop function if exists public.update_my_host_profile(text, text[], text, text, text);
create function public.update_my_host_profile(
  _bio text, _specialties text[], _certifications text, _linkedin_url text, _cv_path text,
  _via_company boolean default false, _has_hr_admin boolean default false,
  _hr_first_name text default null, _hr_last_name text default null, _hr_email text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then raise exception 'Not signed in.'; end if;
  if _cv_path is not null and _cv_path not like my_email || '/%' then
    raise exception 'Invalid file path.';
  end if;
  insert into public.host_profiles(mentor_email, bio, specialties, certifications, linkedin_url, cv_path, via_company, has_hr_admin, hr_first_name, hr_last_name, hr_email, updated_at)
  values (my_email, _bio, coalesce(_specialties,'{}'), _certifications, _linkedin_url, _cv_path, coalesce(_via_company,false), coalesce(_via_company,false) and coalesce(_has_hr_admin,false), _hr_first_name, _hr_last_name, _hr_email, now())
  on conflict (mentor_email) do update set
    bio = excluded.bio, specialties = excluded.specialties, certifications = excluded.certifications,
    linkedin_url = excluded.linkedin_url, cv_path = coalesce(excluded.cv_path, host_profiles.cv_path),
    via_company = excluded.via_company, has_hr_admin = excluded.has_hr_admin,
    hr_first_name = excluded.hr_first_name, hr_last_name = excluded.hr_last_name, hr_email = excluded.hr_email,
    updated_at = now();
end $$;
grant execute on function public.update_my_host_profile(text,text[],text,text,text,boolean,boolean,text,text,text) to authenticated;

-- Admin-only read of the classification fields (host_profiles itself has no public/admin select
-- policy - everything else goes through get_my_host_profile, which is scoped to the caller).
create or replace function public.admin_list_mentor_classifications()
returns table(mentor_email text, via_company boolean, has_hr_admin boolean, hr_first_name text, hr_last_name text, hr_email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  return query select mentor_email, via_company, has_hr_admin, hr_first_name, hr_last_name, hr_email from public.host_profiles;
end $$;
grant execute on function public.admin_list_mentor_classifications() to authenticated;
