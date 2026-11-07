create or replace function public.enforce_booking_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  select max_applicants into cap from public.companies where id = new.company_id;
  if cap is not null then
    select count(*) into taken from public.bookings where company_id = new.company_id and shadow_date = new.shadow_date;
    if taken >= cap then
      raise exception 'This date is fully booked for this placement. Please choose another date or host.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists bookings_capacity_check on public.bookings;
create trigger bookings_capacity_check before insert on public.bookings
  for each row execute function public.enforce_booking_capacity();
