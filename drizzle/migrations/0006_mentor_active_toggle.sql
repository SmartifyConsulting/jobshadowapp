alter table public.companies add column if not exists active boolean not null default true;

drop function if exists public.list_placements();
create function public.list_placements()
 returns table(id integer, company text, sector text, career text, location text, availability text, amount numeric, days_per_shadow integer, arrival_time text, collection_time text, description text)
 language sql stable security definer set search_path to 'public'
as $$
  select c.id, c.company, c.sector, c.career, c.location, c.dates, c.amount, c.days_per_shadow, c.arrival_time, c.collection_time, c.description
  from public.companies c where coalesce(c.dates,'') <> '' and c.active order by c.sector, c.career
$$;
grant execute on function public.list_placements() to authenticated;
