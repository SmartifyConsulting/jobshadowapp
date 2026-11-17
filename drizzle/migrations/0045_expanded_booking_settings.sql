-- Adds the "Add now" settings from the booking-settings redesign proposal, and separates
-- "minimum request lead time" from "documentation deadline" (previously conflated as one
-- 3-day minimum). Settings that need a workflow that doesn't exist yet (host-response SLA,
-- waitlist, self-service cancel/reschedule, per-student pending-request cap) are stored here
-- so the admin UI can collect them, but are NOT YET enforced anywhere — see the app code
-- comments for exactly what each one currently does.
alter table public.booking_settings
  add column if not exists max_advance_days int not null default 90,
  add column if not exists documentation_deadline_days int not null default 2,
  add column if not exists cancellation_cutoff_days int not null default 2,
  add column if not exists reschedule_allowed boolean not null default true,
  add column if not exists reschedule_min_notice_days int not null default 7,
  add column if not exists max_pending_requests int not null default 3,
  add column if not exists waitlist_expiry_hours int not null default 24,
  add column if not exists request_expiry_hours int not null default 48;

-- Enforces: minimum lead time, documentation deadline (as a floor under the minimum lead time,
-- per the proposal's "prevent a request if remaining time is insufficient"), maximum advance
-- booking window, and blackout dates. Everything else above is informational only for now.
create or replace function public.enforce_booking_scheduling_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.booking_settings; d date; effective_min_lead int;
begin
  select * into s from public.booking_settings where id = 1;
  d := to_date(new.shadow_date, 'MM/DD/YYYY');
  effective_min_lead := greatest(coalesce(s.min_lead_days,0), coalesce(s.documentation_deadline_days,0));
  if d < current_date + effective_min_lead then
    raise exception 'This date is too soon - bookings need at least % days notice.', effective_min_lead;
  end if;
  if s.max_advance_days is not null and d > current_date + s.max_advance_days then
    raise exception 'This date is too far in advance - bookings can only be made up to % days ahead.', s.max_advance_days;
  end if;
  if exists (select 1 from unnest(s.blackout_dates) bd where to_date(bd, 'MM/DD/YYYY') = d) then
    raise exception 'Bookings are closed for this date.';
  end if;
  return new;
end $$;
