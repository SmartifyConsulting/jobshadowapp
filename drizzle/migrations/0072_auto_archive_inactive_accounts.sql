-- Accounts inactive for 3 years are automatically archived. 30 days before that, the account is
-- warned by email; logging in at any point (before or after the warning) cancels the archive and
-- reactivates an already-archived account. Admins are exempt. "Inactive" is measured from the
-- later of auth.users.last_sign_in_at or created_at, since a never-logged-in account has no
-- last_sign_in_at.
alter table public.profiles add column if not exists archived boolean not null default false;
alter table public.profiles add column if not exists archive_warned_at timestamptz;

create or replace function public.warn_inactive_accounts() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select u.id, u.email, coalesce(p.display_name, '') as display_name
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where coalesce(p.archived, false) = false
      and coalesce(p.archive_warned_at, 'epoch'::timestamptz) = 'epoch'::timestamptz
      and coalesce(u.last_sign_in_at, u.created_at) <= now() - interval '3 years' + interval '30 days'
      and not public.has_role(u.id, 'admin')
      and u.email is not null
  loop
    insert into public.profiles (user_id, archive_warned_at) values (r.id, now())
      on conflict (user_id) do update set archive_warned_at = now();
    insert into public.email_outbox (user_id, template, recipient, subject, body) values
      (r.id, 'account_archive_warning', r.email,
       'Your Job Shadow account will be archived in 30 days',
       format('Hi%s, your Job Shadow account has been inactive for a while and is scheduled to be archived in 30 days. Simply log in before then to keep your account active - no other action is needed. If it is archived, you can contact us to have it restored.',
              case when r.display_name <> '' then ' ' || r.display_name else '' end));
  end loop;
end $$;
grant execute on function public.warn_inactive_accounts() to service_role;

create or replace function public.archive_inactive_accounts() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set archived = true
  from auth.users u
  where u.id = p.user_id
    and p.archived = false
    and p.archive_warned_at is not null
    and p.archive_warned_at <= now() - interval '30 days'
    and coalesce(u.last_sign_in_at, u.created_at) < p.archive_warned_at
    and not public.has_role(u.id, 'admin');
end $$;
grant execute on function public.archive_inactive_accounts() to service_role;

-- A fresh sign-in always cancels a pending warning and reactivates an already-archived account.
create or replace function public.reactivate_profile_on_login() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles set archived = false, archive_warned_at = null where user_id = new.id and (archived or archive_warned_at is not null);
  end if;
  return new;
end $$;
drop trigger if exists reactivate_profile_on_login on auth.users;
create trigger reactivate_profile_on_login after update of last_sign_in_at on auth.users
  for each row execute function public.reactivate_profile_on_login();

create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('account-archive-warnings-daily'); exception when others then null; end $$;
select cron.schedule('account-archive-warnings-daily', '0 7 * * *', $$select public.warn_inactive_accounts();$$);
do $$ begin perform cron.unschedule('account-archive-apply-daily'); exception when others then null; end $$;
select cron.schedule('account-archive-apply-daily', '15 7 * * *', $$select public.archive_inactive_accounts();$$);
