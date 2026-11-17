-- Lightweight profile shared by every signed-up user (student, mentor, admin):
-- just a display name and avatar, separate from the scholar registration/ID photo.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "own profile readable" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "admins can read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "own profile upsertable" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "own profile updatable" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins can update any profile" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('avatars', 'avatars', true, array['image/png','image/jpeg','image/jpg','image/webp'], 5242880)
on conflict (id) do nothing;

create policy "public can view avatars" on storage.objects for select to public using (bucket_id = 'avatars');
create policy "own avatar insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own avatar update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own avatar delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Let every authenticated user look up another user's role (needed to show a
-- "Mentor"/"Admin" badge etc.) without exposing who holds which role broadly;
-- restricted to reading your own role is already covered by the existing
-- "own roles readable" policy, so admins also get read access to all roles here.
create policy "admins can read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));
