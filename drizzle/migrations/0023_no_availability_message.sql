alter table public.booking_settings
  add column if not exists no_availability_message text not null default 'Our mentors are not available until February. Please check back closer to the time to see availability.';

-- booking_settings reads are admin-only (locked down by 0019_restrict_booking_settings_read), but this one
-- message needs to be visible to the public /roles page and the booking wizard.
create or replace function public.get_no_availability_message() returns text
language sql stable security definer set search_path = public as $$
  select no_availability_message from public.booking_settings where id = 1
$$;
grant execute on function public.get_no_availability_message() to authenticated, anon;
