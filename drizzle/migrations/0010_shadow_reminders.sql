alter table public.bookings add column if not exists reminder_sent_at timestamptz;

create or replace function public.send_shadow_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select b.*, p.full_name, p.guardian_email, c.company, c.mentor_email, c.arrival_time, c.collection_time
    from public.bookings b
    join public.companies c on c.id = b.company_id
    left join public.scholar_profiles p on p.user_id = b.user_id
    where b.status = 'confirmed'
      and b.reminder_sent_at is null
      and to_date(b.shadow_date, 'MM/DD/YYYY') = current_date + 2
  loop
    insert into public.email_outbox(booking_id, user_id, template, recipient, subject, body) values
    (r.id, r.user_id, 'shadow_reminder_scholar',
     concat_ws(', ', (select email from auth.users where id = r.user_id), r.guardian_email),
     'JobShadow: your Job Shadow is in 2 days',
     format('Hi %s, a reminder that your Job Shadow as %s at %s is on %s. Arrive %s, collection %s.',
            r.full_name, r.career, r.company, r.shadow_date, coalesce(r.arrival_time,'TBC'), coalesce(r.collection_time,'TBC'))),
    (r.id, r.user_id, 'shadow_reminder_mentor', r.mentor_email,
     'JobShadow: a scholar is shadowing you in 2 days',
     format('Reminder: %s will shadow you as %s on %s.', r.full_name, r.career, r.shadow_date));

    update public.bookings set reminder_sent_at = now() where id = r.id;
  end loop;
end $$;
grant execute on function public.send_shadow_reminders() to service_role;

create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('shadow-reminders-daily'); exception when others then null; end $$;
select cron.schedule('shadow-reminders-daily', '0 6 * * *', $$select public.send_shadow_reminders();$$);
