-- Laravel showed "(Face to Face)" / "(Online Interview)" next to every career while browsing.
-- The rebuild only implied this via price (R350 vs R200) and never surfaced it anywhere.
alter table public.companies add column if not exists mode text;
update public.companies set mode = case when amount <= 200 then 'Online Interview' else 'Face-to-Face' end where mode is null;

alter table public.bookings add column if not exists mode text;

drop function if exists public.list_placements();
create function public.list_placements()
 returns table(id integer, company text, sector text, career text, location text, availability text, amount numeric, days_per_shadow integer, arrival_time text, collection_time text, description text, mode text)
 language sql stable security definer set search_path to 'public'
as $$
  select c.id, c.company, c.sector, c.career, c.location, c.dates, c.amount, c.days_per_shadow, c.arrival_time, c.collection_time, c.description, c.mode
  from public.companies c
  where c.active and coalesce(c.dates,'') <> ''
    and exists (
      select 1 from unnest(string_to_array(c.dates, ',')) d
      where to_date(trim(d), 'MM/DD/YYYY') >= current_date
    )
  order by c.sector, c.career
$$;
grant execute on function public.list_placements() to authenticated;

drop function if exists public.list_mentor_placements();
create function public.list_mentor_placements()
returns table(id integer, company text, career text, sector text, location text, dates text, active boolean,
              max_applicants integer, days_per_shadow integer, arrival_time text, collection_time text, description text, mode text)
language sql stable security definer set search_path = public as $$
  select c.id, c.company, c.career, c.sector, c.location, c.dates, c.active, c.max_applicants,
         c.days_per_shadow, c.arrival_time, c.collection_time, c.description, c.mode
  from public.companies c where public.is_mentor_email_match(c.mentor_email) order by c.career
$$;
grant execute on function public.list_mentor_placements() to authenticated;
