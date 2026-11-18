-- One-off allocation approved by the owner on 18 November 2026.
-- Executed manually against the connected database; not an automatic schema migration.
-- Preserve existing roles. Do not infer School roles or insert Admin roles.
-- Exact email matches only; names and email domains are not classification evidence.
WITH evidence AS (
  SELECT u.id AS user_id,
    EXISTS (SELECT 1 FROM public.scholar_profiles s WHERE s.user_id = u.id)
    OR EXISTS (SELECT 1 FROM public.legacy_applications a WHERE lower(trim(a.email)) = lower(trim(u.email))) AS learner,
    EXISTS (SELECT 1 FROM public.companies c WHERE lower(trim(c.mentor_email)) = lower(trim(u.email)) OR lower(trim(c.backup_mentor_email)) = lower(trim(u.email))) AS host,
    EXISTS (SELECT 1 FROM public.companies c WHERE lower(trim(coalesce(nullif(to_jsonb(c)->>'hr_contact_email', ''), to_jsonb(c)->>'hr_email'))) = lower(trim(u.email))) AS hr_contact
  FROM auth.users u
),
candidates AS (
  SELECT user_id, 'user'::public.app_role AS role FROM evidence WHERE learner
  UNION SELECT user_id, 'mentor'::public.app_role FROM evidence WHERE host
  UNION SELECT user_id, 'hr_admin'::public.app_role FROM evidence WHERE hr_contact
)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role FROM candidates
ON CONFLICT (user_id, role) DO NOTHING
RETURNING id, user_id, role;
