-- B-BBEE Skills Development / CSI reporting: a Host Company's HR representative needs to be able
-- to pull a report of the job shadows they've hosted, with the demographic breakdown B-BBEE
-- scorecards require, to claim CPD points / CSI spend credit. These fields are optional and
-- self-declared by the scholar/parent - never required to use the platform.
alter table public.scholar_profiles
  add column if not exists population_group text,
  add column if not exists gender text,
  add column if not exists disability text,
  add column if not exists citizenship text;

-- Companies where the caller is the registered HR contact (an HR rep may be listed on more than
-- one company record).
create or replace function public.list_my_hr_companies()
returns table(id int, company text)
language sql stable security definer set search_path = public as $$
  select id, company from public.companies where lower(hr_email) = lower(auth.jwt()->>'email')
$$;
grant execute on function public.list_my_hr_companies() to authenticated;

-- The report itself: one row per completed/confirmed job shadow hosted by this company, with the
-- scholar's self-declared demographic fields (shown "Not declared" where blank) and the hours
-- actually spent, for the company's own B-BBEE Skills Development / CSI records. Only the
-- company's own matched HR rep or an admin may call this.
create or replace function public.get_company_bee_report(_company int)
returns table(
  scholar_name text, school text, population_group text, gender text, disability text, citizenship text,
  career text, shadow_date text, days_per_shadow int, mentor_name text, status text
)
language plpgsql stable security definer set search_path = public as $$
declare c public.companies;
begin
  select * into c from public.companies where id = _company;
  if not found then raise exception 'Company not found.'; end if;
  if not (lower(c.hr_email) = lower(auth.jwt()->>'email') or public.has_role(auth.uid(),'admin')) then
    raise exception 'Not authorized to view this company''s report.';
  end if;
  return query
    select p.full_name, p.school, p.population_group, p.gender, p.disability, p.citizenship,
      b.career, b.shadow_date, c.days_per_shadow, coalesce(nullif(c.mentor_name,''), 'TBC'), b.status
    from public.bookings b
    join public.scholar_profiles p on p.user_id = b.user_id
    where b.company_id = _company and b.status in ('confirmed','completed')
    order by b.shadow_date;
end $$;
grant execute on function public.get_company_bee_report(int) to authenticated;

-- Admin-only: composes the same report as a plain-text email and queues it to the company's HR
-- contact, from the Admin Reports tab.
create or replace function public.email_company_bee_report(_company int)
returns void
language plpgsql security definer set search_path = public as $$
declare c public.companies; row record; lines text := ''; count int := 0;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admin only.'; end if;
  select * into c from public.companies where id = _company;
  if not found then raise exception 'Company not found.'; end if;
  if c.hr_email is null or c.hr_email = '' then raise exception 'This company has no HR contact email on file.'; end if;

  for row in
    select p.full_name, p.school, p.population_group, p.gender, p.disability, p.citizenship, b.career, b.shadow_date, b.status
    from public.bookings b join public.scholar_profiles p on p.user_id = b.user_id
    where b.company_id = _company and b.status in ('confirmed','completed')
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
  (null, null, 'bee_cpd_report', c.hr_email, format('JobShadow: B-BBEE / CPD report for %s', c.company),
   format(E'Attached below is your B-BBEE Skills Development / CSI job-shadowing report for %s, covering %s completed job shadow(s).\n\nThis report lists the information required to claim CPD points and CSI spend credit for hosting Job Shadow scholars. Demographic fields are self-declared by each scholar/parent and shown as "Not declared" where not provided.\n\n%s', c.company, count, lines));
end $$;
grant execute on function public.email_company_bee_report(int) to authenticated;
