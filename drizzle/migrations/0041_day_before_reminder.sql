-- A second reminder, the afternoon before the shadow date, prompting the scholar to pack their
-- ID, signed indemnity form(s) and questionnaire — separate from the existing 2-days-before reminder.
alter table public.bookings add column if not exists day_before_reminder_sent_at timestamptz;

create or replace function public.send_day_before_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select b.*, p.full_name, p.guardian_email, c.company, c.arrival_time, c.collection_time
    from public.bookings b
    join public.companies c on c.id = b.company_id
    left join public.scholar_profiles p on p.user_id = b.user_id
    where b.status = 'confirmed'
      and b.day_before_reminder_sent_at is null
      and to_date(b.shadow_date, 'MM/DD/YYYY') = current_date + 1
  loop
    insert into public.email_outbox(booking_id, user_id, template, recipient, subject, body) values
    (r.id, r.user_id, 'shadow_reminder_day_before',
     concat_ws(', ', (select email from auth.users where id = r.user_id), r.guardian_email),
     'JobShadow: your Job Shadow is tomorrow',
     format('Hi %s, your Job Shadow as %s at %s is tomorrow, %s. Arrive %s, collection %s. Don''t forget to take your ID, signed indemnity form(s) and questionnaire.',
            r.full_name, r.career, r.company, r.shadow_date, coalesce(r.arrival_time,'TBC'), coalesce(r.collection_time,'TBC')));

    update public.bookings set day_before_reminder_sent_at = now() where id = r.id;
  end loop;
end $$;
grant execute on function public.send_day_before_reminders() to service_role;

create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('shadow-reminders-day-before'); exception when others then null; end $$;
-- 14:00 server time (afternoon before)
select cron.schedule('shadow-reminders-day-before', '0 14 * * *', $$select public.send_day_before_reminders();$$);
