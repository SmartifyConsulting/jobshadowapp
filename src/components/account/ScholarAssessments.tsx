import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/data";
import { getAssessmentQuestions, submitAssessment } from "@/lib/assessment.functions";
import {
  AREA_LABEL, QUESTION_COUNT, RIASEC, hollandCode, matchCareers, maxAreaScore,
  type AssessmentKind, type RiasecScores,
} from "@/lib/assessment";

const OPTIONS = ["Strongly dislike", "Dislike", "Unsure", "Like", "Strongly like"];
type OnetCareer = { code: string; title: string; fit: string; bright: boolean };
type Row = RiasecScores & { id: string; kind: AssessmentKind; created_at: string; onet_careers: OnetCareer[] };

const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { order: (c: string, o: object) => Promise<{ data: Row[] | null; error: unknown }> };
  };
};

export function ScholarAssessments() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<AssessmentKind | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const fetchQs = useServerFn(getAssessmentQuestions);
  const submit = useServerFn(submitAssessment);

  const history = useQuery({
    queryKey: ["scholar-assessments"],
    queryFn: async () => {
      const { data, error } = await db.from("scholar_assessments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const questions = useQuery({
    queryKey: ["assessment-questions", kind],
    enabled: !!kind,
    staleTime: Infinity,
    queryFn: () => fetchQs({ data: { kind: kind! } }),
  });
  const save = useMutation({
    mutationFn: (a: number[]) => submit({ data: { kind: kind!, answers: a.join("") } }),
    onSuccess: () => {
      setKind(null);
      void qc.invalidateQueries({ queryKey: ["scholar-assessments"] });
    },
  });

  function start(k: AssessmentKind) {
    setKind(k); setStep(0); setAnswers([]); save.reset();
  }
  function answer(v: number) {
    const next = [...answers]; next[step] = v; setAnswers(next);
    const total = QUESTION_COUNT[kind!];
    if (step + 1 < total) setStep(step + 1);
    else save.mutate(next);
  }

  if (kind) {
    const total = QUESTION_COUNT[kind];
    const q = questions.data?.[step];
    return (
      <div className="mx-auto max-w-xl space-y-5 rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {step + 1} of {total}</span>
          <button type="button" className="underline" onClick={() => setKind(null)}>Quit</button>
        </div>
        <div className="h-2 overflow-hidden rounded bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(step / total) * 100}%` }} />
        </div>
        {questions.isError ? (
          <p className="text-sm text-destructive">{(questions.error as Error).message}</p>
        ) : save.isPending ? (
          <p className="text-center">Working out your results…</p>
        ) : save.isError ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-destructive">{(save.error as Error).message}</p>
            <Button onClick={() => save.mutate(answers)}>Try again</Button>
          </div>
        ) : !q ? (
          <p className="text-center text-muted-foreground">Loading questions…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">How would you feel about doing this?</p>
            <h3 className="text-2xl font-semibold">{q.text}</h3>
            <div className="grid gap-2">
              {OPTIONS.map((label, i) => (
                <Button key={label} variant={answers[step] === i + 1 ? "default" : "outline"} onClick={() => answer(i + 1)}>
                  {label}
                </Button>
              ))}
            </div>
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          </>
        )}
      </div>
    );
  }

  const latest = history.data?.[0];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {([["mini", "Quick Interest Profiler", "30 questions · about 5 minutes"], ["full", "Full Interest Profiler", "60 questions · about 12–15 minutes"]] as const).map(([k, title, sub]) => (
          <div key={k} className="space-y-3 rounded-lg border bg-card p-5">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{sub}</p>
            <Button onClick={() => start(k)}>Start</Button>
          </div>
        ))}
      </div>
      {latest && <Result row={latest} />}
      {history.data && history.data.length > 1 && (
        <div>
          <h4 className="mb-2 font-semibold">Past results</h4>
          <ul className="divide-y rounded-lg border text-sm">
            {history.data.slice(1).map((r) => (
              <li key={r.id} className="flex justify-between p-3">
                <span>{new Date(r.created_at).toLocaleDateString("en-ZA")} · {r.kind === "mini" ? "Quick" : "Full"}</span>
                <strong>{hollandCode(r)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Questions and career suggestions come from the O*NET Interest Profiler, by the U.S. Department of Labor.
      </p>
    </div>
  );
}

function Result({ row }: { row: Row }) {
  const max = maxAreaScore(row.kind);
  const matches = matchCareers(row.onet_careers.map((c) => c.title), ROLES);
  return (
    <div className="space-y-5 rounded-lg border bg-card p-6">
      <div>
        <p className="text-sm text-muted-foreground">Your latest result · {new Date(row.created_at).toLocaleDateString("en-ZA")}</p>
        <h3 className="text-2xl font-semibold">Your interest code: {hollandCode(row)}</h3>
      </div>
      <div className="space-y-2">
        {RIASEC.map((a) => (
          <div key={a} className="grid grid-cols-[10rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
            <span>{AREA_LABEL[a]}</span>
            <div className="h-3 overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (row[a] / max) * 100)}%` }} />
            </div>
            <span className="text-right">{row[a]}</span>
          </div>
        ))}
      </div>
      {matches.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold">Careers you can job shadow</h4>
          <div className="flex flex-wrap gap-2">
            {matches.map((r) => (
              <Link key={r.slug} to="/roles" search={{ q: r.title }} className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
                {r.title}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div>
        <h4 className="mb-2 font-semibold">Careers that suit your interests</h4>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {row.onet_careers.slice(0, 12).map((c) => (
            <li key={c.code}>{c.title}{c.bright ? " ★" : ""}</li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted-foreground">★ growing demand</p>
      </div>
    </div>
  );
}
