alter table public.companies add column if not exists logo_path text;

insert into storage.buckets (id, name, public) values ('partner-logos', 'partner-logos', true) on conflict (id) do nothing;

drop policy if exists "public can view partner logos" on storage.objects;
create policy "public can view partner logos" on storage.objects for select to public using (bucket_id = 'partner-logos');

drop policy if exists "admins manage partner logos" on storage.objects;
create policy "admins manage partner logos" on storage.objects for all to authenticated
  using (bucket_id = 'partner-logos' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'partner-logos' and public.has_role(auth.uid(),'admin'));

create or replace function public.list_partner_logos()
returns table(company text, logo_path text)
language sql stable security definer set search_path = public as $$
  select c.company, c.logo_path from public.companies c where c.logo_path is not null and c.active order by c.company
$$;
grant execute on function public.list_partner_logos() to authenticated, anon;
