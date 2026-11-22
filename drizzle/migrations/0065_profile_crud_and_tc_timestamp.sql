alter table public.scholar_profiles
  add column if not exists tc_accepted_at timestamptz;

-- allow a scholar/parent to delete their own profile (RLS policy "own profile" already covers delete,
-- but the role grant only included select/insert/update); reconcile_deleted_scholar_profile trigger
-- (0004) already fires on delete of this table, so the deletion-reconciliation path is covered.
grant delete on public.scholar_profiles to authenticated;
