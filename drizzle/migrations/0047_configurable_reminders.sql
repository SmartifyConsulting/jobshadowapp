-- Replaces the two hardcoded reminder crons (2-days-before, day-before) with a single
-- configurable schedule: admin sets which days-before to remind scholars and mentors, in
-- Booking Settings. Also adds the host-facing stand-in/contact-manager note to EVERY mentor
-- reminder, not just one fixed point.
alter table public.booking_settings
  add column if not exists scholar_reminder_days int[] not null default '{2,1}',
  add column if not exists mentor_reminder_days int[] not null default '{1}';

alter table public.bookings
  add column if not exists scholar_reminders_sent int[] not null default '{}',
  add column if not exists mentor_reminders_sent int[] not null default '{}';

create or replace function public.send_scheduled_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare s public.booking_settings; r record; off int;
begin
  select * into s from public.booking_settings where id = 1;

  for off in select unnest(s.scholar_reminder_days) loop
    for r in
      select b.*, p.full_name, p.guardian_email, c.company, c.arrival_time, c.collection_time
      from public.bookings b
      join public.companies c on c.id = b.company_id
      left join public.scholar_profiles p on p.user_id = b.user_id
      where b.status = 'confirmed'
        and not (off = any(b.scholar_reminders_sent))
        and to_date(b.shadow_date, 'MM/DD/YYYY') = current_date + off
    loop
      insert into public.email_outbox(booking_id, user_id, template, recipient, subject, body) values
      (r.id, r.user_id, case when off <= 1 then 'shadow_reminder_day_before' else 'shadow_reminder_scholar' end,
       concat_ws(', ', (select email from auth.users where id = r.user_id), r.guardian_email),
       case when off <= 1 then 'JobShadow: your Job Shadow is tomorrow' else format('JobShadow: your Job Shadow is in %s days', off) end,
       case when off <= 1 then
         format('Hi %s, your Job Shadow as %s at %s is tomorrow, %s. Arrive %s, collection %s. Don''t forget to take your ID, signed indemnity form(s) and questionnaire.',
                r.full_name, r.career, r.company, r.shadow_date, coalesce(r.arrival_time,'TBC'), coalesce(r.collection_time,'TBC'))
       else
         format('Hi %s, a reminder that your Job Shadow as %s at %s is on %s. Arrive %s, collection %s.',
                r.full_name, r.career, r.company, r.shadow_date, coalesce(r.arrival_time,'TBC'), coalesce(r.collection_time,'TBC'))
       end);
      update public.bookings set scholar_reminders_sent = array_append(scholar_reminders_sent, off) where id = r.id;
    end loop;
  end loop;

  for off in select unnest(s.mentor_reminder_days) loop
    for r in
      select b.*, p.full_name, c.mentor_email
      from public.bookings b
      join public.companies c on c.id = b.company_id
      left join public.scholar_profiles p on p.user_id = b.user_id
      where b.status = 'confirmed'
        and c.mentor_email is not null
        and not (off = any(b.mentor_reminders_sent))
        and to_date(b.shadow_date, 'MM/DD/YYYY') = current_date + off
    loop
      insert into public.email_outbox(booking_id, user_id, template, recipient, subject, body) values
      (r.id, r.user_id, 'shadow_reminder_mentor', r.mentor_email,
       format('JobShadow: a scholar is shadowing you in %s day%s', off, case when off = 1 then '' else 's' end),
       format(E'Reminder: %s will shadow you as %s on %s.\n\nRemember to notify your stand-in if you are unavailable to make this Job Shadow, or alternatively contact your contact manager at least 7 days prior to this date should your stand-in not be available.',
              r.full_name, r.career, r.shadow_date));
      update public.bookings set mentor_reminders_sent = array_append(mentor_reminders_sent, off) where id = r.id;
    end loop;
  end loop;
end $$;
grant execute on function public.send_scheduled_reminders() to service_role;

create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('shadow-reminders-daily'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('shadow-reminders-day-before'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('shadow-reminders-scheduled'); exception when others then null; end $$;
select cron.schedule('shadow-reminders-scheduled', '0 6 * * *', $$select public.send_scheduled_reminders();$$);

drop function if exists public.send_shadow_reminders();
drop function if exists public.send_day_before_reminders();
