BEGIN;
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  resource_type text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON public.activity_log (created_at DESC, id);
CREATE TABLE IF NOT EXISTS public.ai_token_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  feature text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  request_id text,
  input_tokens bigint CHECK (input_tokens >= 0),
  cached_input_tokens bigint CHECK (cached_input_tokens >= 0),
  output_tokens bigint CHECK (output_tokens >= 0),
  total_tokens bigint CHECK (total_tokens >= 0),
  cost_usd numeric(20,10) CHECK (cost_usd >= 0),
  cost_source text NOT NULL DEFAULT 'unavailable' CHECK (cost_source IN ('provider', 'estimated', 'unavailable')),
  input_rate_per_million numeric(20,10),
  cached_rate_per_million numeric(20,10),
  output_rate_per_million numeric(20,10),
  succeeded boolean NOT NULL,
  error_code text
);
CREATE INDEX IF NOT EXISTS ai_token_ledger_created_at_idx ON public.ai_token_ledger (created_at DESC, id);
REVOKE ALL ON public.activity_log, public.ai_token_ledger FROM anon, authenticated;
GRANT SELECT ON public.activity_log, public.ai_token_ledger TO authenticated;
GRANT ALL ON public.activity_log, public.ai_token_ledger TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_log_admin_read ON public.activity_log;
CREATE POLICY activity_log_admin_read ON public.activity_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS ai_token_ledger_admin_read ON public.ai_token_ledger;
CREATE POLICY ai_token_ledger_admin_read ON public.ai_token_ledger FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.record_report_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE record_data jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  record_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  INSERT INTO public.activity_log (actor_user_id, resource_type, record_id, action)
  VALUES (auth.uid(), TG_TABLE_NAME, coalesce(record_data->>'id', record_data->>'user_id', 'global'), TG_OP);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_report_activity() FROM PUBLIC;
DO $$
DECLARE target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['bookings', 'vouchers', 'companies', 'careers', 'profiles', 'scholar_profiles', 'user_roles', 'booking_settings', 'host_settings', 'evaluations']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS report_activity ON public.%I', target_table);
    EXECUTE format('CREATE TRIGGER report_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.record_report_activity()', target_table);
  END LOOP;
END;
$$;
COMMIT;
