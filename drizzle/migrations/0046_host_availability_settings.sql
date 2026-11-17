-- Host-specific availability settings (proposal section 2), scoped to what fits this app's
-- existing scheduling model: hosts already set their available dates explicitly per placement
-- (dates field), so "available days/hours" and "recurring availability" aren't built here -
-- they'd need a different scheduling model. Calendar sync (Google/Outlook) is also out of
-- scope - that needs a separate OAuth integration. What's here: pause requests, a cap on
-- shadows per week/month, a buffer between sessions, and personal blackout dates.
create table if not exists public.host_settings (
  mentor_email text primary key,
  paused boolean not null default false,
  max_shadows_per_week int,
  max_shadows_per_month int,
  buffer_days int,
  blackout_dates text[] not null default '{}',
  updated_at timestamptz not null default now()
);
grant all on public.host_settings to service_role;
alter table public.host_settings enable row level security;

-- Returns the current mentor's own settings row (by their auth email), creating a default
-- row on first read so the settings UI always has something to show.
create or replace function public.get_my_host_settings()
returns public.host_settings
language plpgsql security definer set search_path = public as $$
declare my_email text; s public.host_settings;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then raise exception 'Not signed in.'; end if;
  insert into public.host_settings(mentor_email) values (my_email) on conflict (mentor_email) do nothing;
  select * into s from public.host_settings where lower(mentor_email) = lower(my_email);
  return s;
end $$;
grant execute on function public.get_my_host_settings() to authenticated;

create or replace function public.update_my_host_settings(
  _paused boolean, _max_shadows_per_week int, _max_shadows_per_month int, _buffer_days int, _blackout_dates text[]
) returns void
language plpgsql security definer set search_path = public as $$
declare my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then raise exception 'Not signed in.'; end if;
  insert into public.host_settings(mentor_email, paused, max_shadows_per_week, max_shadows_per_month, buffer_days, blackout_dates, updated_at)
  values (my_email, _paused, _max_shadows_per_week, _max_shadows_per_month, _buffer_days, coalesce(_blackout_dates, '{}'), now())
  on conflict (mentor_email) do update set
    paused = excluded.paused, max_shadows_per_week = excluded.max_shadows_per_week,
    max_shadows_per_month = excluded.max_shadows_per_month, buffer_days = excluded.buffer_days,
    blackout_dates = excluded.blackout_dates, updated_at = now();
end $$;
grant execute on function public.update_my_host_settings(boolean,int,int,int,text[]) to authenticated;

-- Extends the booking-time scheduling trigger (0045) with host-level checks: paused, personal
-- blackout dates, buffer between sessions, and weekly/monthly shadow caps.
create or replace function public.enforce_booking_scheduling_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.booking_settings; c public.companies; h public.host_settings; d date; effective_min_lead int; week_count int; month_count int;
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

  select * into c from public.companies where id = new.company_id;
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
