create or replace function public.complete_and_request_evaluations() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select b.*, p.full_name, p.guardian_email, c.company, c.mentor_email
    from public.bookings b
    join public.companies c on c.id = b.company_id
    left join public.scholar_profiles p on p.user_id = b.user_id
    where b.status = 'confirmed' and to_date(b.shadow_date, 'MM/DD/YYYY') < current_date
  loop
    update public.bookings set status = 'completed' where id = r.id;
    insert into public.email_outbox(booking_id, user_id, template, recipient, subject, body) values
    (r.id, r.user_id, 'scholar_evaluation_request',
     concat_ws(', ', (select email from auth.users where id = r.user_id), r.guardian_email),
     'JobShadow: how was your Job Shadow?',
     format('Hi %s, we hope you enjoyed shadowing as %s at %s! We''d love your feedback - please reply to this email and let us know how it went.', r.full_name, r.career, r.company)),
    (r.id, r.user_id, 'mentor_evaluation_request', r.mentor_email,
     'JobShadow: how did the placement go?',
     format('Hi, thank you for hosting %s as %s. We''d appreciate a quick note on how the placement went - just reply to this email.', r.full_name, r.career));
  end loop;
end $$;
grant execute on function public.complete_and_request_evaluations() to service_role;

create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('complete-and-evaluate-daily'); exception when others then null; end $$;
select cron.schedule('complete-and-evaluate-daily', '0 7 * * *', $$select public.complete_and_request_evaluations();$$);
