alter table public.scholar_profiles add column if not exists id_file_path text, add column if not exists photo_path text;
alter table public.bookings add column if not exists indemnity_path text;
create policy "own docs read" on storage.objects for select to authenticated using (bucket_id='scholar-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "own docs insert" on storage.objects for insert to authenticated with check (bucket_id='scholar-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own docs update" on storage.objects for update to authenticated using (bucket_id='scholar-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create or replace function public.set_indemnity_path(_booking uuid, _path text) returns void language sql security definer set search_path=public as $$
  update public.bookings set indemnity_path=_path where id=_booking and user_id=auth.uid() and _path like auth.uid()::text || '/%';
$$;
drop function if exists public.list_placements();
create function public.list_placements()
 returns table(id integer, company text, sector text, career text, location text, availability text, amount numeric, days_per_shadow integer, arrival_time text, collection_time text, description text)
 language sql stable security definer set search_path to 'public'
as $$
  select c.id, c.company, c.sector, c.career, c.location, c.dates, c.amount, c.days_per_shadow, c.arrival_time, c.collection_time, c.description
  from public.companies c where coalesce(c.dates,'') <> '' order by c.sector, c.career
$$;
grant execute on function public.list_placements() to authenticated;
grant execute on function public.set_indemnity_path(uuid,text) to authenticated;