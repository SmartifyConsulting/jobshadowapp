alter table public.scholar_profiles
  add column if not exists id_verified boolean not null default false,
  add column if not exists id_verified_at timestamptz;

drop policy if exists "admins manage profiles" on public.scholar_profiles;
create policy "admins manage profiles" on public.scholar_profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "admins manage bookings" on public.bookings;
create policy "admins manage bookings" on public.bookings for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
