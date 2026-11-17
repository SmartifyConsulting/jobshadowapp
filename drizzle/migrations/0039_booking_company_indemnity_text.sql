-- Expose the company's AI-extracted indemnity clause text (if any) to the booking's own scholar,
-- so the indemnity page can render it as a second document requiring its own signature.
drop function if exists public.get_booking_company_details(uuid);
create function public.get_booking_company_details(_booking uuid)
returns table(address text, location text, arrival_time text, collection_time text, company text, custom_indemnity_text text)
language sql stable security definer set search_path = public as $$
  select c.address, c.location, c.arrival_time, c.collection_time, c.company, c.custom_indemnity_text
  from public.bookings b join public.companies c on c.id = b.company_id
  where b.id = _booking and (b.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
$$;
grant execute on function public.get_booking_company_details(uuid) to authenticated;
