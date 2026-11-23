-- The careers table is admin-only (RLS grants select to admins only), so a career an admin adds
-- there has never been visible on the public /roles page, which instead reads a static bundled
-- list. Expose a narrow, non-sensitive read (name + description only) so every admin-captured
-- career actually shows up publicly.
create or replace function public.list_public_careers()
returns table(id int, name text, description text)
language sql stable security definer set search_path = public as $$
  select id, name, description from public.careers order by name;
$$;
grant execute on function public.list_public_careers() to anon, authenticated;
