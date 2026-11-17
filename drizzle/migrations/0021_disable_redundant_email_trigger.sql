-- Superseded by the server-side email dispatch (src/lib/email-dispatch.server.ts),
-- triggered from the admin Email Archive panel. Keeping both active risks a rare
-- double-send race if the pg_net path's Vault secrets are ever configured.
drop trigger if exists email_outbox_autosend on public.email_outbox;
