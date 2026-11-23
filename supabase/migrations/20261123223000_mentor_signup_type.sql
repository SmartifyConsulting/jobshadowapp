-- Approved: seed a new mentor's profile from their sign-up selection. Existing profiles stay unchanged.
begin;
create or replace function public.get_my_host_profile()
returns public.host_profiles language plpgsql security definer set search_path=public,pg_temp as $$
declare my_email text; mentor_choice text; p public.host_profiles;
begin
 select email,raw_user_meta_data->>'mentoring_type' into my_email,mentor_choice from auth.users where id=auth.uid();
 if my_email is null then raise exception 'Not signed in.'; end if;
 insert into public.host_profiles(mentor_email,via_company) values(my_email,coalesce(mentor_choice='company',false)) on conflict(mentor_email) do nothing;
 select * into p from public.host_profiles where lower(mentor_email)=lower(my_email);
 return p;
end $$;
commit;
