CREATE TABLE public.scholar_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('mini','full')),
  answers text NOT NULL,
  realistic integer NOT NULL,
  investigative integer NOT NULL,
  artistic integer NOT NULL,
  social integer NOT NULL,
  enterprising integer NOT NULL,
  conventional integer NOT NULL,
  onet_careers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scholar_assessments_user ON public.scholar_assessments(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.scholar_assessments TO authenticated;
GRANT ALL ON public.scholar_assessments TO service_role;
ALTER TABLE public.scholar_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own assessments read" ON public.scholar_assessments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own assessments insert" ON public.scholar_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own assessments delete" ON public.scholar_assessments FOR DELETE TO authenticated USING (auth.uid() = user_id);
