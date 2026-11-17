-- Separate statement/batch: Postgres requires a new enum value to be
-- committed before it can be used elsewhere, so this stays its own file.
alter type public.app_role add value if not exists 'hr_admin';
