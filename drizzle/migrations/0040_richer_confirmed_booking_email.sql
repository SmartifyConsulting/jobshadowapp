-- The confirmed-booking email was missing content the original (legacy) system sent:
-- the career description, duration, a reschedule note, and the host's name — it only had
-- company/address/date/mentor. Bring it in line with that reference email's content.
create or replace function public.submit_indemnity(_booking uuid)
returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings; p public.scholar_profiles; c public.companies; u_email text; career_desc text;
begin
  select * into b from public.bookings where id=_booking and user_id=auth.uid();
  if not found then raise exception 'Booking not found'; end if;
  if b.status <> 'indemnity_required' then return; end if;
  update public.bookings set status='confirmed', indemnity_received=true where id=_booking;
  select * into p from public.scholar_profiles where user_id=b.user_id;
  select * into c from public.companies where id=b.company_id;
  select email into u_email from auth.users where id=b.user_id;
  select description into career_desc from public.careers where name=b.career;
  insert into public.email_outbox(booking_id,user_id,template,recipient,subject,body) values
  (_booking,b.user_id,'applicant_thank_you',concat_ws(', ',u_email,p.guardian_email),'JobShadow: your booking is confirmed',
   format(E'Hi %s, your Job Shadow is confirmed.\n\nJob shadow: %s (%s)\n%s\n\nDate & time: %s, %s - %s (%s day/s)\nPlease contact Job Shadow should you wish to change the date of this booking at least 7 days prior.\n\nCompany: %s\nPhysical address: %s\nName of host: %s\nContact number: %s\n\nDon''t forget to take your ID and signed indemnity form.',
     p.full_name, b.career, coalesce(b.mode,c.mode,'Face-to-Face'), coalesce(career_desc, c.description, ''),
     b.shadow_date, coalesce(c.arrival_time,'TBC'), coalesce(c.collection_time,'TBC'), coalesce(c.days_per_shadow,1),
     c.company, coalesce(c.address,c.location), coalesce(c.mentor_name,'TBC'), coalesce(c.mentor_phone,'TBC'))),
  (_booking,b.user_id,'mentor_application_complete',c.mentor_email,'JobShadow: a scholar has booked with you',
   format('A scholar has booked to shadow you as %s on %s. Scholar: %s, %s. Dietary: %s.', b.career, b.shadow_date, p.full_name, p.school, coalesce(nullif(p.dietary,''),'none'))),
  (_booking,b.user_id,'hr_application_complete',c.hr_email,'JobShadow: new job shadow placement',
   format('%s from %s will job shadow %s (%s) on %s. The signed indemnity is on file.', p.full_name, p.school, coalesce(c.mentor_name,'your mentor'), b.career, b.shadow_date));
end $$;
grant execute on function public.submit_indemnity(uuid) to authenticated;
