-- Email delivery is asynchronous. Missing delivery configuration or a transient
-- pg_net failure must leave the outbox row queued, not roll back the booking or
-- placement operation that generated it.
create or replace function public.trigger_send_queued_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_url text;
  delivery_key text;
begin
  select nullif(btrim(decrypted_secret), '')
    into delivery_url
    from vault.decrypted_secrets
    where name = 'project_url';

  select nullif(btrim(decrypted_secret), '')
    into delivery_key
    from vault.decrypted_secrets
    where name = 'service_role_key';

  if delivery_url is null or delivery_key is null then
    return new;
  end if;

  begin
    perform net.http_post(
      url := rtrim(delivery_url, '/') || '/functions/v1/send-queued-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || delivery_key
      ),
      body := jsonb_build_object('ids', jsonb_build_array(new.id))
    );
  exception when others then
    raise warning 'Email % remains queued; delivery enqueue failed (SQLSTATE %)',
      new.id, sqlstate;
  end;

  return new;
end;
$$;
