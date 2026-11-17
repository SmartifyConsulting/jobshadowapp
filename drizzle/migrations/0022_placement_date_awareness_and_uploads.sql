-- A placement should only be bookable if at least one of its listed dates is still in the future.
-- Previously this only checked that `dates` was non-empty, so expired-only placements were
-- selectable right up until step 5, where the scholar then hit "no available dates."
drop function if exists public.list_placements();
create function public.list_placements()
 returns table(id integer, company text, sector text, career text, location text, availability text, amount numeric, days_per_shadow integer, arrival_time text, collection_time text, description text)
 language sql stable security definer set search_path to 'public'
as $$
  select c.id, c.company, c.sector, c.career, c.location, c.dates, c.amount, c.days_per_shadow, c.arrival_time, c.collection_time, c.description
  from public.companies c
  where c.active and coalesce(c.dates,'') <> ''
    and exists (
      select 1 from unnest(string_to_array(c.dates, ',')) d
      where to_date(trim(d), 'MM/DD/YYYY') >= current_date
    )
  order by c.sector, c.career
$$;
grant execute on function public.list_placements() to authenticated;

-- scholar-docs previously rejected PNG uploads (bucket-level MIME allow-list).
update storage.buckets set allowed_mime_types = array['image/png','image/jpeg','image/jpg','image/webp','application/pdf']
where id = 'scholar-docs';
