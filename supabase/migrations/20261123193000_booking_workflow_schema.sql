-- Preview for document review, cancellation/date-change requests, waitlists,
-- private booking messages and notification deduplication. Not yet applied.
-- Existing bookings, signatures, payment records and legal text are preserved.
-- Email delivery remains held by hold_development_email; no mail is sent.
begin;

create function public.workflow_can_manage_company(_company integer) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select public.has_role(auth.uid(),'admin') or exists(
    select 1 from public.companies c where c.id=_company and (
      public.is_mentor_email_match(c.mentor_email) or
      (public.has_role(auth.uid(),'hr_admin') and public.is_mentor_email_match(c.hr_contact_email))
    )
  )
$$;
revoke all on function public.workflow_can_manage_company(integer) from public,anon;
grant execute on function public.workflow_can_manage_company(integer) to authenticated;

create function public.workflow_can_access_booking(_booking uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.bookings b where b.id=_booking and
    (b.user_id=auth.uid() or public.workflow_can_manage_company(b.company_id)))
$$;
revoke all on function public.workflow_can_access_booking(uuid) from public,anon;
grant execute on function public.workflow_can_access_booking(uuid) to authenticated;

create table public.workflow_booking_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  document_type text not null check(document_type in ('scholar_id','guardian_indemnity')),
  file_path text not null,
  submitted_by uuid references auth.users(id) on delete set null,
  supersedes uuid references public.workflow_booking_documents(id),
  status text not null default 'pending' check(status in ('pending','approved','changes_requested')),
  review_note text check(length(review_note)<=2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.workflow_booking_documents(booking_id,document_type,created_at desc);
alter table public.workflow_booking_documents enable row level security;
revoke all on public.workflow_booking_documents from public,anon,authenticated;
grant select on public.workflow_booking_documents to authenticated;
grant all on public.workflow_booking_documents to service_role;
create policy "Private document submissions" on public.workflow_booking_documents
  for select to authenticated using(public.has_role(auth.uid(),'admin') or submitted_by=auth.uid()
    or exists(select 1 from public.bookings b where b.id=booking_id and b.user_id=auth.uid()));

create table public.workflow_host_documents (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  document_type text not null check(document_type in ('host_indemnity','host_nda')),
  file_path text not null,
  submitted_by uuid references auth.users(id) on delete set null,
  supersedes uuid references public.workflow_host_documents(id),
  status text not null default 'pending' check(status in ('pending','approved','changes_requested')),
  review_note text check(length(review_note)<=2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.workflow_host_documents(company_id,document_type,created_at desc);
alter table public.workflow_host_documents enable row level security;
revoke all on public.workflow_host_documents from public,anon,authenticated;
grant select on public.workflow_host_documents to authenticated;
grant all on public.workflow_host_documents to service_role;
create policy "Company document submissions" on public.workflow_host_documents
  for select to authenticated using(public.workflow_can_manage_company(company_id));

create table public.workflow_change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  request_type text not null check(request_type in ('cancel','reschedule')),
  requested_date date,
  reason text not null check(length(trim(reason)) between 1 and 2000),
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','withdrawn','expired')),
  review_note text check(length(review_note)<=2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check((request_type='reschedule' and requested_date is not null) or (request_type='cancel' and requested_date is null))
);
create unique index one_open_booking_change on public.workflow_change_requests(booking_id) where status='pending';
alter table public.workflow_change_requests enable row level security;
revoke all on public.workflow_change_requests from public,anon,authenticated;
grant select on public.workflow_change_requests to authenticated;
grant all on public.workflow_change_requests to service_role;
create policy "Booking participants read requests" on public.workflow_change_requests
  for select to authenticated using(public.workflow_can_access_booking(booking_id));

create table public.workflow_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id integer not null references public.companies(id) on delete cascade,
  shadow_date date not null,
  status text not null default 'waiting' check(status in ('waiting','offered','accepted','expired','withdrawn')),
  offer_expires_at timestamptz,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_active_waitlist_entry on public.workflow_waitlist(user_id,company_id,shadow_date) where status in ('waiting','offered');
create index waitlist_order on public.workflow_waitlist(company_id,shadow_date,created_at,id) where status='waiting';
alter table public.workflow_waitlist enable row level security;
revoke all on public.workflow_waitlist from public,anon,authenticated;
grant select on public.workflow_waitlist to authenticated;
grant all on public.workflow_waitlist to service_role;
create policy "Own waitlist entries or admin" on public.workflow_waitlist
  for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.workflow_booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null check(length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on public.workflow_booking_messages(booking_id,created_at,id);
alter table public.workflow_booking_messages enable row level security;
revoke all on public.workflow_booking_messages from public,anon,authenticated;
grant select on public.workflow_booking_messages to authenticated;
grant all on public.workflow_booking_messages to service_role;
create policy "Private booking conversation" on public.workflow_booking_messages
  for select to authenticated using(public.workflow_can_access_booking(booking_id));

create table public.workflow_notification_events (
  event_key text primary key,
  booking_id uuid references public.bookings(id) on delete cascade,
  notification_id uuid references public.email_outbox(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.workflow_notification_events enable row level security;
revoke all on public.workflow_notification_events from public,anon,authenticated;
grant all on public.workflow_notification_events to service_role;

alter table public.bookings add column workflow_document_review_required boolean not null default false;
alter table public.bookings add column host_response_due_at timestamptz;
alter table public.bookings add column documentation_due_at timestamptz;
alter table public.booking_settings add column workflow_features_enabled boolean not null default false;
alter table public.booking_settings add column document_review_required boolean not null default true;
alter table public.booking_settings add column waitlist_enabled boolean not null default true;
alter table public.booking_settings add column booking_messages_enabled boolean not null default true;

-- Protected action RPCs will enforce participant/admin checks, row locks, seat
-- capacity, the existing guardian signature requirement, configured deadlines,
-- host-country holidays and first-in-first-out offers. Their UI/API implementation
-- is included in this proposed workflow batch; this schema does not activate it.
-- Existing refund approvals stay separate: no automated charges or payouts.
-- Existing confirmed bookings are not reopened for document review.
commit;
