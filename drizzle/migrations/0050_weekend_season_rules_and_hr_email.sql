-- Per-listing overrides for the two default scheduling rules from the audit: weekends are
-- excluded by default, and the primary Feb-Oct operating window is enforced by default,
-- unless a specific job listing explicitly allows otherwise.
alter table public.companies
  add column if not exists allow_weekends boolean not null default false,
  add column if not exists allow_off_season boolean not null default false;

-- Enforces both rules at booking time (on top of the UI date-picker already restricting
-- selectable dates), so a bad date can't slip through either path.
create or replace function public.enforce_booking_scheduling_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.booking_settings; c public.companies; h public.host_settings; d date; effective_min_lead int; week_count int; month_count int; dow int;
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

  dow := extract(dow from d);
  if not coalesce(c.allow_weekends, false) and dow in (0,6) then
    raise exception 'This placement does not run on weekends.';
  end if;
  if not coalesce(c.allow_off_season, false) and extract(month from d) not between 2 and 10 then
    raise exception 'This placement only runs between February and October.';
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

-- HR email was missing ID number, phone and dietary requirements - add them.
create or replace function public.submit_indemnity(_booking uuid)
returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings; p public.scholar_profiles; c public.companies; u_email text; career_desc text;
begin
  select * into b from public.bookings where id=_booking and user_id=auth.uid();
  if not found then raise exception 'Booking not found'; end if;
  if b.status <> 'indemnity_required' then return; end if;
  if b.indemnity_path is null then return; end if;
  select * into c from public.companies where id=b.company_id;
  if c.custom_indemnity_text is not null and b.company_indemnity_path is null then return; end if;

  update public.bookings set status='confirmed', indemnity_received=true where id=_booking;
  select * into p from public.scholar_profiles where user_id=b.user_id;
  select email into u_email from auth.users where id=b.user_id;
  select description into career_desc from public.careers where name=b.career;
  insert into public.email_outbox(booking_id,user_id,template,recipient,subject,body) values
  (_booking,b.user_id,'applicant_thank_you',concat_ws(', ',u_email,p.guardian_email),'JobShadow: your booking is confirmed',
   format(E'Hi %s, your Job Shadow is confirmed.\n\nJob shadow: %s (%s)\n%s\n\nDate & time: %s, %s - %s (%s day/s)\nPlease contact Job Shadow should you wish to change the date of this booking at least 7 days prior.\n\nCompany: %s\nPhysical address: %s\nName of host: %s\nContact number: %s\n\nDon''t forget to take your ID and signed indemnity form.',
     p.full_name, b.career, coalesce(b.mode,c.mode,'Face-to-Face'), coalesce(career_desc, c.description, ''),
     b.shadow_date, coalesce(c.arrival_time,'TBC'), coalesce(c.collection_time,'TBC'), coalesce(c.days_per_shadow,1),
     c.company, coalesce(c.address,c.location), coalesce(c.mentor_name,'TBC'), coalesce(c.mentor_phone,'TBC'))),
  (_booking,b.user_id,'mentor_application_complete',c.mentor_email,'JobShadow: a scholar has booked with you',
   format(E'A scholar has booked to shadow you.\n\nName: %s\nSchool: %s\nCareer interests: %s\nDietary requirements / allergies: %s\n\nJob role: %s (%s)\n%s\n\nDate of Job Shadow: %s\nTimes of Job Shadow: %s - %s\n\nRemember to notify your stand-in if you are unavailable to make this Job Shadow, or alternatively contact your contact manager at least 7 days prior to this date should your stand-in not be available.',
     p.full_name, p.school, coalesce(nullif(p.career_interests,''),'none recorded'), coalesce(nullif(p.dietary,''),'none'),
     b.career, coalesce(b.mode,c.mode,'Face-to-Face'), coalesce(career_desc, c.description, ''),
     b.shadow_date, coalesce(c.arrival_time,'TBC'), coalesce(c.collection_time,'TBC'))),
  (_booking,b.user_id,'hr_application_complete',c.hr_email,'JobShadow: new job shadow placement',
   format(E'%s from %s will job shadow %s (%s) on %s.\n\nID number: %s\nContact number: %s\nDietary requirements / allergies: %s\n\nThe signed indemnity is on file.',
     p.full_name, p.school, coalesce(c.mentor_name,'your mentor'), b.career, b.shadow_date,
     coalesce(nullif(p.id_number,''),'not recorded'), coalesce(nullif(p.contact_no,''),'not recorded'), coalesce(nullif(p.dietary,''),'none')));
end $$;
grant execute on function public.submit_indemnity(uuid) to authenticated;

-- Lets the Host Portal's date picker respect the same weekend/off-season rule (read-only to
-- hosts - only admins can change the allow flags themselves).
drop function if exists public.list_mentor_placements();
create function public.list_mentor_placements()
returns table(id integer, company text, career text, sector text, location text, dates text, active boolean,
              max_applicants integer, days_per_shadow integer, arrival_time text, collection_time text, description text, mode text,
              allow_weekends boolean, allow_off_season boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.company, c.career, c.sector, c.location, c.dates, c.active, c.max_applicants,
         c.days_per_shadow, c.arrival_time, c.collection_time, c.description, c.mode, c.allow_weekends, c.allow_off_season
  from public.companies c where public.is_mentor_email_match(c.mentor_email) order by c.career
$$;
grant execute on function public.list_mentor_placements() to authenticated;
