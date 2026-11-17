ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS no_availability_message text NOT NULL DEFAULT 'Our mentors are not available right now. Please check back closer to the time to see availability.';
CREATE OR REPLACE FUNCTION public.get_no_availability_message()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT no_availability_message FROM public.booking_settings WHERE id = 1 $$;
REVOKE ALL ON FUNCTION public.get_no_availability_message() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_no_availability_message() TO anon, authenticated, service_role;