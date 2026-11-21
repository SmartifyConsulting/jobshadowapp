-- A paid booking must be held for 1 hour before the scholar is given the mentor/company meeting
-- details (address, arrival time, host name/phone) - previously that email went out the instant
-- the guardian signed, which could be seconds after payment. Mentor/HR notification emails are
-- unaffected: they still go out immediately, since they don't need to wait.
alter table public.email_outbox add column if not exists send_after timestamptz;

create or replace function public.trigger_send_queued_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.send_after is not null and new.send_after > now() then
    return new;
  end if;
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-queued-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object('ids', jsonb_build_array(new.id))
  );
  return new;
end $$;

create or replace function public.send_due_delayed_emails() returns void
language plpgsql security definer set search_path = public as $$
declare due_ids uuid[];
begin
  select array_agg(id) into due_ids from public.email_outbox where status = 'queued' and send_after is not null and send_after <= now();
  if due_ids is null or array_length(due_ids,1) is null then return; end if;
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-queued-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object('ids', to_jsonb(due_ids))
  );
end $$;
grant execute on function public.send_due_delayed_emails() to service_role;

create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('send-delayed-emails'); exception when others then null; end $$;
select cron.schedule('send-delayed-emails', '*/5 * * * *', $$select public.send_due_delayed_emails();$$);

-- Delay only the scholar/guardian-facing confirmation email (it's the one carrying the mentor's
-- name, phone, and physical address) until an hour after payment. Mentor/HR notifications still
-- insert with send_after = null, i.e. immediate, as before.
create or replace function public.submit_guardian_signature(_booking uuid, _document text, _path text)
returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings; p public.scholar_profiles; c public.companies; u_email text; career_desc text; host_name text; is_guardian boolean; release_at timestamptz;
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
  release_at := greatest(now(), coalesce(b.paid_at, now()) + interval '1 hour');
  insert into public.email_outbox(booking_id,user_id,template,recipient,subject,body,send_after) values
  (_booking,b.user_id,'applicant_thank_you',concat_ws(', ',u_email,p.guardian_email),'JobShadow: your booking is confirmed',
   format(E'Hi %s, your Job Shadow is confirmed.\n\nJob shadow: %s (%s)\n%s\n\nDate & time: %s, %s - %s (%s day/s)\nPlease contact Job Shadow should you wish to change the date of this booking at least 7 days prior.\n\nCompany: %s\nPhysical address: %s\nName of host: %s\nContact number: %s\n\nDon''t forget to take your ID and signed indemnity form.',
     p.full_name, b.career, coalesce(b.mode,c.mode,'Face-to-Face'), coalesce(career_desc, c.description, ''),
     b.shadow_date, coalesce(c.arrival_time,'TBC'), coalesce(c.collection_time,'TBC'), coalesce(c.days_per_shadow,1),
     c.company, coalesce(c.address,c.location), host_name, coalesce(c.mentor_phone,'TBC')),
   release_at),
  (_booking,b.user_id,'mentor_application_complete',c.mentor_email,'JobShadow: a scholar has booked with you',
   format(E'A scholar has booked to shadow you.\n\nName: %s\nSchool: %s\nCareer interests: %s\nDietary requirements / allergies: %s\n\nJob role: %s (%s)\n%s\n\nDate of Job Shadow: %s\nTimes of Job Shadow: %s - %s\n\nRemember to notify your stand-in if you are unavailable to make this Job Shadow, or alternatively contact your contact manager at least 7 days prior to this date should your stand-in not be available.',
     p.full_name, p.school, coalesce(nullif(p.career_interests,''),'none recorded'), coalesce(nullif(p.dietary,''),'none'),
     b.career, coalesce(b.mode,c.mode,'Face-to-Face'), coalesce(career_desc, c.description, ''),
     b.shadow_date, coalesce(c.arrival_time,'TBC'), coalesce(c.collection_time,'TBC')), null),
  (_booking,b.user_id,'hr_application_complete',c.hr_email,'JobShadow: new job shadow placement',
   format(E'%s from %s will job shadow %s (%s) on %s.\n\nID number: %s\nContact number: %s\nDietary requirements / allergies: %s\n\nThe signed indemnity is on file.',
     p.full_name, p.school, host_name, b.career, b.shadow_date,
     coalesce(nullif(p.id_number,''),'not recorded'), coalesce(nullif(p.contact_no,''),'not recorded'), coalesce(nullif(p.dietary,''),'none')), null);
end $$;
grant execute on function public.submit_guardian_signature(uuid,text,text) to authenticated;
