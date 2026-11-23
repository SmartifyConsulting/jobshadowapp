-- Formal tertiary courses may not actually prepare a scholar for a given career, so alongside
-- recommended_courses we also need concrete things a scholar can explore on their own right now
-- (free resources, communities, self-study) - a stop-gap until real course matching (Plasticity)
-- is integrated. Also adds an AI-exposure indicator: how much of this role is currently being
-- done by AI, so scholars go in with realistic expectations of how the job is changing.
alter table public.careers add column if not exists self_directed_learning text[] not null default '{}';
alter table public.careers add column if not exists ai_exposure_level text check (ai_exposure_level in ('low', 'medium', 'high'));
alter table public.careers add column if not exists ai_exposure_note text;

drop function if exists public.list_public_careers();
create function public.list_public_careers()
returns table(id int, name text, description text, interpersonal_skills text[], recommended_courses text[], self_directed_learning text[], future_outlook text, portrayed_availability int, ai_exposure_level text, ai_exposure_note text)
language sql stable security definer set search_path = public as $$
  select id, name, description, interpersonal_skills, recommended_courses, self_directed_learning, future_outlook, portrayed_availability, ai_exposure_level, ai_exposure_note
  from public.careers
  where not archived
  order by name;
$$;
grant execute on function public.list_public_careers() to anon, authenticated;
