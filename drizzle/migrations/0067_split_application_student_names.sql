-- Backfill first_name/last_name from the existing combined name, wherever a scholar profile or
-- legacy application has a full name but no split name on file yet. Deterministic split on the
-- first space, not a guess, so it's safe to store directly (unlike the admin last-name AI helper,
-- which only displays an unconfirmed guess and never writes to the database).

update public.scholar_profiles
set first_name = coalesce(nullif(trim(first_name), ''), split_part(trim(full_name), ' ', 1)),
    last_name = coalesce(
      nullif(trim(last_name), ''),
      case when strpos(trim(full_name), ' ') > 0 then trim(substring(trim(full_name) from strpos(trim(full_name), ' ') + 1)) else null end
    )
where coalesce(nullif(trim(first_name), ''), nullif(trim(last_name), '')) is null
  and full_name is not null and trim(full_name) <> '';

update public.legacy_applications
set first_name = coalesce(nullif(trim(first_name), ''), split_part(trim(name), ' ', 1)),
    last_name = coalesce(
      nullif(trim(last_name), ''),
      case when strpos(trim(name), ' ') > 0 then trim(substring(trim(name) from strpos(trim(name), ' ') + 1)) else null end
    )
where coalesce(nullif(trim(first_name), ''), nullif(trim(last_name), '')) is null
  and name is not null and trim(name) <> '';
