create or replace function public.handle_admin_signup()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare t text := lower(coalesce(new.raw_user_meta_data->>'account_type', 'student'));
begin
  if lower(new.email) in ('info@jobshadow.co.za') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  -- Self-chosen types only; HR Admin is a request an admin must approve.
  insert into public.user_roles(user_id, role)
  values (new.id, case t when 'host' then 'mentor'::app_role when 'school' then 'school'::app_role else 'user'::app_role end)
  on conflict do nothing;
  return new;
end $$;

create or replace function public.normalize_career_name(_n text)
returns text language sql immutable set search_path = public as $$
  select nullif(btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(_n,''),
    '\s*-?\s*Promo Code:.*$', '', 'i'),
    '\s*For High School Scholars Only', '', 'i'),
    '\s*-?\s*\((face-?to-?face|online interview|online|teams interview)\)', '', 'gi'),
    '\s+', ' ', 'g'),
    '[\s-]+$', '', 'g')), '')
$$;

insert into public.career_merge_backup_2026(source, record_id, old_career, old_mode)
  select 'careers', id::text, name, null from public.careers where name is distinct from public.normalize_career_name(name)
  union all select 'companies', id::text, career, mode from public.companies where career is distinct from public.normalize_career_name(career)
  union all select 'bookings', id::text, career, mode from public.bookings where career is distinct from public.normalize_career_name(career)
  union all select 'legacy_applications', id::text, career, null from public.legacy_applications where career is distinct from public.normalize_career_name(career);

update public.companies set mode = case when career ~* 'face-?to-?face' then 'Face-to-Face' else 'Online Interview' end
  where mode is null and career ~* '\((face-?to-?face|online interview|online|teams interview)\)';
update public.bookings set mode = case when career ~* 'face-?to-?face' then 'Face-to-Face' else 'Online Interview' end
  where mode is null and career ~* '\((face-?to-?face|online interview|online|teams interview)\)';

update public.companies set career = public.normalize_career_name(career) where career is distinct from public.normalize_career_name(career);
update public.bookings set career = public.normalize_career_name(career) where career is distinct from public.normalize_career_name(career);
update public.legacy_applications set career = public.normalize_career_name(career) where career is distinct from public.normalize_career_name(career);
update public.role_notify_subscriptions set career = public.normalize_career_name(career) where career is distinct from public.normalize_career_name(career);
update public.vouchers set careers = (select array_agg(distinct public.normalize_career_name(c)) from unnest(careers) c) where careers is not null;

delete from public.careers c using public.careers k
  where c.id > k.id and lower(public.normalize_career_name(c.name)) = lower(public.normalize_career_name(k.name));
update public.careers set name = public.normalize_career_name(name) where name is distinct from public.normalize_career_name(name);