create or replace function public.get_booking_company_details(_booking uuid)
returns table(address text, location text, arrival_time text, collection_time text)
language sql stable security definer set search_path = public as $$
  select c.address, c.location, c.arrival_time, c.collection_time
  from public.bookings b join public.companies c on c.id = b.company_id
  where b.id = _booking and (b.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
$$;
grant execute on function public.get_booking_company_details(uuid) to authenticated;
