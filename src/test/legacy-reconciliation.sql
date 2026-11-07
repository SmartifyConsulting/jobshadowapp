-- Run against the connected database; every fixture and change is rolled back.
BEGIN;
INSERT INTO public.legacy_users(id,name,email)
VALUES(-2147483600,'Deletion verification',' DELETE-VERIFICATION@example.invalid ');
INSERT INTO public.legacy_applications(id,name,email)
VALUES(-2147483600,'Deletion verification','delete-verification@example.invalid');
DELETE FROM public.legacy_users WHERE id=-2147483600;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.legacy_applications WHERE id=-2147483600) THEN
    RAISE EXCEPTION 'Deleting a legacy user must remove matching applications';
  END IF;
END $$;
ROLLBACK;