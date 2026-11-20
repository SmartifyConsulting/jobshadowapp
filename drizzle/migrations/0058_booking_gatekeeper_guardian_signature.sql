-- Booking Gatekeeper: a scholar can browse careers and request a date, but a booking can only be
-- confirmed once the linked parent/guardian's OWN authenticated signature is on file - no longer
-- a self-attestation the scholar can complete on the parent's behalf.
alter type public.app_role add value if not exists 'parent';

alter table public.bookings
  add column if not exists guardian_signature_status text not null default 'pending' check (guardian_signature_status in ('pending','signed')),
  add column if not exists guardian_signed_at timestamptz;

-- A guardian is recognised purely by email match against the scholar's own guardian_email - no
-- separate "link" table needed, consistent with how mentor/HR email matching already works here.
drop policy if exists "guardian can read linked profile" on public.scholar_profiles;
create policy "guardian can read linked profile" on public.scholar_profiles for select to authenticated
  using (lower(guardian_email) = lower(auth.jwt()->>'email'));

drop policy if exists "guardian can read linked bookings" on public.bookings;
create policy "guardian can read linked bookings" on public.bookings for select to authenticated
  using (exists (select 1 from public.scholar_profiles p where p.user_id = bookings.user_id and lower(p.guardian_email) = lower(auth.jwt()->>'email')));

-- Lists the scholar(s) linked to the signed-in guardian, with anything awaiting their signature.
create or replace function public.get_parent_children()
returns table(
  scholar_user_id uuid, full_name text, school text, career_interests text,
  pending_bookings jsonb
)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.full_name, p.school, p.career_interests,
    coalesce((
      select jsonb_agg(jsonb_build_object('booking_id', b.id, 'career', b.career, 'company', b.company, 'shadow_date', b.shadow_date, 'status', b.status, 'guardian_signature_status', b.guardian_signature_status) order by b.shadow_date)
      from public.bookings b where b.user_id = p.user_id
    ), '[]'::jsonb)
  from public.scholar_profiles p
  where lower(p.guardian_email) = lower(auth.jwt()->>'email')
$$;
grant execute on function public.get_parent_children() to authenticated;

-- Replaces the ad hoc two-query fetch the indemnity page used, so it can work for either the
-- scholar (view only) or the matched guardian (can actually sign).
create or replace function public.get_indemnity_context(_booking uuid)
returns table(
  career text, company text, location text, shadow_date text, scholar_name text, school text,
  viewer_role text, standard_signed boolean, company_signed boolean, needs_company_doc boolean, custom_indemnity_text text
)
language plpgsql stable security definer set search_path = public as $$
declare b public.bookings; c public.companies; p public.scholar_profiles; role text;
begin
  select * into b from public.bookings where id = _booking;
  if not found then raise exception 'Booking not found.'; end if;
  select * into p from public.scholar_profiles where user_id = b.user_id;
  select * into c from public.companies where id = b.company_id;

  if b.user_id = auth.uid() then role := 'scholar';
  elsif p.guardian_email is not null and lower(p.guardian_email) = lower(auth.jwt()->>'email') then role := 'guardian';
  else raise exception 'Not authorized to view this booking.';
  end if;

  return query select b.career, c.company, coalesce(c.address, c.location, b.location), b.shadow_date, p.full_name, p.school, role,
    b.indemnity_path is not null, b.company_indemnity_path is not null,
    c.custom_indemnity_text is not null, c.custom_indemnity_text;
end $$;
grant execute on function public.get_indemnity_context(uuid) to authenticated;

-- Only the matched guardian can actually submit a signature - this is the gatekeeper itself.
-- Mirrors submit_indemnity()'s confirm-and-notify logic, but authorizes by guardian email match
-- instead of scholar ownership, and records who actually signed.
create or replace function public.submit_guardian_signature(_booking uuid, _document text, _path text)
returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings; p public.scholar_profiles; c public.companies; u_email text; career_desc text; host_name text; is_guardian boolean;
begin
  if _document not in ('standard','company') then raise exception 'Invalid document.'; end if;
  select * into b from public.bookings where id = _booking;
  if not found then raise exception 'Booking not found.'; end if;
  select * into p from public.scholar_profiles where user_id = b.user_id;
  is_guardian := p.guardian_email is not null and lower(p.guardian_email) = lower(auth.jwt()->>'email');
  if not is_guardian then raise exception 'Only the linked parent/guardian can sign this document.'; end if;
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
end $$;
grant execute on function public.submit_guardian_signature(uuid,text,text) to authenticated;

-- submit_indemnity() (the old self-serve path) is disabled: a scholar can no longer complete
-- their own indemnity. Booking confirmation now only happens via submit_guardian_signature().
create or replace function public.submit_indemnity(_booking uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  raise exception 'Indemnity forms must be signed by the linked parent/guardian, not the scholar.';
end $$;
grant execute on function public.submit_indemnity(uuid) to authenticated;

-- set_indemnity_path / set_company_indemnity_path (the old scholar self-serve upload paths) are
-- likewise disabled - signing now goes through submit_guardian_signature() only.
create or replace function public.set_indemnity_path(_booking uuid, _path text) returns void
language plpgsql security definer set search_path=public as $$
begin
  raise exception 'Indemnity forms must be uploaded by the linked parent/guardian, not the scholar.';
end $$;

create or replace function public.set_company_indemnity_path(_booking uuid, _path text) returns void
language plpgsql security definer set search_path=public as $$
begin
  raise exception 'Indemnity forms must be uploaded by the linked parent/guardian, not the scholar.';
end $$;
