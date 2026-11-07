alter table public.bookings
  add column if not exists ad_hoc_requested boolean not null default false,
  add column if not exists ad_hoc_note text;

create or replace function public.notify_ad_hoc_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ad_hoc_requested then
    insert into public.email_outbox(booking_id, user_id, template, recipient, subject, body) values
    (new.id, new.user_id, 'ad_hoc_date_request', 'info@jobshadow.co.za',
     'JobShadow: ad-hoc date requested - needs review',
     format('A scholar requested %s at %s (%s) on %s, outside the host''s listed availability. Note: %s. Please confirm with the mentor before approving.', new.career, new.company, new.location, new.shadow_date, coalesce(nullif(new.ad_hoc_note,''),'(none)')));
  end if;
  return new;
end $$;

drop trigger if exists bookings_ad_hoc_notify on public.bookings;
create trigger bookings_ad_hoc_notify after insert on public.bookings
  for each row execute function public.notify_ad_hoc_request();
