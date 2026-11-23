-- Company/mentor placements change every year. Tag every row with the year it applies to, and let
-- admin copy a whole year's roster forward to start the next year (then prune/edit the copies —
-- the originals are untouched).
alter table public.companies add column if not exists year int not null default extract(year from now())::int;

create or replace function public.copy_companies_to_year(_from_year int, _to_year int)
returns int
language plpgsql security definer set search_path = public as $$
declare cols text; max_id int; copied int;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only.'; end if;
  if _from_year = _to_year then raise exception 'Source and destination year must differ.'; end if;
  select string_agg(quote_ident(column_name), ', ') into cols
    from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name not in ('id', 'year');
  select coalesce(max(id), 0) into max_id from public.companies;
  execute format(
    'insert into public.companies (id, year, %s) select %s + row_number() over (), %L::int, %s from public.companies where year = %L',
    cols, max_id, _to_year, cols, _from_year
  );
  get diagnostics copied = row_count;
  return copied;
end $$;
grant execute on function public.copy_companies_to_year(int, int) to authenticated;
