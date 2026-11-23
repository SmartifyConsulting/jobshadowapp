-- Lets admins retire a redundant/duplicate career without deleting its history, and adds three
-- more AI-drafted guidance fields the public Careers page can show.
alter table public.careers add column if not exists archived boolean not null default false;
alter table public.careers add column if not exists interpersonal_skills text[] not null default '{}';
alter table public.careers add column if not exists recommended_courses text[] not null default '{}';
alter table public.careers add column if not exists future_outlook text;

-- A new output column changes the function's return type, which create-or-replace refuses, so
-- drop it first (see 0069's admin_list_accounts for the same gotcha).
drop function if exists public.list_public_careers();
create function public.list_public_careers()
returns table(id int, name text, description text, interpersonal_skills text[], recommended_courses text[], future_outlook text)
language sql stable security definer set search_path = public as $$
  select id, name, description, interpersonal_skills, recommended_courses, future_outlook
  from public.careers
  where not archived
  order by name;
$$;
grant execute on function public.list_public_careers() to anon, authenticated;
