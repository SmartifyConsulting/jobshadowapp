-- Applied, approved company-scoped directory. Company HR contacts can read mentor nomination details from
-- placement rows linked to their own verified sign-in email. No account/ID files.
create or replace function public.list_my_company_mentors()
returns jsonb language sql stable security definer set search_path=public
as $function$
select coalesce(jsonb_agg(jsonb_build_object(
 'id',c.id,'company',c.company,'company_code',c.company_code,
 'mentor_name',c.mentor_name,'mentor_first_name',c.mentor_first_name,'mentor_last_name',c.mentor_last_name,
 'mentor_email',c.mentor_email,'mentor_phone',c.mentor_phone,'mentor_position',c.mentor_position,
 'backup_mentor_name',c.backup_mentor_name,'backup_mentor_first_name',c.backup_mentor_first_name,'backup_mentor_last_name',c.backup_mentor_last_name,
 'backup_mentor_email',c.backup_mentor_email,'backup_mentor_phone',c.backup_mentor_phone,
 'sector',c.sector,'career',c.career,'description',c.description,'location',c.location,
 'address',c.address,'country_code',c.country_code,'website',c.website,
 'dates',c.dates,'availability',c.availability,'arrival_time',c.arrival_time,'collection_time',c.collection_time,
 'arrival_instruction',c.arrival_instruction,'days_per_shadow',c.days_per_shadow,'max_applicants',c.max_applicants,
 'active',c.active,'mode',c.mode,'year',c.year
) order by c.company,c.mentor_name,c.id),'[]'::jsonb)
from public.companies c
where auth.uid() is not null
 and exists (select 1 from auth.users u where u.id=auth.uid()
   and (lower(trim(c.hr_email))=lower(u.email) or lower(trim(c.hr_contact_email))=lower(u.email)));
$function$;
revoke all on function public.list_my_company_mentors() from public,anon;
grant execute on function public.list_my_company_mentors() to authenticated;
