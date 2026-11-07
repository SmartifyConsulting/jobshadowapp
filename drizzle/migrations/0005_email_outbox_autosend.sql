create extension if not exists pg_net;

create or replace function public.trigger_send_queued_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-queued-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object('ids', jsonb_build_array(new.id))
  );
  return new;
end $$;

drop trigger if exists email_outbox_autosend on public.email_outbox;
create trigger email_outbox_autosend after insert on public.email_outbox
  for each row execute function public.trigger_send_queued_email();
