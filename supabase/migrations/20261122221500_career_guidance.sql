BEGIN;

-- NULL retains catalogue-derived content; empty arrays explicitly clear a list.
ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS ideal_for text,
  ADD COLUMN IF NOT EXISTS specialisations text[],
  ADD COLUMN IF NOT EXISTS subjects text[];

CREATE OR REPLACE FUNCTION public.get_public_career_guidance()
RETURNS TABLE(name text, description text, school_skills text[], workplace_skills text[], ideal_for text, specialisations text[], subjects text[])
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT c.name, c.description, c.school_skills, c.workplace_skills,
         c.ideal_for, c.specialisations, c.subjects
  FROM public.careers c ORDER BY c.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_career_guidance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_career_guidance() TO anon, authenticated;

COMMIT;
