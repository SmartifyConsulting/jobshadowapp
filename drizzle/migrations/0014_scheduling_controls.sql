create table if not exists public.booking_settings (
  id int primary key default 1,
  min_lead_days int not null default 3,
  blackout_dates text[] not null default '{}',
  constraint single_row check (id = 1)
);
insert into public.booking_settings (id) values (1) on conflict (id) do nothing;
grant select on public.booking_settings to authenticated, anon;
grant all on public.booking_settings to service_role;
alter table public.booking_settings enable row level security;
drop policy if exists "anyone can read booking settings" on public.booking_settings;
create policy "anyone can read booking settings" on public.booking_settings for select to authenticated, anon using (true);
drop policy if exists "admins manage booking settings" on public.booking_settings;
create policy "admins manage booking settings" on public.booking_settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.enforce_booking_scheduling_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.booking_settings; d date;
begin
  select * into s from public.booking_settings where id = 1;
  d := to_date(new.shadow_date, 'MM/DD/YYYY');
  if s.min_lead_days is not null and d < current_date + s.min_lead_days then
    raise exception 'This date is too soon - bookings need at least % days notice.', s.min_lead_days;
  end if;
  if exists (select 1 from unnest(s.blackout_dates) bd where to_date(bd, 'MM/DD/YYYY') = d) then
    raise exception 'Bookings are closed for this date.';
  end if;
  return new;
end $$;

drop trigger if exists bookings_scheduling_rules on public.bookings;
create trigger bookings_scheduling_rules before insert on public.bookings
  for each row execute function public.enforce_booking_scheduling_rules();
