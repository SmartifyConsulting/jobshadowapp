CREATE OR REPLACE FUNCTION public.get_public_career_content()
RETURNS TABLE(name text, description text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT c.name, c.description FROM public.careers c ORDER BY c.id;
$$;
REVOKE ALL ON FUNCTION public.get_public_career_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_career_content() TO anon, authenticated;
