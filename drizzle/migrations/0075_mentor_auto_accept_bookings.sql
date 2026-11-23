-- A mentor can choose to auto-accept every booking request (today's behaviour, and the default so
-- nothing changes for anyone who hasn't set a preference) or require their own approval first.
alter table public.host_settings add column if not exists auto_accept boolean not null default true;
alter table public.bookings add column if not exists decline_reason text;

drop function if exists public.update_my_host_settings(boolean,int,int,int,text[],int);
create function public.update_my_host_settings(
  _paused boolean, _max_shadows_per_week int, _max_shadows_per_month int, _buffer_days int, _blackout_dates text[],
  _max_consecutive_hours int, _auto_accept boolean default true
) returns void
language plpgsql security definer set search_path = public as $$
declare my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then raise exception 'Not signed in.'; end if;
  insert into public.host_settings(mentor_email, paused, max_shadows_per_week, max_shadows_per_month, buffer_days, blackout_dates, max_consecutive_hours, auto_accept, updated_at)
  values (my_email, _paused, _max_shadows_per_week, _max_shadows_per_month, _buffer_days, coalesce(_blackout_dates, '{}'), _max_consecutive_hours, coalesce(_auto_accept, true), now())
  on conflict (mentor_email) do update set
    paused = excluded.paused, max_shadows_per_week = excluded.max_shadows_per_week,
    max_shadows_per_month = excluded.max_shadows_per_month, buffer_days = excluded.buffer_days,
    blackout_dates = excluded.blackout_dates, max_consecutive_hours = excluded.max_consecutive_hours,
    auto_accept = excluded.auto_accept, updated_at = now();
end $$;
grant execute on function public.update_my_host_settings(boolean,int,int,int,text[],int,boolean) to authenticated;

create or replace function public.gate_booking_on_mentor_approval() returns trigger
language plpgsql security definer set search_path = public as $$
declare mentor_auto_accept boolean;
begin
  select coalesce(hs.auto_accept, true) into mentor_auto_accept
  from public.companies c
  left join public.host_settings hs on lower(trim(hs.mentor_email)) = lower(trim(c.mentor_email))
  where c.id = new.company_id;
  if coalesce(mentor_auto_accept, true) = false then
    new.status := 'pending_approval';
  end if;
  return new;
end $$;

drop trigger if exists bookings_gate_mentor_approval on public.bookings;
create trigger bookings_gate_mentor_approval before insert on public.bookings
  for each row execute function public.gate_booking_on_mentor_approval();

-- The trigger above may rewrite status to 'pending_approval' after this check runs against the
-- client's insert, so both values must be allowed; paid_at is still always required to be unset.
drop policy if exists "own bookings insert" on public.bookings;
create policy "own bookings insert" on public.bookings for insert to authenticated
  with check (user_id = auth.uid() and status in ('awaiting_payment', 'pending_approval') and paid_at is null);

drop function if exists public.list_mentor_bookings();
create function public.list_mentor_bookings()
returns table(id uuid, company text, career text, location text, shadow_date text, status text,
              scholar_name text, scholar_contact text, scholar_school text, indemnity_received boolean,
              internship_preapproved boolean, internship_notes text, decline_reason text)
language sql stable security definer set search_path = public as $$
  select b.id, b.company, b.career, b.location, b.shadow_date, b.status, p.full_name, p.contact_no, p.school,
         b.indemnity_received, b.internship_preapproved, b.internship_notes, b.decline_reason
  from public.bookings b join public.companies c on c.id = b.company_id
  left join public.scholar_profiles p on p.user_id = b.user_id
  where public.is_mentor_email_match(c.mentor_email) order by b.shadow_date desc
$$;
grant execute on function public.list_mentor_bookings() to authenticated;

-- Mentor approves (-> scholar can now pay) or declines (-> cancelled, with a reason the scholar can see) a
-- booking that's waiting on their approval. Scoped to bookings for that mentor's own companies only.
create or replace function public.respond_to_booking_request(_booking uuid, _approve boolean, _decline_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare mentor_email text;
begin
  select c.mentor_email into mentor_email
  from public.bookings b join public.companies c on c.id = b.company_id
  where b.id = _booking and b.status = 'pending_approval';
  if mentor_email is null then raise exception 'Booking not found or no longer awaiting your approval.'; end if;
  if not public.is_mentor_email_match(mentor_email) then raise exception 'Not authorised for this booking.'; end if;
  if _approve then
    update public.bookings set status = 'awaiting_payment' where id = _booking;
  else
    update public.bookings set status = 'cancelled', decline_reason = _decline_reason where id = _booking;
  end if;
end $$;
grant execute on function public.respond_to_booking_request(uuid, boolean, text) to authenticated;
