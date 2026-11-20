-- South African public holidays (admin-maintained, since dates shift year to year), blocked
-- out everywhere dates are picked/booked, alongside the existing weekend exclusion.
alter table public.booking_settings add column if not exists public_holidays text[] not null default '{}';

-- Readable by anyone picking a date (admin, host, or the booking trigger), without exposing the
-- rest of booking_settings (which stays admin-only per existing RLS).
create or replace function public.get_public_holidays()
returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select public_holidays from public.booking_settings where id = 1), '{}')
$$;
grant execute on function public.get_public_holidays() to authenticated, anon;

create or replace function public.enforce_booking_scheduling_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.booking_settings; c public.companies; h public.host_settings; d date; effective_min_lead int; week_count int; month_count int; dow int;
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
  if exists (select 1 from unnest(s.public_holidays) ph where to_date(ph, 'MM/DD/YYYY') = d) then
    raise exception 'This date is a public holiday - no bookings are permitted.';
  end if;

  select * into c from public.companies where id = new.company_id;

  dow := extract(dow from d);
  if not coalesce(c.allow_weekends, false) and dow in (0,6) then
    raise exception 'This placement does not run on weekends.';
  end if;
  if not coalesce(c.allow_off_season, false) and extract(month from d) not between 2 and 10 then
    raise exception 'This placement only runs between February and October.';
  end if;

  if c.mentor_email is not null then
    select * into h from public.host_settings where lower(mentor_email) = lower(c.mentor_email);
    if found then
      if h.paused then
        raise exception 'This host is temporarily not accepting new bookings.';
      end if;
      if exists (select 1 from unnest(h.blackout_dates) bd where to_date(bd, 'MM/DD/YYYY') = d) then
        raise exception 'This host is unavailable on this date.';
      end if;
      if h.buffer_days is not null and h.buffer_days > 0 and exists (
        select 1 from public.bookings b join public.companies bc on bc.id = b.company_id
        where lower(bc.mentor_email) = lower(c.mentor_email) and b.status <> 'cancelled'
          and to_date(b.shadow_date,'MM/DD/YYYY') <> d
          and abs(to_date(b.shadow_date,'MM/DD/YYYY') - d) < h.buffer_days
      ) then
        raise exception 'This host needs at least % day(s) between job shadows.', h.buffer_days;
      end if;
      if h.max_shadows_per_week is not null then
        select count(*) into week_count from public.bookings b join public.companies bc on bc.id = b.company_id
          where lower(bc.mentor_email) = lower(c.mentor_email) and b.status <> 'cancelled'
            and date_trunc('week', to_date(b.shadow_date,'MM/DD/YYYY')) = date_trunc('week', d);
        if week_count >= h.max_shadows_per_week then
          raise exception 'This host already has the maximum number of job shadows for that week.';
        end if;
      end if;
      if h.max_shadows_per_month is not null then
        select count(*) into month_count from public.bookings b join public.companies bc on bc.id = b.company_id
          where lower(bc.mentor_email) = lower(c.mentor_email) and b.status <> 'cancelled'
            and date_trunc('month', to_date(b.shadow_date,'MM/DD/YYYY')) = date_trunc('month', d);
        if month_count >= h.max_shadows_per_month then
          raise exception 'This host already has the maximum number of job shadows for that month.';
        end if;
      end if;
    end if;
  end if;

  return new;
end $$;

-- Seed with South Africa's 2026 public holidays (admin can edit via Booking Settings).
update public.booking_settings set public_holidays = array[
  '1/1/2026',   -- New Year's Day
  '3/21/2026',  -- Human Rights Day
  '4/3/2026',   -- Good Friday
  '4/6/2026',   -- Family Day
  '4/27/2026',  -- Freedom Day
  '4/28/2026',  -- Freedom Day observed (falls on a Sunday)
  '5/1/2026',   -- Workers' Day
  '6/16/2026',  -- Youth Day
  '8/9/2026',   -- National Women's Day
  '9/24/2026',  -- Heritage Day
  '12/16/2026', -- Day of Reconciliation
  '12/25/2026', -- Christmas Day
  '12/26/2026'  -- Day of Goodwill
] where id = 1 and (public_holidays is null or public_holidays = '{}');
