alter table public.bookings
  add column if not exists internship_preapproved boolean not null default false,
  add column if not exists internship_notes text;

create or replace function public.set_internship_preapproval(_booking uuid, _preapproved boolean, _notes text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.bookings b join public.companies c on c.id = b.company_id
    where b.id = _booking and public.is_mentor_email_match(c.mentor_email)
  ) then
    raise exception 'Not authorized for this booking';
  end if;
  update public.bookings set internship_preapproved = _preapproved, internship_notes = _notes where id = _booking;
end $$;
grant execute on function public.set_internship_preapproval(uuid, boolean, text) to authenticated;

drop function if exists public.list_mentor_bookings();
create function public.list_mentor_bookings()
returns table(id uuid, company text, career text, location text, shadow_date text, status text,
              scholar_name text, scholar_contact text, scholar_school text, indemnity_received boolean,
              internship_preapproved boolean, internship_notes text)
language sql stable security definer set search_path = public as $$
  select b.id, b.company, b.career, b.location, b.shadow_date, b.status, p.full_name, p.contact_no, p.school,
         b.indemnity_received, b.internship_preapproved, b.internship_notes
  from public.bookings b join public.companies c on c.id = b.company_id
  left join public.scholar_profiles p on p.user_id = b.user_id
  where public.is_mentor_email_match(c.mentor_email) order by b.shadow_date desc
$$;
grant execute on function public.list_mentor_bookings() to authenticated;
