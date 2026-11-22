-- The companies table has one row per career/placement listing, so a single real company (e.g.
-- the same business with several career listings) can have several rows sharing the same
-- hr_email. The BEE/CPD report functions were keyed by a single companies.id, so the admin list
-- showed the same company name repeated once per listing, and emailing a report only covered the
-- bookings tied to that one listing — undercounting the company's actual total. Re-key all three
-- functions by hr_email so a company with several listings reports as a single aggregated entity.

drop function if exists public.list_my_hr_companies();
create function public.list_my_hr_companies()
returns table(hr_email text, company text)
language sql stable security definer set search_path = public as $$
  select hr_email, string_agg(distinct company, ', ' order by company) as company
  from public.companies
  where lower(hr_email) = lower(auth.jwt()->>'email')
  group by hr_email
$$;
grant execute on function public.list_my_hr_companies() to authenticated;

drop function if exists public.get_company_bee_report(int);
create function public.get_company_bee_report(_hr_email text)
returns table(
  scholar_name text, school text, population_group text, gender text, disability text, citizenship text,
  career text, shadow_date text, days_per_shadow int, mentor_name text, status text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (lower(_hr_email) = lower(auth.jwt()->>'email') or public.has_role(auth.uid(),'admin')) then
    raise exception 'Not authorized to view this company''s report.';
  end if;
  return query
    select p.full_name, p.school, p.population_group, p.gender, p.disability, p.citizenship,
      b.career, b.shadow_date, c.days_per_shadow, coalesce(nullif(c.mentor_name,''), 'TBC'), b.status
    from public.bookings b
    join public.companies c on c.id = b.company_id
    join public.scholar_profiles p on p.user_id = b.user_id
    where lower(c.hr_email) = lower(_hr_email) and b.status in ('confirmed','completed')
    order by b.shadow_date;
end $$;
grant execute on function public.get_company_bee_report(text) to authenticated;

drop function if exists public.email_company_bee_report(int);
create function public.email_company_bee_report(_hr_email text)
returns void
language plpgsql security definer set search_path = public as $$
declare company_names text; row record; lines text := ''; count int := 0;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admin only.'; end if;
  if _hr_email is null or _hr_email = '' then raise exception 'This company has no HR contact email on file.'; end if;
  select string_agg(distinct company, ', ' order by company) into company_names from public.companies where lower(hr_email) = lower(_hr_email);
  if company_names is null then raise exception 'Company not found.'; end if;

  for row in
    select p.full_name, p.school, p.population_group, p.gender, p.disability, p.citizenship, b.career, b.shadow_date, b.status
    from public.bookings b
    join public.companies c on c.id = b.company_id
    join public.scholar_profiles p on p.user_id = b.user_id
    where lower(c.hr_email) = lower(_hr_email) and b.status in ('confirmed','completed')
    order by b.shadow_date
  loop
    count := count + 1;
    lines := lines || format(E'%s. %s - %s\n   School: %s | Population group: %s | Gender: %s | Disability: %s | Citizenship: %s\n   Date: %s | Status: %s\n\n',
      count, row.full_name, row.career, coalesce(row.school,'Not recorded'),
      coalesce(nullif(row.population_group,''),'Not declared'), coalesce(nullif(row.gender,''),'Not declared'),
      coalesce(nullif(row.disability,''),'Not declared'), coalesce(nullif(row.citizenship,''),'Not declared'),
      row.shadow_date, row.status);
  end loop;

  insert into public.email_outbox(booking_id,user_id,template,recipient,subject,body) values
  (null, null, 'bee_cpd_report', _hr_email, format('JobShadow: B-BBEE / CPD report for %s', company_names),
   format(E'Attached below is your B-BBEE Skills Development / CSI job-shadowing report for %s, covering %s completed job shadow(s).\n\nThis report lists the information required to claim CPD points and CSI spend credit for hosting Job Shadow scholars. Demographic fields are self-declared by each scholar/parent and shown as "Not declared" where not provided.\n\n%s', company_names, count, lines));
end $$;
grant execute on function public.email_company_bee_report(text) to authenticated;
