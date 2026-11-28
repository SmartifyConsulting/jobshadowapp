-- A parent signature requires a separate, confirmed, explicitly assigned parent account.
-- Existing approved guardian-access work will replace the email relationship with accepted invitation links.
BEGIN;
CREATE OR REPLACE FUNCTION public.can_sign_as_guardian(_scholar uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public
AS $guard$
 SELECT auth.uid() IS NOT NULL AND auth.uid() <> _scholar
 AND EXISTS (
   SELECT 1 FROM public.scholar_profiles p
   JOIN auth.users u ON u.id = auth.uid()
   JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'parent'
   WHERE p.user_id = _scholar
     AND u.email_confirmed_at IS NOT NULL
     AND nullif(trim(p.guardian_email), '') IS NOT NULL
     AND lower(trim(p.guardian_email)) = lower(trim(u.email))
 );
$guard$;
REVOKE ALL ON FUNCTION public.can_sign_as_guardian(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_sign_as_guardian(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_indemnity_context(_booking uuid)
 RETURNS TABLE(career text, company text, location text, shadow_date text, scholar_name text, school text, viewer_role text, standard_signed boolean, company_signed boolean, needs_company_doc boolean, custom_indemnity_text text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.bookings; c public.companies; p public.scholar_profiles; role text;
begin
  select * into b from public.bookings where id = _booking;
  if not found then raise exception 'Booking not found.'; end if;
  select * into p from public.scholar_profiles where user_id = b.user_id;
  select * into c from public.companies where id = b.company_id;

  if b.user_id = auth.uid() then role := 'scholar';
  elsif public.can_sign_as_guardian(b.user_id) then role := 'guardian';
  else raise exception 'Not authorized to view this booking.';
  end if;

  return query select b.career, c.company, coalesce(c.address, c.location, b.location), b.shadow_date, p.full_name, p.school, role,
    b.indemnity_path is not null, b.company_indemnity_path is not null,
    c.custom_indemnity_text is not null, c.custom_indemnity_text;
end $function$;

CREATE OR REPLACE FUNCTION public.submit_guardian_signature(_booking uuid, _document text, _path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.bookings; p public.scholar_profiles; c public.companies; u_email text; career_desc text; host_name text; is_guardian boolean;
begin
  if _document not in ('standard','company') then raise exception 'Invalid document.'; end if;
  select * into b from public.bookings where id = _booking;
  if not found then raise exception 'Booking not found.'; end if;
  select * into p from public.scholar_profiles where user_id = b.user_id;
  is_guardian := public.can_sign_as_guardian(b.user_id);
  if not is_guardian then raise exception 'Only the linked parent/guardian can sign this document.'; end if;
  if _path is null or split_part(_path, '/', 1) <> auth.uid()::text
     or not exists (select 1 from storage.objects where bucket_id = 'scholar-docs' and name = _path)
  then raise exception 'The signed document must belong to the signed-in parent/guardian.'; end if;
  if b.status <> 'indemnity_required' then raise exception 'This booking is not awaiting a signature.'; end if;

  if _document = 'standard' then
    update public.bookings set indemnity_path = _path, guardian_signature_status = 'signed', guardian_signed_at = now() where id = _booking;
  else
    update public.bookings set company_indemnity_path = _path, guardian_signature_status = 'signed', guardian_signed_at = now() where id = _booking;
  end if;

  select * into b from public.bookings where id = _booking;
  select * into c from public.companies where id = b.company_id;
  if b.indemnity_path is null then return; end if;
  if c.custom_indemnity_text is not null and b.company_indemnity_path is null then return; end if;

  update public.bookings set status = 'confirmed', indemnity_received = true where id = _booking;
  select email into u_email from auth.users where id = b.user_id;
  select description into career_desc from public.careers where name = b.career;
  host_name := coalesce(nullif(c.mentor_name,''), nullif(c.arrival_instruction,''), 'TBC');
  insert into public.email_outbox(booking_id,user_id,template,recipient,subject,body) values
  (_booking,b.user_id,'applicant_thank_you',concat_ws(', ',u_email,p.guardian_email),'JobShadow: your booking is confirmed',
   format(E'Hi %s, your Job Shadow is confirmed.\n\nJob shadow: %s (%s)\n%s\n\nDate & time: %s, %s - %s (%s day/s)\nPlease contact Job Shadow should you wish to change the date of this booking at least 7 days prior.\n\nCompany: %s\nPhysical address: %s\nName of host: %s\nContact number: %s\n\nDon''t forget to take your ID and signed indemnity form.',
     p.full_name, b.career, coalesce(b.mode,c.mode,'Face-to-Face'), coalesce(career_desc, c.description, ''),
     b.shadow_date, coalesce(c.arrival_time,'TBC'), coalesce(c.collection_time,'TBC'), coalesce(c.days_per_shadow,1),
     c.company, coalesce(c.address,c.location), host_name, coalesce(c.mentor_phone,'TBC'))),
  (_booking,b.user_id,'mentor_application_complete',c.mentor_email,'JobShadow: a scholar has booked with you',
   format(E'A scholar has booked to shadow you.\n\nName: %s\nSchool: %s\nCareer interests: %s\nDietary requirements / allergies: %s\n\nJob role: %s (%s)\n%s\n\nDate of Job Shadow: %s\nTimes of Job Shadow: %s - %s\n\nRemember to notify your stand-in if you are unavailable to make this Job Shadow, or alternatively contact your contact manager at least 7 days prior to this date should your stand-in not be available.',
     p.full_name, p.school, coalesce(nullif(p.career_interests,''),'none recorded'), coalesce(nullif(p.dietary,''),'none'),
     b.career, coalesce(b.mode,c.mode,'Face-to-Face'), coalesce(career_desc, c.description, ''),
     b.shadow_date, coalesce(c.arrival_time,'TBC'), coalesce(c.collection_time,'TBC'))),
  (_booking,b.user_id,'hr_application_complete',c.hr_email,'JobShadow: new job shadow placement',
   format(E'%s from %s will job shadow %s (%s) on %s.\n\nID number: %s\nContact number: %s\nDietary requirements / allergies: %s\n\nThe signed indemnity is on file.',
     p.full_name, p.school, host_name, b.career, b.shadow_date,
     coalesce(nullif(p.id_number,''),'not recorded'), coalesce(nullif(p.contact_no,''),'not recorded'), coalesce(nullif(p.dietary,''),'none')));
end $function$;

COMMIT;
