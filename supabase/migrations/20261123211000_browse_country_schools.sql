-- Allow browsing a country's public school names before entering a search term.
-- Existing country restrictions, authenticated access and 40-result limit remain unchanged.
begin;
create or replace function public.search_country_schools(_country text,_search text default '')
returns table(id uuid,name text,region text,city text,school_type text)
language sql stable security definer set search_path=public
as $function$
 select s.id,s.name,s.region,s.city,s.school_type from public.school_directory s
 where auth.uid() is not null and s.country_code=upper(trim(_country))
 and (nullif(trim(coalesce(_search,'')),'') is null
      or s.name ilike '%' || replace(replace(replace(left(trim(_search),100),'\','\\'),'%','\%'),'_','\_') || '%')
 order by s.name,s.region,s.city,s.id limit 40;
$function$;
revoke all on function public.search_country_schools(text,text) from public,anon;
grant execute on function public.search_country_schools(text,text) to authenticated;
commit;
