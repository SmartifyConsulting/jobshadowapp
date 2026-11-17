-- In-app evaluation forms replacing the old "just reply to this email" evaluation request,
-- matching the two reference forms (Job Mentor Evaluation Form, Job Shadower Evaluation Form).
-- Ratings are stored as an ordered int[] (1-6 Likert scale); the meaning of each position is
-- fixed per role and lives in the app code, not the database, since the two forms ask
-- different numbers of questions.
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  role text not null check (role in ('scholar','mentor')),
  ratings int[] not null,
  continue_text text,
  stop_text text,
  start_text text,
  extra_text text,
  comments_text text,
  created_at timestamptz not null default now(),
  unique (booking_id, role)
);
grant select on public.evaluations to authenticated;
grant all on public.evaluations to service_role;
alter table public.evaluations enable row level security;
create policy "read own or admin" on public.evaluations for select to authenticated using (
  exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
  or exists (select 1 from public.bookings b join public.companies c on c.id = b.company_id where b.id = booking_id and public.is_mentor_email_match(c.mentor_email))
  or public.has_role(auth.uid(), 'admin')
);

create or replace function public.submit_evaluation(
  _booking uuid, _role text, _ratings int[], _continue text, _stop text, _start text, _extra text, _comments text
) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings; c public.companies; allowed boolean;
begin
  if _role not in ('scholar','mentor') then raise exception 'Invalid role.'; end if;
  select * into b from public.bookings where id = _booking;
  if not found then raise exception 'Booking not found.'; end if;
  if b.status <> 'completed' then raise exception 'This job shadow has not been marked complete yet.'; end if;

  if _role = 'scholar' then
    allowed := b.user_id = auth.uid();
  else
    select * into c from public.companies where id = b.company_id;
    allowed := public.is_mentor_email_match(c.mentor_email);
  end if;
  if not allowed then raise exception 'Not authorized to evaluate this booking.'; end if;

  insert into public.evaluations(booking_id, role, ratings, continue_text, stop_text, start_text, extra_text, comments_text)
  values (_booking, _role, _ratings, _continue, _stop, _start, _extra, _comments)
  on conflict (booking_id, role) do update set
    ratings = excluded.ratings, continue_text = excluded.continue_text, stop_text = excluded.stop_text,
    start_text = excluded.start_text, extra_text = excluded.extra_text, comments_text = excluded.comments_text;
end $$;
grant execute on function public.submit_evaluation(uuid,text,int[],text,text,text,text,text) to authenticated;

-- Evaluation request emails now link to the in-app form instead of "reply to this email".
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
     format('Hi %s, we hope you enjoyed shadowing as %s at %s! Please complete a short evaluation of your experience: %s/evaluation/%s', r.full_name, r.career, r.company, 'https://jobshadow.co.za', r.id)),
    (r.id, r.user_id, 'mentor_evaluation_request', r.mentor_email,
     'JobShadow: how did the placement go?',
     format('Hi, thank you for hosting %s as %s. Please complete a short evaluation of the placement: %s/evaluation/%s', r.full_name, r.career, 'https://jobshadow.co.za', r.id));
  end loop;
end $$;
grant execute on function public.complete_and_request_evaluations() to service_role;

-- Lets the evaluation page work out who's looking at it (the booking's scholar, or the
-- booking's mentor by email match) without exposing the full bookings row via RLS, since
-- mentors otherwise have no direct read access to bookings.
create or replace function public.get_evaluation_context(_booking uuid)
returns table(career text, company text, shadow_date text, viewer_role text, already_submitted boolean)
language plpgsql stable security definer set search_path = public as $$
declare b public.bookings; c public.companies; role text;
begin
  select * into b from public.bookings where id = _booking;
  if not found then raise exception 'Booking not found.'; end if;
  select * into c from public.companies where id = b.company_id;

  if b.user_id = auth.uid() then role := 'scholar';
  elsif public.is_mentor_email_match(c.mentor_email) then role := 'mentor';
  else raise exception 'Not authorized to view this evaluation.';
  end if;

  if b.status <> 'completed' then raise exception 'This job shadow has not been marked complete yet.'; end if;

  return query select b.career, c.company, b.shadow_date, role,
    exists(select 1 from public.evaluations e where e.booking_id = _booking and e.role = role);
end $$;
grant execute on function public.get_evaluation_context(uuid) to authenticated;
