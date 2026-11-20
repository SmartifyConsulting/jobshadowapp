BEGIN;
ALTER TABLE public.scholar_profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS guardian_first_name text,
  ADD COLUMN IF NOT EXISTS guardian_last_name text;
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS mentor_first_name text,
  ADD COLUMN IF NOT EXISTS mentor_last_name text,
  ADD COLUMN IF NOT EXISTS backup_mentor_first_name text,
  ADD COLUMN IF NOT EXISTS backup_mentor_last_name text,
  ADD COLUMN IF NOT EXISTS hr_contact_first_name text,
  ADD COLUMN IF NOT EXISTS hr_contact_last_name text;
ALTER TABLE public.legacy_users
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.legacy_applications
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

CREATE OR REPLACE FUNCTION public.sync_person_name_parts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  data jsonb := to_jsonb(NEW);
  previous jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  offset_index integer;
  first_key text;
  last_key text;
  full_key text;
  first_part text;
  last_part text;
BEGIN
  FOR offset_index IN 0..(TG_NARGS / 3 - 1) LOOP
    first_key := TG_ARGV[offset_index * 3];
    last_key := TG_ARGV[offset_index * 3 + 1];
    full_key := TG_ARGV[offset_index * 3 + 2];
    first_part := nullif(btrim(data->>first_key), '');
    last_part := nullif(btrim(data->>last_key), '');
    IF (TG_OP = 'INSERT' AND (first_part IS NOT NULL OR last_part IS NOT NULL))
       OR (TG_OP = 'UPDATE' AND (
         data->>first_key IS DISTINCT FROM previous->>first_key
         OR data->>last_key IS DISTINCT FROM previous->>last_key
       )) THEN
      data := jsonb_set(data, ARRAY[full_key],
        coalesce(to_jsonb(nullif(concat_ws(' ', first_part, last_part), '')), 'null'::jsonb));
    ELSIF TG_OP = 'UPDATE' AND data->>full_key IS DISTINCT FROM previous->>full_key THEN
      data := jsonb_set(jsonb_set(data, ARRAY[first_key], 'null'::jsonb), ARRAY[last_key], 'null'::jsonb);
    END IF;
  END LOOP;
  NEW := jsonb_populate_record(NEW, data);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_person_name_parts() FROM PUBLIC;
DROP TRIGGER IF EXISTS aa_person_name_parts ON public.profiles;
CREATE TRIGGER aa_person_name_parts BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_person_name_parts('first_name', 'last_name', 'display_name');
DROP TRIGGER IF EXISTS aa_person_name_parts ON public.scholar_profiles;
CREATE TRIGGER aa_person_name_parts BEFORE INSERT OR UPDATE ON public.scholar_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_person_name_parts(
  'first_name', 'last_name', 'full_name',
  'guardian_first_name', 'guardian_last_name', 'guardian_name');
DROP TRIGGER IF EXISTS aa_person_name_parts ON public.companies;
CREATE TRIGGER aa_person_name_parts BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.sync_person_name_parts(
  'mentor_first_name', 'mentor_last_name', 'mentor_name',
  'backup_mentor_first_name', 'backup_mentor_last_name', 'backup_mentor_name',
  'hr_contact_first_name', 'hr_contact_last_name', 'hr_contact_name');
DROP TRIGGER IF EXISTS aa_person_name_parts ON public.legacy_users;
CREATE TRIGGER aa_person_name_parts BEFORE INSERT OR UPDATE ON public.legacy_users
FOR EACH ROW EXECUTE FUNCTION public.sync_person_name_parts('first_name', 'last_name', 'name');
DROP TRIGGER IF EXISTS aa_person_name_parts ON public.legacy_applications;
CREATE TRIGGER aa_person_name_parts BEFORE INSERT OR UPDATE ON public.legacy_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_person_name_parts('first_name', 'last_name', 'name');

CREATE TABLE IF NOT EXISTS public.user_notification_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.email_outbox(id) ON DELETE CASCADE,
  read_at timestamptz,
  dismissed_at timestamptz,
  PRIMARY KEY (user_id, notification_id)
);
REVOKE ALL ON public.user_notification_state FROM anon, authenticated;
GRANT SELECT ON public.user_notification_state TO authenticated;
GRANT ALL ON public.user_notification_state TO service_role;
ALTER TABLE public.user_notification_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_notification_state ON public.user_notification_state;
CREATE POLICY own_notification_state ON public.user_notification_state
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.can_read_own_notification(_notification uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.email_outbox e WHERE e.id = _notification
    AND (
      e.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM regexp_split_to_table(coalesce(e.recipient, ''), '[,;]') recipient
        WHERE lower(btrim(recipient)) = lower(btrim(auth.jwt()->>'email'))
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_read_own_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_own_notification(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_notifications()
RETURNS TABLE(id uuid, subject text, body text, created_at timestamptz, read_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT e.id, e.subject, e.body, e.created_at, state.read_at
  FROM public.email_outbox e
  LEFT JOIN public.user_notification_state state
    ON state.notification_id = e.id AND state.user_id = auth.uid()
  WHERE public.can_read_own_notification(e.id) AND state.dismissed_at IS NULL
  ORDER BY e.created_at DESC, e.id;
$$;
REVOKE ALL ON FUNCTION public.get_my_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_notifications() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_my_notification_state(_notification uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.can_read_own_notification(_notification) THEN
    RAISE EXCEPTION 'Notification not found or access denied.';
  END IF;
  IF _action NOT IN ('read', 'unread', 'delete') OR _action IS NULL THEN
    RAISE EXCEPTION 'Unknown notification action.';
  END IF;
  INSERT INTO public.user_notification_state(user_id, notification_id, read_at, dismissed_at)
  VALUES (
    auth.uid(), _notification,
    CASE WHEN _action = 'read' THEN now() ELSE NULL END,
    CASE WHEN _action = 'delete' THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, notification_id) DO UPDATE
  SET read_at = CASE WHEN _action = 'read' THEN now()
                     WHEN _action = 'unread' THEN NULL
                     ELSE user_notification_state.read_at END,
      dismissed_at = CASE WHEN _action = 'delete' THEN now()
                          ELSE user_notification_state.dismissed_at END;
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_notification_state(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_notification_state(uuid, text) TO authenticated;
COMMIT;
