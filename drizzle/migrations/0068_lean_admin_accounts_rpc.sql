-- The admin Users screen loaded the complete, unfiltered dataset from 7 tables on every single
-- visit (every auth user via paginated Admin API calls, every role, every profile, every scholar
-- profile, every legacy user, every booking, every legacy application), then joined it all in
-- JavaScript. That gets slower every time more data is added and is the main reason the screen is
-- slow to load. Replace it with one indexed SQL join done server-side, and move the full
-- per-user application history (previously embedded for every one of hundreds of accounts) to a
-- separate lazy call made only when an admin actually expands a row.

create or replace function public.admin_list_accounts()
returns table(
  id uuid, email text, created_at timestamptz,
  roles text[], has_scholar_profile boolean,
  first_name text, last_name text, scholar_first_name text, scholar_last_name text,
  display_name text, avatar_path text, full_name text, contact_no text, school text, id_number text,
  id_file_path text, photo_path text, id_verified boolean,
  has_profile boolean, is_spam boolean, booking_count bigint
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
      (select count(*) from public.bookings bk where bk.user_id = u.id) as booking_count
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

-- Per-user application/booking history, fetched only when an admin expands that row (instead of
-- being eagerly loaded and embedded for every account on every page view).
create or replace function public.admin_user_applications(_user_id uuid)
returns table(id text, source text, company text, career text, dates text, paid boolean, indemnity boolean, cancelled boolean)
language plpgsql stable security definer set search_path = public as $$
declare u_email text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  select email into u_email from auth.users where id = _user_id;
  return query
    select bk.id::text, 'Booking'::text, bk.company, bk.career, bk.shadow_date,
      bk.paid_at is not null, bk.indemnity_received, bk.status in ('cancelled', 'canceled')
    from public.bookings bk where bk.user_id = _user_id
    union all
    select la.id::text, 'Application'::text, la.company, la.career, la.dates, la.paid, la.indemnity, la.cancelled
    from public.legacy_applications la
    where u_email is not null and lower(trim(la.email)) = lower(trim(u_email));
end $$;
grant execute on function public.admin_user_applications(uuid) to authenticated;
