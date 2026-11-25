-- The careers table had no sector/category at all, so every admin-added career that wasn't part
-- of the curated role library fell into a single "Other Careers" bucket on the public page with
-- no way to place it properly. Let admin assign each one a real sector.
alter table public.careers add column if not exists field text;

drop function if exists public.list_public_careers();
create function public.list_public_careers()
returns table(id int, name text, description text, field text, interpersonal_skills text[], recommended_courses text[], self_directed_learning text[], future_outlook text, portrayed_availability int, ai_exposure_level text, ai_exposure_note text)
language sql stable security definer set search_path = public as $$
  select id, name, description, field, interpersonal_skills, recommended_courses, self_directed_learning, future_outlook, portrayed_availability, ai_exposure_level, ai_exposure_note
  from public.careers
  where not archived
  order by name;
$$;
grant execute on function public.list_public_careers() to anon, authenticated;
