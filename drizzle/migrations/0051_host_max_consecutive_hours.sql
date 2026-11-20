-- "Personal available dates and times" already lives per-placement (PlacementCard's dates +
-- arrival/collection time editor), replacing the old host-level blackout-dates picker - so the
-- only genuinely new host-level setting needed here is a cap on consecutive hosting hours.
alter table public.host_settings add column if not exists max_consecutive_hours int;

create or replace function public.update_my_host_settings(
  _paused boolean, _max_shadows_per_week int, _max_shadows_per_month int, _buffer_days int, _blackout_dates text[],
  _max_consecutive_hours int
) returns void
language plpgsql security definer set search_path = public as $$
declare my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then raise exception 'Not signed in.'; end if;
  insert into public.host_settings(mentor_email, paused, max_shadows_per_week, max_shadows_per_month, buffer_days, blackout_dates, max_consecutive_hours, updated_at)
  values (my_email, _paused, _max_shadows_per_week, _max_shadows_per_month, _buffer_days, coalesce(_blackout_dates, '{}'), _max_consecutive_hours, now())
  on conflict (mentor_email) do update set
    paused = excluded.paused, max_shadows_per_week = excluded.max_shadows_per_week,
    max_shadows_per_month = excluded.max_shadows_per_month, buffer_days = excluded.buffer_days,
    blackout_dates = excluded.blackout_dates, max_consecutive_hours = excluded.max_consecutive_hours, updated_at = now();
end $$;
grant execute on function public.update_my_host_settings(boolean,int,int,int,text[],int) to authenticated;
