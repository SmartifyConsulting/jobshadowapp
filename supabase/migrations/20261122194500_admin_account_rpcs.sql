ALTER TABLE public.scholar_profiles ADD COLUMN IF NOT EXISTS tc_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.admin_list_accounts()
RETURNS TABLE(id uuid, email text, created_at text, roles text[], has_scholar_profile boolean,
  first_name text, last_name text, scholar_first_name text, scholar_last_name text, display_name text,
  avatar_path text, full_name text, contact_no text, school text, id_number text, id_file_path text,
  photo_path text, id_verified boolean, has_profile boolean, is_spam boolean, booking_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  return query
  select u.id, u.email::text, u.created_at::text,
    coalesce((select array_agg(distinct r.role::text) from public.user_roles r where r.user_id = u.id), '{}'),
    s.user_id is not null,
    coalesce(p.first_name, l.first_name), coalesce(p.last_name, l.last_name),
    s.first_name, s.last_name, coalesce(p.display_name, l.name), p.avatar_path,
    coalesce(nullif(s.full_name,''), la.name), coalesce(nullif(s.contact_no,''), la.contact),
    coalesce(nullif(s.school,''), la.school), coalesce(nullif(s.id_number,''), la.id_number),
    s.id_file_path, s.photo_path, s.id_verified,
    coalesce(l.has_profile, false), coalesce(l.is_spam, false),
    (select count(*)::int from public.bookings b where b.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.scholar_profiles s on s.user_id = u.id
  left join lateral (select * from public.legacy_users x where lower(trim(x.email)) = lower(trim(u.email)) limit 1) l on true
  left join lateral (select * from public.legacy_applications a where lower(trim(a.email)) = lower(trim(u.email)) order by a.id desc limit 1) la on true
  order by u.created_at desc;
end $$;

CREATE OR REPLACE FUNCTION public.admin_user_applications(_user_id uuid)
RETURNS TABLE(id text, source text, company text, career text, dates text, paid boolean, indemnity boolean, cancelled boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare e text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  select lower(trim(email)) into e from auth.users where auth.users.id = _user_id;
  return query
  select b.id::text, 'Booking'::text, b.company, b.career, b.shadow_date, b.paid_at is not null, b.indemnity_received, b.status = 'cancelled'
    from public.bookings b where b.user_id = _user_id
  union all
  select a.id::text, 'Application'::text, a.company, a.career, a.dates, a.paid, a.indemnity, a.cancelled
    from public.legacy_applications a where e is not null and lower(trim(a.email)) = e;
end $$;

REVOKE ALL ON FUNCTION public.admin_list_accounts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_user_applications(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_user_applications(uuid) TO authenticated, service_role;
