CREATE OR REPLACE FUNCTION public.admin_list_accounts()
 RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, roles text[], has_scholar_profile boolean, first_name text, last_name text, scholar_first_name text, scholar_last_name text, display_name text, avatar_path text, full_name text, contact_no text, school text, id_number text, id_file_path text, photo_path text, id_verified boolean, has_profile boolean, is_spam boolean, booking_count bigint, self_registered boolean, last_accessed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  return query
    select
      u.id, u.email::text, u.created_at,
      coalesce((select array_agg(ur.role::text) from public.user_roles ur where ur.user_id = u.id), array[]::text[]) as roles,
      sp.user_id is not null as has_scholar_profile,
      coalesce(p.first_name, lu.first_name)::text,
      coalesce(p.last_name, lu.last_name)::text,
      sp.first_name::text,
      sp.last_name::text,
      coalesce(p.display_name, lu.name)::text,
      p.avatar_path::text,
      coalesce(sp.full_name, la.name)::text,
      coalesce(sp.contact_no, la.contact)::text,
      coalesce(sp.school, la.school)::text,
      coalesce(sp.id_number, la.id_number)::text,
      sp.id_file_path::text, sp.photo_path::text, coalesce(sp.id_verified, false),
      coalesce(lu.has_profile, false),
      coalesce(lu.is_spam, false),
      (select count(*) from public.bookings bk where bk.user_id = u.id)::bigint,
      coalesce(p.self_registered, true),
      u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.scholar_profiles sp on sp.user_id = u.id
    left join lateral (
      select lu0.first_name, lu0.last_name, lu0.name, lu0.has_profile, lu0.is_spam
      from public.legacy_users lu0
      where lower(trim(lu0.email)) = lower(trim(u.email::text))
      order by lu0.id desc limit 1
    ) lu on true
    left join lateral (
      select la0.name, la0.contact, la0.school, la0.id_number
      from public.legacy_applications la0
      where lower(trim(la0.email)) = lower(trim(u.email::text))
      order by la0.id desc limit 1
    ) la on true
    order by coalesce(nullif(trim(coalesce(p.display_name, lu.name)), ''), nullif(trim(coalesce(sp.full_name, la.name)), ''), u.email::text) nulls last, u.id;
end $function$;

REVOKE ALL ON FUNCTION public.admin_list_accounts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated, service_role;
