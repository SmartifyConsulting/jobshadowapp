-- Laravel held an unpaid booking for 1 hour then released the slot back for others to book.
-- The rebuild never re-implemented this - an abandoned awaiting_payment booking occupied a
-- capacity slot indefinitely.
create or replace function public.release_expired_booking_holds() returns void
language sql security definer set search_path = public as $$
  delete from public.bookings
  where status = 'awaiting_payment' and created_at < now() - interval '1 hour'
$$;
grant execute on function public.release_expired_booking_holds() to service_role;

create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('release-expired-booking-holds'); exception when others then null; end $$;
select cron.schedule('release-expired-booking-holds', '*/10 * * * *', $$select public.release_expired_booking_holds();$$);
