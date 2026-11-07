create or replace function public.is_mentor_email_match(_mentor_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = lower(trim(_mentor_email)))
$$;
grant execute on function public.is_mentor_email_match(text) to authenticated;

create or replace function public.list_mentor_placements()
returns table(id integer, company text, career text, sector text, location text, dates text, active boolean,
              max_applicants integer, days_per_shadow integer, arrival_time text, collection_time text, description text)
language sql stable security definer set search_path = public as $$
  select c.id, c.company, c.career, c.sector, c.location, c.dates, c.active, c.max_applicants,
         c.days_per_shadow, c.arrival_time, c.collection_time, c.description
  from public.companies c where public.is_mentor_email_match(c.mentor_email) order by c.career
$$;
grant execute on function public.list_mentor_placements() to authenticated;

create or replace function public.update_mentor_placement(_id int, _dates text, _active boolean,
  _max_applicants int, _arrival_time text, _collection_time text, _description text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.companies c where c.id=_id and public.is_mentor_email_match(c.mentor_email)) then
    raise exception 'Not authorized for this placement';
  end if;
  update public.companies set dates=_dates, active=_active, max_applicants=_max_applicants,
    arrival_time=_arrival_time, collection_time=_collection_time, description=_description where id=_id;
end $$;
grant execute on function public.update_mentor_placement(int,text,boolean,int,text,text,text) to authenticated;

create or replace function public.list_mentor_bookings()
returns table(id uuid, company text, career text, location text, shadow_date text, status text,
              scholar_name text, scholar_contact text, scholar_school text, indemnity_received boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.company, b.career, b.location, b.shadow_date, b.status, p.full_name, p.contact_no, p.school, b.indemnity_received
  from public.bookings b join public.companies c on c.id = b.company_id
  left join public.scholar_profiles p on p.user_id = b.user_id
  where public.is_mentor_email_match(c.mentor_email) order by b.shadow_date desc
$$;
grant execute on function public.list_mentor_bookings() to authenticated;
