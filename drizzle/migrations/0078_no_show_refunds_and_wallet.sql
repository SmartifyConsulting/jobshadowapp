-- No-shows: a scholar reporting their mentor didn't show triggers an automatic refund (credited
-- to their wallet); a mentor reporting a scholar no-show must give a reason, and it goes to admin
-- to approve (credits the wallet) or decline (nothing happens). The wallet balance is then applied
-- automatically to the scholar's next booking.
alter table public.bookings add column if not exists no_show_by text check (no_show_by in ('mentor', 'scholar'));
alter table public.bookings add column if not exists no_show_reason text;
alter table public.bookings add column if not exists refund_status text not null default 'none' check (refund_status in ('none', 'pending', 'approved', 'declined'));
alter table public.bookings add column if not exists refund_credited_at timestamptz;

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
drop policy if exists "own wallet read" on public.wallets;
create policy "own wallet read" on public.wallets for select to authenticated using (user_id = auth.uid());

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid,
  amount numeric not null,
  reason text not null,
  created_at timestamptz not null default now()
);
grant select on public.wallet_transactions to authenticated;
grant all on public.wallet_transactions to service_role;
alter table public.wallet_transactions enable row level security;
drop policy if exists "own wallet history" on public.wallet_transactions;
create policy "own wallet history" on public.wallet_transactions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Internal helper (not granted to authenticated) used by the functions below.
create or replace function public.credit_wallet(_user_id uuid, _amount numeric, _reason text, _booking_id uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if _amount <= 0 then return; end if;
  insert into public.wallets(user_id, balance) values (_user_id, _amount)
    on conflict (user_id) do update set balance = wallets.balance + _amount, updated_at = now();
  insert into public.wallet_transactions(user_id, booking_id, amount, reason) values (_user_id, _booking_id, _amount, _reason);
end $$;

create or replace function public.get_my_wallet_balance() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select balance from public.wallets where user_id = auth.uid()), 0);
$$;
grant execute on function public.get_my_wallet_balance() to authenticated;

-- A wallet balance is applied automatically to a scholar's next booking, up to its amount_due.
create or replace function public.apply_wallet_on_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare bal numeric; applied numeric;
begin
  select balance into bal from public.wallets where user_id = new.user_id;
  if bal is not null and bal > 0 and new.amount_due > 0 then
    applied := least(bal, new.amount_due);
    new.amount_due := new.amount_due - applied;
    update public.wallets set balance = balance - applied, updated_at = now() where user_id = new.user_id;
    insert into public.wallet_transactions(user_id, booking_id, amount, reason) values (new.user_id, new.id, -applied, 'Applied to new booking');
  end if;
  return new;
end $$;
drop trigger if exists bookings_apply_wallet on public.bookings;
create trigger bookings_apply_wallet before insert on public.bookings
  for each row execute function public.apply_wallet_on_booking();

-- Scholar reports their mentor didn't show up -> automatic refund, no admin step.
create or replace function public.report_mentor_no_show(_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  select * into b from public.bookings where id = _booking and user_id = auth.uid();
  if b.id is null then raise exception 'Booking not found.'; end if;
  if b.refund_status <> 'none' then raise exception 'This booking has already been reported.'; end if;
  update public.bookings set no_show_by = 'mentor', refund_status = 'approved', refund_credited_at = now() where id = _booking;
  perform public.credit_wallet(auth.uid(), b.amount_due, 'Mentor no-show refund', _booking);
end $$;
grant execute on function public.report_mentor_no_show(uuid) to authenticated;

-- Mentor reports the scholar didn't show up, with a reason -> goes to admin for review, and
-- notifies admin via the existing email_outbox/notification mechanism.
create or replace function public.report_scholar_no_show(_booking uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare mentor_email text; admin_emails text;
begin
  if coalesce(trim(_reason), '') = '' then raise exception 'Please provide a reason.'; end if;
  select c.mentor_email into mentor_email from public.bookings b join public.companies c on c.id = b.company_id where b.id = _booking;
  if mentor_email is null then raise exception 'Booking not found.'; end if;
  if not public.is_mentor_email_match(mentor_email) then raise exception 'Not authorised for this booking.'; end if;
  update public.bookings set no_show_by = 'scholar', no_show_reason = _reason, refund_status = 'pending' where id = _booking;
  select string_agg(u.email, ',') into admin_emails from auth.users u join public.user_roles ur on ur.user_id = u.id where ur.role = 'admin';
  if admin_emails is not null then
    insert into public.email_outbox(booking_id, template, recipient, subject, body)
    values (_booking, 'scholar_no_show_refund_request', admin_emails, 'Refund request: scholar no-show reported',
      format('A mentor reported a scholar no-show for booking %s. Reason: %s. Review it in Admin > Reports > Refund Requests.', _booking, _reason));
  end if;
end $$;
grant execute on function public.report_scholar_no_show(uuid, text) to authenticated;

-- Admin approves (credits the wallet) or declines (nothing happens) a pending refund request.
create or replace function public.admin_review_no_show_refund(_booking uuid, _approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  select * into b from public.bookings where id = _booking and refund_status = 'pending';
  if b.id is null then raise exception 'No pending refund request found for this booking.'; end if;
  if _approve then
    update public.bookings set refund_status = 'approved', refund_credited_at = now() where id = _booking;
    perform public.credit_wallet(b.user_id, b.amount_due, 'Scholar no-show refund (approved)', _booking);
  else
    update public.bookings set refund_status = 'declined' where id = _booking;
  end if;
end $$;
grant execute on function public.admin_review_no_show_refund(uuid, boolean) to authenticated;

-- Admin-only list of bookings with a refund decision pending.
create or replace function public.admin_list_pending_refunds()
returns table(id uuid, career text, company text, shadow_date text, amount_due numeric, no_show_reason text, scholar_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  return query
    select b.id, b.career, b.company, b.shadow_date, b.amount_due, b.no_show_reason, coalesce(p.full_name, u.email)
    from public.bookings b
    left join public.scholar_profiles p on p.user_id = b.user_id
    left join auth.users u on u.id = b.user_id
    where b.refund_status = 'pending'
    order by b.created_at;
end $$;
grant execute on function public.admin_list_pending_refunds() to authenticated;
