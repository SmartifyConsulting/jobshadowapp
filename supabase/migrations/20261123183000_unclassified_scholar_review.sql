begin;
create table public.account_classification_reviews (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null default 'Previously Unclassified',
  created_at timestamptz not null default now()
);
alter table public.account_classification_reviews enable row level security;
revoke all on public.account_classification_reviews from public, anon, authenticated;
grant select on public.account_classification_reviews to authenticated;
grant all on public.account_classification_reviews to service_role;
create policy "Admins read classification reviews" on public.account_classification_reviews
  for select to authenticated using (public.has_role((select auth.uid()), 'admin'));

create temporary table unclassified_cohort on commit drop as
  select id as user_id from auth.users u
  where not exists (select 1 from public.user_roles r where r.user_id=u.id);
insert into public.account_classification_reviews(user_id)
  select user_id from unclassified_cohort on conflict(user_id) do nothing;
insert into public.user_roles(user_id, role)
  select user_id, 'user'::public.app_role from unclassified_cohort
  on conflict(user_id, role) do nothing;

-- User-authorized removal of the single spam-flagged account. Abort if its
-- identity or usage no longer matches the reviewed record. No emails.
do $$ begin
  if exists(select 1 from auth.users where id='9866da4a-d80b-43b4-a78d-ca6949a9e652') then
    if not exists (
      select 1 from auth.users u where u.id='9866da4a-d80b-43b4-a78d-ca6949a9e652'
        and u.email::text='ydx~nwa9pwyxz@mailbox.in.ua'
        and coalesce((select lu.is_spam from public.legacy_users lu
          where lower(trim(lu.email))=lower(trim(u.email::text)) order by lu.id desc limit 1),false)
        and not exists(select 1 from public.bookings b where b.user_id=u.id)
        and not exists(select 1 from public.scholar_profiles s where s.user_id=u.id)
    ) then raise exception 'Spam account no longer matches the approved deletion'; end if;
    delete from auth.users where id='9866da4a-d80b-43b4-a78d-ca6949a9e652';
  end if;
end $$;
commit;
