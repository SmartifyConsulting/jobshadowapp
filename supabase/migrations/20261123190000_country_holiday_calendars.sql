begin;
alter table public.companies add column country_code text not null default 'ZA'
  check (country_code ~ '^[A-Z]{2}$');
create table public.country_holiday_calendars (
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  year integer not null check (year between 2000 and 2200),
  dates date[] not null,
  synced_at timestamptz not null default now(),
  primary key(country_code, year)
);
alter table public.country_holiday_calendars enable row level security;
revoke all on public.country_holiday_calendars from public,anon,authenticated;
grant select on public.country_holiday_calendars to authenticated;
grant all on public.country_holiday_calendars to service_role;
create policy "Admins read holiday sync status" on public.country_holiday_calendars
  for select to authenticated using(public.has_role((select auth.uid()),'admin'));

create function public.get_placement_country(_id integer) returns text
language sql stable security definer set search_path=public,pg_temp as $$
  select country_code from public.companies where id=_id
$$;
revoke all on function public.get_placement_country(integer) from public;
grant execute on function public.get_placement_country(integer) to anon,authenticated;

create function public.get_country_public_holidays(_country_code text) returns text[]
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(array_agg(distinct holiday),array[]::text[]) from (
    select to_char(d,'FMMM/FMDD/YYYY') holiday
    from public.country_holiday_calendars h cross join unnest(h.dates) d where h.country_code=upper(_country_code)
    union
    select ph from public.booking_settings s cross join unnest(s.public_holidays) ph where s.id=1 and upper(_country_code)='ZA'
  ) existing_and_automatic
$$;
revoke all on function public.get_country_public_holidays(text) from public;
grant execute on function public.get_country_public_holidays(text) to anon,authenticated;

create function public.store_country_public_holidays(_country_code text,_year integer,_dates text[]) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if _country_code !~ '^[A-Z]{2}$' or _year not between 2000 and 2200 or _dates is null or cardinality(_dates)>366
    then raise exception 'Invalid holiday calendar'; end if;
  if exists(select 1 from unnest(_dates) d where d is null or d !~ '^\d{4}-\d{2}-\d{2}$' or extract(year from d::date)<>_year)
    then raise exception 'Invalid holiday date'; end if;
  insert into public.country_holiday_calendars(country_code,year,dates) values
    (_country_code,_year,array(select distinct d::date from unnest(_dates) d order by d::date))
  on conflict(country_code,year) do update set dates=excluded.dates,synced_at=now();
end $$;
revoke all on function public.store_country_public_holidays(text,integer,text[]) from public,anon,authenticated;
grant execute on function public.store_country_public_holidays(text,integer,text[]) to service_role;

create function public.set_placement_country(_id integer,_country_code text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from public.companies c where c.id=_id and
    (public.has_role(auth.uid(),'admin') or public.is_mentor_email_match(c.mentor_email)))
    then raise exception 'Not authorized for this placement'; end if;
  if _country_code !~ '^[A-Z]{2}$' then raise exception 'Invalid country'; end if;
  if not exists(select 1 from public.country_holiday_calendars where country_code=_country_code and year=extract(year from current_date)::integer)
    then raise exception 'The holiday calendar is still being updated. Please try again shortly.'; end if;
  update public.companies set country_code=_country_code where id=_id;
end $$;
revoke all on function public.set_placement_country(integer,text) from public,anon;
grant execute on function public.set_placement_country(integer,text) to authenticated;
CREATE OR REPLACE FUNCTION public.enforce_booking_scheduling_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  select * into c from public.companies where id = new.company_id;
  if not exists(select 1 from public.country_holiday_calendars hc where hc.country_code=c.country_code and hc.year=extract(year from d)::integer) then
    raise exception 'The holiday calendar is still being updated. Please try again shortly.';
  end if;
  if exists(select 1 from public.country_holiday_calendars hc where hc.country_code=c.country_code and d=any(hc.dates))
     or (c.country_code='ZA' and exists(select 1 from unnest(s.public_holidays) ph where to_date(ph,'MM/DD/YYYY')=d)) then
    raise exception 'This date is a public holiday in the host country - no bookings are permitted.';
  end if;

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
end $function$;
CREATE OR REPLACE FUNCTION public.list_placements()
 RETURNS TABLE(id integer, company text, sector text, career text, location text, availability text, amount numeric, days_per_shadow integer, arrival_time text, collection_time text, description text, mode text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.id, c.company, c.sector, c.career, c.location, c.dates, c.amount, c.days_per_shadow, c.arrival_time, c.collection_time, c.description, c.mode
  from public.companies c
  where c.active and coalesce(c.dates,'') <> ''
    and exists (
      select 1 from unnest(string_to_array(c.dates, ',')) d
      where to_date(trim(d), 'MM/DD/YYYY') >= current_date
        and exists(select 1 from public.country_holiday_calendars hc where hc.country_code=c.country_code and hc.year=extract(year from to_date(trim(d),'MM/DD/YYYY'))::integer)
        and not exists(select 1 from public.country_holiday_calendars hc where hc.country_code=c.country_code and to_date(trim(d),'MM/DD/YYYY')=any(hc.dates))
        and not (c.country_code='ZA' and exists(select 1 from public.booking_settings s cross join unnest(s.public_holidays) ph where s.id=1 and to_date(ph,'MM/DD/YYYY')=to_date(trim(d),'MM/DD/YYYY')))
    )
  order by c.sector, c.career
$function$;
commit;
