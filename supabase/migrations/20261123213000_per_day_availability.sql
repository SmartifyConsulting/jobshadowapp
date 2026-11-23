-- Approved per-day availability. Historical bookings remain unchanged.
begin;
create or replace function public.parse_availability_day(_value text) returns date
language plpgsql immutable set search_path=public,pg_temp as $$
begin
 if trim(_value) ~ '^\d{4}-\d{2}-\d{2}$' then return trim(_value)::date; end if;
 if trim(_value) ~ '^\d{1,2}/\d{1,2}/\d{4}$' then
  return make_date(split_part(trim(_value),'/',3)::int,split_part(trim(_value),'/',1)::int,split_part(trim(_value),'/',2)::int);
 end if;
 return null;
exception when others then return null;
end $$;
revoke all on function public.parse_availability_day(text) from public,anon,authenticated;

create table if not exists public.placement_day_times (
 placement_id integer not null references public.companies(id) on delete cascade,
 available_on date not null,
 from_time time without time zone not null,
 to_time time without time zone not null,
 primary key(placement_id,available_on),
 constraint placement_day_time_order check(to_time>from_time)
);
alter table public.placement_day_times enable row level security;
revoke all on public.placement_day_times from public,anon,authenticated;
grant select on public.placement_day_times to authenticated;
grant all on public.placement_day_times to service_role;
create policy placement_day_times_owner_read on public.placement_day_times for select to authenticated
 using(public.has_role(auth.uid(),'admin'));

-- Copy valid legacy hours to their already selected dates. No company or booking is changed.
insert into public.placement_day_times(placement_id,available_on,from_time,to_time)
select id,day,start_at,end_at from (
 select c.id,public.parse_availability_day(d.value) as day,
 case when c.arrival_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then c.arrival_time::time end as start_at,
 case when c.collection_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then c.collection_time::time end as end_at
 from public.companies c cross join lateral unnest(string_to_array(c.dates,',')) d(value)
) existing where day is not null and start_at is not null and end_at>start_at
on conflict(placement_id,available_on) do nothing;

create or replace function public.get_placement_day_times(_id integer)
returns table(available_on date,from_time text,to_time text)
language sql stable security definer set search_path=public,pg_temp as $$
 select distinct public.parse_availability_day(d.value),
 coalesce(left(s.from_time::text,5),case when c.arrival_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then c.arrival_time end),
 coalesce(left(s.to_time::text,5),case when c.collection_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then c.collection_time end)
 from public.companies c cross join lateral unnest(string_to_array(c.dates,',')) d(value)
 left join public.placement_day_times s on s.placement_id=c.id and s.available_on=public.parse_availability_day(d.value)
 where c.id=_id and public.parse_availability_day(d.value) is not null
 and (public.has_role(auth.uid(),'admin') or public.is_mentor_email_match(c.mentor_email)
      or exists(select 1 from public.list_placements() p where p.id=c.id))
 order by 1;
$$;
revoke all on function public.get_placement_day_times(integer) from public;
grant execute on function public.get_placement_day_times(integer) to anon,authenticated;

create or replace function public.save_placement_day_times(_id integer,_slots jsonb,_active boolean,_max_applicants integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies;
begin
 select * into c from public.companies where id=_id for update;
 if not found then raise exception 'Placement not found.'; end if;
 if auth.uid() is null or not(public.has_role(auth.uid(),'admin') or public.is_mentor_email_match(c.mentor_email)) then raise exception 'Not authorized for this placement'; end if;
 if jsonb_typeof(_slots) is distinct from 'array' then raise exception 'Choose the available dates and their times.'; end if;
 if jsonb_array_length(_slots)>1000 then raise exception 'Save no more than 1000 available dates at once.'; end if;
 if _active is null or _max_applicants<0 then raise exception 'Check the placement status and number of places.'; end if;
 if exists(select 1 from jsonb_to_recordset(_slots) x(day text,from_time text,to_time text)
  where public.parse_availability_day(x.day) is null or x.day is distinct from to_char(public.parse_availability_day(x.day),'YYYY-MM-DD')
   or coalesce(x.from_time,'') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(x.to_time,'') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then
  raise exception 'Choose a valid From and To time for every available day.';
 end if;
 if exists(select 1 from jsonb_to_recordset(_slots) x(day text,from_time text,to_time text) where x.to_time::time<=x.from_time::time) then raise exception 'To time must be after From time for each day.'; end if;
 if exists(select 1 from jsonb_to_recordset(_slots) x(day text) group by day having count(*)>1) then raise exception 'Each date can appear only once.'; end if;
 delete from public.placement_day_times where placement_id=_id;
 insert into public.placement_day_times(placement_id,available_on,from_time,to_time)
 select _id,x.day::date,x.from_time::time,x.to_time::time from jsonb_to_recordset(_slots) x(day text,from_time text,to_time text);
 update public.companies set
 dates=coalesce((select string_agg(to_char(available_on,'MM/DD/YYYY'),', ' order by available_on) from public.placement_day_times where placement_id=_id),''),
 arrival_time=coalesce((select left(from_time::text,5) from public.placement_day_times where placement_id=_id order by available_on limit 1),c.arrival_time),
 collection_time=coalesce((select left(to_time::text,5) from public.placement_day_times where placement_id=_id order by available_on limit 1),c.collection_time),
 active=_active,max_applicants=_max_applicants where id=_id;
end $$;
revoke all on function public.save_placement_day_times(integer,jsonb,boolean,integer) from public,anon;
grant execute on function public.save_placement_day_times(integer,jsonb,boolean,integer) to authenticated;

-- Snapshot only new/rescheduled bookings; historical bookings are preserved.
alter table public.bookings add column if not exists arrival_time text,add column if not exists collection_time text;
create or replace function public.snapshot_booking_day_times() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; d date; starts time; ends time;
begin
 if tg_op='UPDATE' and new.company_id is not distinct from old.company_id and new.shadow_date is not distinct from old.shadow_date then
  new.arrival_time:=old.arrival_time;new.collection_time:=old.collection_time;return new;
 end if;
 d:=public.parse_availability_day(new.shadow_date);
 if d is null then raise exception 'Choose a valid booking date.'; end if;
 select * into c from public.companies where id=new.company_id;
 if not coalesce(new.ad_hoc_requested,false) and not exists(select 1 from unnest(string_to_array(c.dates,',')) x(value) where public.parse_availability_day(x.value)=d) then
  raise exception 'This day is not in the host''s available dates.';
 end if;
 select from_time,to_time into starts,ends from public.placement_day_times where placement_id=c.id and available_on=d;
 if starts is null and c.arrival_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then starts:=c.arrival_time::time; end if;
 if ends is null and c.collection_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then ends:=c.collection_time::time; end if;
 if not coalesce(new.ad_hoc_requested,false) and (starts is null or ends is null or ends<=starts) then raise exception 'The host has not set valid times for this day.'; end if;
 new.arrival_time:=left(starts::text,5);new.collection_time:=left(ends::text,5);
 return new;
end $$;
revoke all on function public.snapshot_booking_day_times() from public,anon,authenticated;
create trigger bookings_snapshot_day_times before insert or update of company_id,shadow_date,arrival_time,collection_time on public.bookings
 for each row execute function public.snapshot_booking_day_times();
commit;
