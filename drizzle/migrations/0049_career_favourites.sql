-- Lets a signed-in scholar heart/favourite careers on the Careers page.
create table if not exists public.career_favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  career_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, career_slug)
);
grant select, insert, delete on public.career_favourites to authenticated;
grant all on public.career_favourites to service_role;
alter table public.career_favourites enable row level security;
create policy "own favourites" on public.career_favourites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
