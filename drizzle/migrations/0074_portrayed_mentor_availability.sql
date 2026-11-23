-- The public Careers page should never show a flat, suspicious "5" (or a discouraging "0") for a
-- career with no mentors yet. Each career gets its own fixed but varied portrayed availability
-- (1-3, randomised once, admin-editable), shown publicly only when there is no real availability;
-- the real count stays accurate everywhere admin looks (Mentor Coverage report, Careers screen).
alter table public.careers add column if not exists portrayed_availability int not null default (floor(random() * 3 + 1)::int);
update public.careers set portrayed_availability = floor(random() * 3 + 1)::int where portrayed_availability is null;

drop function if exists public.list_public_careers();
create function public.list_public_careers()
returns table(id int, name text, description text, interpersonal_skills text[], recommended_courses text[], future_outlook text, portrayed_availability int)
language sql stable security definer set search_path = public as $$
  select id, name, description, interpersonal_skills, recommended_courses, future_outlook, portrayed_availability
  from public.careers
  where not archived
  order by name;
$$;
grant execute on function public.list_public_careers() to anon, authenticated;
