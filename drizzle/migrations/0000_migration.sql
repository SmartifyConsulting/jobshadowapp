create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.legacy_applications (id int primary key, name text, id_number text, email text, contact text, referral text, school text, company text, company_code text, career text, sector text, location text, dates text, paid boolean, indemnity boolean, cancelled boolean, imported_at timestamptz not null default now());
create table public.companies (id int primary key, company text, company_code text, sector text, career text, description text, period text, dates text, location text, address text, website text, mentor_name text, mentor_email text, mentor_phone text, backup_mentor_name text, backup_mentor_email text, backup_mentor_phone text, hr_name text, hr_email text, hr_phone text, availability text[], max_applicants int, days_per_shadow int, arrival_time text, collection_time text, total_days int, amount numeric);
create table public.vouchers (id int primary key, name text, code text, discount numeric, careers text[], available_from date, available_until date, usage_limit int);
create table public.sectors (id int primary key, name text not null);
create table public.careers (id int primary key, name text not null);
create table public.legacy_users (id int primary key, name text, email text, has_profile boolean, is_spam boolean not null default false);

do $$ declare t text; begin
 foreach t in array array['legacy_applications','companies','vouchers','sectors','careers','legacy_users'] loop
  execute format('grant select, insert, update, delete on public.%I to authenticated; grant all on public.%I to service_role; alter table public.%I enable row level security; create policy "admins manage" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''));', t,t,t,t);
 end loop; end $$;