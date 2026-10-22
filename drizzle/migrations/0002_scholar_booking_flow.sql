
create table public.scholar_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  contact_no text not null,
  id_number text not null,
  school text not null,
  school_type text not null,
  career_interests text,
  dietary text,
  guardian_name text,
  guardian_contact text,
  guardian_email text,
  guardian_id text,
  tc_accepted boolean not null default false,
  where_heard text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.scholar_profiles to authenticated;
grant all on public.scholar_profiles to service_role;
alter table public.scholar_profiles enable row level security;
create policy "own profile" on public.scholar_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins read profiles" on public.scholar_profiles for select to authenticated using (has_role(auth.uid(),'admin'));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  company_id integer not null,
  company text, sector text, career text, location text,
  shadow_date text not null,
  base_amount numeric not null default 0,
  voucher_code text,
  discount numeric not null default 0,
  amount_due numeric not null default 0,
  status text not null default 'awaiting_payment',
  paid_at timestamptz,
  indemnity_received boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "own bookings read" on public.bookings for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "own bookings insert" on public.bookings for insert to authenticated with check (user_id = auth.uid() and status='awaiting_payment' and paid_at is null);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid,
  user_id uuid,
  template text not null,
  recipient text,
  subject text not null,
  body text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);
grant select on public.email_outbox to authenticated;
grant all on public.email_outbox to service_role;
alter table public.email_outbox enable row level security;
create policy "own or admin emails" on public.email_outbox for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin'));

create or replace function public.list_placements()
returns table(id int, company text, sector text, career text, location text, availability text, amount numeric, days_per_shadow int, arrival_time text, collection_time text)
language sql stable security definer set search_path=public as $$
  select c.id, c.company, c.sector, c.career, c.location, c.dates, c.amount, c.days_per_shadow, c.arrival_time, c.collection_time
  from public.companies c where coalesce(c.dates,'') <> '' order by c.sector, c.career
$$;
grant execute on function public.list_placements() to authenticated, anon;

create or replace function public.check_voucher(_code text)
returns table(code text, discount numeric)
language sql stable security definer set search_path=public as $$
  select v.code, v.discount from public.vouchers v
  where lower(v.code)=lower(trim(_code))
    and (v.available_from is null or v.available_from <= current_date)
    and (v.available_until is null or v.available_until >= current_date)
  limit 1
$$;
grant execute on function public.check_voucher(text) to authenticated;

create or replace function public.confirm_test_payment(_booking uuid)
returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings; p public.scholar_profiles; c public.companies; u_email text;
begin
  select * into b from public.bookings where id=_booking and user_id=auth.uid();
  if not found then raise exception 'Booking not found'; end if;
  if b.status <> 'awaiting_payment' then return; end if;
  update public.bookings set status='indemnity_required', paid_at=now() where id=_booking;
  select * into p from public.scholar_profiles where user_id=b.user_id;
  select * into c from public.companies where id=b.company_id;
  select email into u_email from auth.users where id=b.user_id;
  insert into public.email_outbox(booking_id,user_id,template,recipient,subject,body) values
  (_booking,b.user_id,'applicant_application_complete',concat_ws(', ',u_email,p.guardian_email),
   'JobShadow: please sign and upload your indemnity',
   format('Hi %s, thank you for booking a Job Shadow as %s at %s on %s. Please download the indemnity, have a parent/guardian sign it, and upload it in My applications to confirm your booking.', p.full_name, b.career, b.company, b.shadow_date));
end $$;
grant execute on function public.confirm_test_payment(uuid) to authenticated;

create or replace function public.submit_indemnity(_booking uuid)
returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings; p public.scholar_profiles; c public.companies; u_email text;
begin
  select * into b from public.bookings where id=_booking and user_id=auth.uid();
  if not found then raise exception 'Booking not found'; end if;
  if b.status <> 'indemnity_required' then return; end if;
  update public.bookings set status='confirmed', indemnity_received=true where id=_booking;
  select * into p from public.scholar_profiles where user_id=b.user_id;
  select * into c from public.companies where id=b.company_id;
  select email into u_email from auth.users where id=b.user_id;
  insert into public.email_outbox(booking_id,user_id,template,recipient,subject,body) values
  (_booking,b.user_id,'applicant_thank_you',concat_ws(', ',u_email,p.guardian_email),'JobShadow: your booking is confirmed',
   format('Hi %s, your Job Shadow is confirmed. Company: %s. Address: %s. Date: %s. Arrive %s, collection %s. Mentor: %s (%s).', p.full_name, c.company, coalesce(c.address,c.location), b.shadow_date, coalesce(c.arrival_time,'TBC'), coalesce(c.collection_time,'TBC'), coalesce(c.mentor_name,'TBC'), coalesce(c.mentor_phone,'TBC'))),
  (_booking,b.user_id,'mentor_application_complete',c.mentor_email,'JobShadow: a scholar has booked with you',
   format('A scholar has booked to shadow you as %s on %s. Scholar: %s, %s. Dietary: %s.', b.career, b.shadow_date, p.full_name, p.school, coalesce(nullif(p.dietary,''),'none'))),
  (_booking,b.user_id,'hr_application_complete',c.hr_email,'JobShadow: new job shadow placement',
   format('%s from %s will job shadow %s (%s) on %s. The signed indemnity is on file.', p.full_name, p.school, coalesce(c.mentor_name,'your mentor'), b.career, b.shadow_date));
end $$;
grant execute on function public.submit_indemnity(uuid) to authenticated;
