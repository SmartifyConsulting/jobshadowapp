BEGIN;

-- NULL uses the curated catalogue; an empty array explicitly clears a list.
ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS school_skills text[],
  ADD COLUMN IF NOT EXISTS workplace_skills text[];

-- A separate RPC preserves compatibility with the existing public content RPC.
CREATE OR REPLACE FUNCTION public.get_public_career_details()
RETURNS TABLE(name text, description text, school_skills text[], workplace_skills text[])
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT c.name, c.description, c.school_skills, c.workplace_skills
  FROM public.careers c ORDER BY c.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_career_details() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_career_details() TO anon, authenticated;

COMMIT;
