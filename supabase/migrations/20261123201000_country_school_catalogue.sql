-- Country-scoped school catalogue; no learner identities or contact data.
begin;
create table if not exists public.school_directory (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 250),
 country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 region text not null default '', city text not null default '', source text not null,
 school_type text not null check(school_type in ('Public School','Private School')),
 created_at timestamptz not null default now()
);
create unique index if not exists school_directory_identity on public.school_directory(country_code,lower(name),lower(region),lower(city),school_type);
alter table public.school_directory enable row level security;
create policy "admins manage school catalogue" on public.school_directory for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
revoke all on public.school_directory from anon,authenticated;
grant select,insert,update,delete on public.school_directory to authenticated;
grant all on public.school_directory to service_role;
alter table public.scholar_profiles add column if not exists school_country_code text check(school_country_code is null or school_country_code ~ '^[A-Z]{2}$');
create or replace function public.search_country_schools(_country text,_search text default '')
returns table(id uuid,name text,region text,city text,school_type text)
language sql stable security definer set search_path=public
as $function$
 select s.id,s.name,s.region,s.city,s.school_type from public.school_directory s
 where auth.uid() is not null and s.country_code=upper(trim(_country))
 and length(trim(_search))>=2
 and s.name ilike '%' || replace(replace(replace(left(trim(_search),100),'\','\\'),'%','\%'),'_','\_') || '%'
 order by s.name,s.region,s.city limit 40;
$function$;
revoke all on function public.search_country_schools(text,text) from public,anon;
grant execute on function public.search_country_schools(text,text) to authenticated;
commit;
