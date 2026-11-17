-- School signups no longer auto-grant the 'school' role; like HR Admin, they land as a plain
-- user until an admin approves the role from the Users screen.
create or replace function public.handle_admin_signup()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare t text := lower(coalesce(new.raw_user_meta_data->>'account_type', 'student'));
begin
  if lower(new.email) in ('info@jobshadow.co.za') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  -- Self-chosen types only; HR Admin and School are requests an admin must approve.
  insert into public.user_roles(user_id, role)
  values (new.id, case t when 'host' then 'mentor'::app_role else 'user'::app_role end)
  on conflict do nothing;
  if coalesce(new.raw_user_meta_data->>'first_name','') <> '' then
    insert into public.profiles(user_id, first_name, last_name)
    values (new.id, left(new.raw_user_meta_data->>'first_name', 100), left(coalesce(new.raw_user_meta_data->>'last_name',''), 100))
    on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name;
  end if;
  return new;
end $$;
