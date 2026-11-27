-- Approved and applied 2026-11-28: isolated sample mentor demonstration.
-- Two inactive demo placements, flagged in the database. No real users or bookings created.
-- Only Raphy's authenticated placement search includes these rows.
BEGIN;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.companies.is_sample IS 'Fictitious demonstration record; not a real mentor opportunity.';

-- Suppress email-related triggers for this transaction's sample inserts.
ALTER TABLE public.companies DISABLE TRIGGER mentor_welcome_pack;
ALTER TABLE public.companies DISABLE TRIGGER notify_role_subscribers;
DO $$
DECLARE next_id integer;
BEGIN
 LOCK TABLE public.companies IN SHARE ROW EXCLUSIVE MODE;
 SELECT coalesce(max(id),0)+1 INTO next_id FROM public.companies;
 INSERT INTO public.companies(id,company,company_code,sector,career,mentor_name,location,dates,
   arrival_time,collection_time,days_per_shadow,max_applicants,amount,mode,active,
   allow_off_season,country_code,is_sample,description)
 SELECT next_id,'Willow Property Group','SAMPLE-RAPHY-PROPERTY','Business & Finance',
   'Property And Facilities Manager','Avery Morgan','Johannesburg',
   '12/07/2026, 12/09/2026, 02/08/2027','09:00','12:00',1,2,350,'In person',false,
   true,'ZA',true,'Observe facilities planning, property maintenance and supplier coordination.'
 WHERE NOT EXISTS(SELECT 1 FROM public.companies WHERE company_code='SAMPLE-RAPHY-PROPERTY');
 SELECT coalesce(max(id),0)+1 INTO next_id FROM public.companies;
 INSERT INTO public.companies(id,company,company_code,sector,career,mentor_name,location,dates,
   arrival_time,collection_time,days_per_shadow,max_applicants,amount,mode,active,
   allow_off_season,country_code,is_sample,description)
 SELECT next_id,'Cedar Finance Studio','SAMPLE-RAPHY-ACCOUNTANT','Business & Finance',
   'Accountant','Jordan Reed','Johannesburg',
   '12/07/2026, 12/09/2026, 02/08/2027','10:00','13:00',1,2,350,'In person',false,
   true,'ZA',true,'Explore financial reporting, budgeting and business record keeping.'
 WHERE NOT EXISTS(SELECT 1 FROM public.companies WHERE company_code='SAMPLE-RAPHY-ACCOUNTANT');
END $$;
INSERT INTO public.placement_day_times(placement_id,available_on,from_time,to_time)
 SELECT c.id,public.parse_availability_day(d.value),c.arrival_time::time,c.collection_time::time
 FROM public.companies c CROSS JOIN LATERAL unnest(string_to_array(c.dates,',')) d(value)
 WHERE c.is_sample AND c.company_code IN ('SAMPLE-RAPHY-PROPERTY','SAMPLE-RAPHY-ACCOUNTANT')
 ON CONFLICT(placement_id,available_on) DO NOTHING;
ALTER TABLE public.companies ENABLE TRIGGER mentor_welcome_pack;
ALTER TABLE public.companies ENABLE TRIGGER notify_role_subscribers;

-- Existing real favourite retained; this insertion is a no-op for Raphy's current Accountant favourite.
INSERT INTO public.career_favourites(user_id,career_slug)
 VALUES('1ec456b0-6280-4732-9393-9e67991ffdfa','business-finance--accountant')
 ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.list_placements()
RETURNS TABLE(id integer,company text,sector text,career text,location text,availability text,
 amount numeric,days_per_shadow integer,arrival_time text,collection_time text,description text,mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id,c.company,c.sector,c.career,c.location,c.dates,c.amount,c.days_per_shadow,
 c.arrival_time,c.collection_time,c.description,c.mode
 FROM public.companies c
 WHERE ((c.active AND NOT c.is_sample) OR
   (c.is_sample AND c.company_code IN ('SAMPLE-RAPHY-PROPERTY','SAMPLE-RAPHY-ACCOUNTANT')
    AND auth.uid()='1ec456b0-6280-4732-9393-9e67991ffdfa'::uuid))
 AND coalesce(c.dates,'')<>''
 AND EXISTS(SELECT 1 FROM unnest(string_to_array(c.dates,',')) d
   WHERE to_date(trim(d),'MM/DD/YYYY')>=current_date
   AND EXISTS(SELECT 1 FROM public.country_holiday_calendars hc WHERE hc.country_code=c.country_code AND hc.year=extract(year FROM to_date(trim(d),'MM/DD/YYYY'))::integer)
   AND NOT EXISTS(SELECT 1 FROM public.country_holiday_calendars hc WHERE hc.country_code=c.country_code AND to_date(trim(d),'MM/DD/YYYY')=ANY(hc.dates))
   AND NOT(c.country_code='ZA' AND EXISTS(SELECT 1 FROM public.booking_settings s CROSS JOIN unnest(s.public_holidays) ph WHERE s.id=1 AND to_date(ph,'MM/DD/YYYY')=to_date(trim(d),'MM/DD/YYYY'))))
 ORDER BY c.sector,c.career;
$$;

-- Demo can proceed through selection, placement details and date/payment preview.
-- Block final submission before any wallet, booking or notification side effects.
CREATE OR REPLACE FUNCTION public.block_sample_booking_submission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.companies WHERE id=NEW.company_id AND is_sample) THEN
   RAISE EXCEPTION 'This demonstration mentor is for preview only. No booking or payment has been created.';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.block_sample_booking_submission() FROM public,anon,authenticated;
CREATE TRIGGER aa_block_sample_booking BEFORE INSERT OR UPDATE OF company_id ON public.bookings
 FOR EACH ROW EXECUTE FUNCTION public.block_sample_booking_submission();
COMMIT;

