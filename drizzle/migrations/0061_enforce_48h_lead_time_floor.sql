-- Guarantees a 48-hour (2-day) minimum booking lead time as a hard floor, regardless of what
-- an admin sets min_lead_days/documentation_deadline_days to in Booking Settings. Previously
-- these admin-editable values could be set below 48 hours with no safety net.
create or replace function public.enforce_booking_scheduling_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.booking_settings; c public.companies; h public.host_settings; d date; effective_min_lead int; week_count int; month_count int; dow int; mo int;
begin
  select * into s from public.booking_settings where id = 1;
  d := to_date(new.shadow_date, 'MM/DD/YYYY');
  effective_min_lead := greatest(coalesce(s.min_lead_days,0), coalesce(s.documentation_deadline_days,0), 2);
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
  mo := extract(month from d);
  if not coalesce(c.allow_weekends, false) and dow in (0,6) then
    raise exception 'This placement does not run on weekends.';
  end if;
  if not coalesce(c.allow_off_season, false) and mo not between s.season_start_month and s.season_end_month then
    raise exception 'This placement only runs between the configured operating season months.';
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
