-- Explicit user requirement: no user emails while developing workflows.
begin;
create or replace function public.hold_development_email() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  if new.status='queued' then new.status:='held'; end if;
  return new;
end $$;
create trigger hold_development_email before insert or update of status on public.email_outbox
  for each row execute function public.hold_development_email();
-- Disable the existing automatic HTTP dispatch, including old deployed clients.
create or replace function public.trigger_send_queued_email() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin return new; end $$;
update public.email_outbox set status='held' where status='queued';
commit;
