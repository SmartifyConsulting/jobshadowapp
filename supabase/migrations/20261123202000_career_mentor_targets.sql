begin;
alter table public.careers add column if not exists mentor_target_count integer not null default ((1+floor(random()*3))::integer) check(mentor_target_count between 0 and 10000);
alter table public.careers add column if not exists mentor_available_count integer check(mentor_available_count between 0 and 10000);
alter table public.careers add constraint career_reported_availability_within_target check(mentor_available_count is null or mentor_available_count<=mentor_target_count);
create or replace function public.get_public_career_availability()
returns table(name text,mentor_target_count integer,mentor_available_count integer)
language sql stable security definer set search_path=public
as $function$
 with live as (
 select regexp_replace(lower(p.career),'[^a-z0-9]','','g') career_key,
 count(distinct (regexp_replace(lower(c.company),'[^a-z0-9]','','g'),coalesce(nullif(lower(trim(c.mentor_name)),''),nullif(lower(trim(c.mentor_email)),''))))::integer available
 from public.list_placements() p join public.companies c on c.id=p.id
 where (nullif(trim(c.mentor_name),'') is not null or nullif(trim(c.mentor_email),'') is not null)
 and case when p.arrival_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' and p.collection_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 then p.collection_time::time>p.arrival_time::time else false end
 group by regexp_replace(lower(p.career),'[^a-z0-9]','','g')
 )
 select c.name,greatest(c.mentor_target_count,coalesce(c.mentor_available_count,l.available,0)),coalesce(c.mentor_available_count,l.available,0)
 from public.careers c left join live l on l.career_key=regexp_replace(lower(c.name),'[^a-z0-9]','','g');
$function$;
revoke all on function public.get_public_career_availability() from public;
grant execute on function public.get_public_career_availability() to anon,authenticated;
commit;
