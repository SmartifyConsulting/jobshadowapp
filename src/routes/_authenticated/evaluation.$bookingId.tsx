import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/_authenticated/evaluation/$bookingId")({
  head: () => ({
    meta: [{ title: "Evaluation | JobShadow" }, { name: "robots", content: "noindex" }],
  }),
  component: EvaluationForm,
});

type Question = { label: string };
const MENTOR_QUESTIONS: Question[] = [
  { label: "I was well prepared to be a Job Mentor." },
  { label: "I felt that I was helpful in helping the scholar understand important aspects of my job." },
  { label: "I was at ease interacting with my scholar throughout the day." },
  { label: "I enjoyed my experience and would be willing to do it again." },
  { label: "I would recommend job shadowing to other employees." },
  { label: "The scholar seemed well prepared for the shadowing experience, and met code of conduct." },
];
const SCHOLAR_QUESTIONS: Question[] = [
  { label: "My job shadowing experience helped me to think about career options." },
  { label: "I learned what the general expectations are for all employees at the site." },
  { label: "I enjoyed my Job Shadow experience." },
  { label: "I would recommend jobshadow.co.za for other scholars' job shadowing experiences." },
];

function EvaluationForm() {
  const { bookingId } = Route.useParams();
  const context = useQuery({
    queryKey: ["evaluation-context", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_evaluation_context", { _booking: bookingId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        {context.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : context.error ? (
          <p className="text-sm text-destructive">{(context.error as Error).message}</p>
        ) : !context.data ? (
          <p className="text-sm text-muted-foreground">Evaluation not found.</p>
        ) : (
          <EvaluationBody bookingId={bookingId} ctx={context.data} />
        )}
      </section>
    </SiteLayout>
  );
}

function EvaluationBody({ bookingId, ctx }: { bookingId: string; ctx: { career: string; company: string; shadow_date: string; viewer_role: string; already_submitted: boolean } }) {
  const isMentor = ctx.viewer_role === "mentor";
  const questions = isMentor ? MENTOR_QUESTIONS : SCHOLAR_QUESTIONS;
  const [ratings, setRatings] = useState<number[]>(() => Array(questions.length).fill(0));
  const [continueText, setContinueText] = useState("");
  const [stopText, setStopText] = useState("");
  const [startText, setStartText] = useState("");
  const [extraText, setExtraText] = useState("");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(ctx.already_submitted);

  async function submit() {
    if (ratings.some((r) => r === 0)) return setErr("Please rate every statement before submitting.");
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("submit_evaluation", {
      _booking: bookingId, _role: ctx.viewer_role, _ratings: ratings,
      _continue: continueText || null, _stop: stopText || null, _start: startText || null,
      _extra: extraText || null, _comments: comments || null,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-primary/30 bg-muted/30 p-6 text-center">
        <h1 className="font-display text-2xl">Thank you!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your evaluation has been recorded. We appreciate your feedback.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl uppercase">{isMentor ? "Job Mentor" : "Job Shadower"} Evaluation Form</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Thank you for participating in the job shadowing! Please complete this brief evaluation of your experience as{" "}
        <strong>{ctx.career}</strong> at <strong>{ctx.company}</strong> on {ctx.shadow_date}, so we can continue to improve the program.
      </p>

      <div className="mt-8 space-y-6">
        <p className="text-sm font-semibold">Please rate the following from 1 (strongly disagree) to 6 (strongly agree).</p>
        {questions.map((q, i) => (
          <div key={i} className="border-b border-border pb-4">
            <p className="text-sm">{q.label}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Disagree</span>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n} type="button" aria-pressed={ratings[i] === n}
                  onClick={() => setRatings((r) => r.map((v, idx) => (idx === i ? n : v)))}
                  className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold transition ${ratings[i] === n ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary/50"}`}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-muted-foreground">Agree</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        <p className="text-sm font-semibold">For successful job shadowing experiences in the future:</p>
        <label className="block text-sm">
          What should {isMentor ? "we" : "the Job Mentor"} continue to do?
          <textarea value={continueText} onChange={(e) => setContinueText(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-2 text-sm outline-none" />
        </label>
        <label className="block text-sm">
          What should we stop doing?
          <textarea value={stopText} onChange={(e) => setStopText(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-2 text-sm outline-none" />
        </label>
        <label className="block text-sm">
          What should we start doing?
          <textarea value={startText} onChange={(e) => setStartText(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-2 text-sm outline-none" />
        </label>
        <label className="block text-sm">
          {isMentor ? "How could we (jobshadow.co.za) better support you throughout your experience?" : "Will the job shadowing experience change what you do when you return to school? How?"}
          <textarea value={extraText} onChange={(e) => setExtraText(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-2 text-sm outline-none" />
        </label>
        <label className="block text-sm">
          Any additional comments?
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-2 text-sm outline-none" />
        </label>
      </div>

      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      <button onClick={submit} disabled={busy} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50">
        {busy ? "Submitting…" : "Submit Evaluation"}
      </button>
    </div>
  );
}
