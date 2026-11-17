alter table public.profiles add column if not exists first_name text, add column if not exists last_name text;
alter table public.careers add column if not exists description text;

create or replace function public.profiles_compose_display_name()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(btrim(new.first_name),'') <> '' or coalesce(btrim(new.last_name),'') <> '' then
    new.display_name := btrim(coalesce(btrim(new.first_name),'') || ' ' || coalesce(btrim(new.last_name),''));
  end if;
  return new;
end $$;
drop trigger if exists profiles_compose_display_name on public.profiles;
create trigger profiles_compose_display_name before insert or update on public.profiles
  for each row execute function public.profiles_compose_display_name();

create or replace function public.handle_admin_signup()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare t text := lower(coalesce(new.raw_user_meta_data->>'account_type', 'student'));
begin
  if lower(new.email) in ('info@jobshadow.co.za') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  insert into public.user_roles(user_id, role)
  values (new.id, case t when 'host' then 'mentor'::app_role when 'school' then 'school'::app_role else 'user'::app_role end)
  on conflict do nothing;
  if coalesce(new.raw_user_meta_data->>'first_name','') <> '' then
    insert into public.profiles(user_id, first_name, last_name)
    values (new.id, left(new.raw_user_meta_data->>'first_name', 100), left(coalesce(new.raw_user_meta_data->>'last_name',''), 100))
    on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name;
  end if;
  return new;
end $$;