-- Tracks whether an account was created by the person themselves (normal signup) or provisioned
-- silently on their behalf (e.g. from a company's mentor/HR contact details, before they've ever
-- logged in). Defaults true so every existing/future normal signup is unaffected.
alter table public.profiles add column if not exists self_registered boolean not null default true;

-- Re-published to also return self_registered so the admin Users list can show it.
-- A new output column changes the function's return type, which create-or-replace refuses, so drop it first.
drop function if exists public.admin_list_accounts();
create function public.admin_list_accounts()
returns table(
  id uuid, email text, created_at timestamptz,
  roles text[], has_scholar_profile boolean,
  first_name text, last_name text, scholar_first_name text, scholar_last_name text,
  display_name text, avatar_path text, full_name text, contact_no text, school text, id_number text,
  id_file_path text, photo_path text, id_verified boolean,
  has_profile boolean, is_spam boolean, booking_count bigint, self_registered boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  return query
    select
      u.id, u.email, u.created_at,
      coalesce((select array_agg(ur.role::text) from public.user_roles ur where ur.user_id = u.id), array[]::text[]) as roles,
      sp.user_id is not null as has_scholar_profile,
      coalesce(p.first_name, lu.first_name) as first_name,
      coalesce(p.last_name, lu.last_name) as last_name,
      sp.first_name as scholar_first_name,
      sp.last_name as scholar_last_name,
      coalesce(p.display_name, lu.name) as display_name,
      p.avatar_path,
      coalesce(sp.full_name, la.name) as full_name,
      coalesce(sp.contact_no, la.contact) as contact_no,
      coalesce(sp.school, la.school) as school,
      coalesce(sp.id_number, la.id_number) as id_number,
      sp.id_file_path, sp.photo_path, sp.id_verified,
      coalesce(lu.has_profile, false) as has_profile,
      coalesce(lu.is_spam, false) as is_spam,
      (select count(*) from public.bookings bk where bk.user_id = u.id) as booking_count,
      coalesce(p.self_registered, true) as self_registered
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.scholar_profiles sp on sp.user_id = u.id
    left join public.legacy_users lu on lower(trim(lu.email)) = lower(trim(u.email))
    left join lateral (
      select la0.name, la0.contact, la0.school, la0.id_number
      from public.legacy_applications la0
      where lower(trim(la0.email)) = lower(trim(u.email))
      order by la0.id desc limit 1
    ) la on true
    order by coalesce(nullif(trim(coalesce(p.display_name, lu.name)), ''), nullif(trim(coalesce(sp.full_name, la.name)), ''), u.email) nulls last;
end $$;
grant execute on function public.admin_list_accounts() to authenticated;
