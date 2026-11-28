-- New requests require the mentor's explicit acceptance; existing bookings are unchanged.
CREATE OR REPLACE FUNCTION public.gate_booking_on_mentor_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.status := 'pending_approval';
  RETURN NEW;
END;
$$;
