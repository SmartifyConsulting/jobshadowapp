import type { AssessmentKind, RiasecScores } from "./assessment";

const BASE = "https://api-v2.onetcenter.org/mnm/interestprofiler";

async function onet<T>(path: string): Promise<T> {
  const key = process.env["ONET_API_KEY"];
  if (!key) throw new Error("Assessments are not configured yet.");
  const res = await fetch(`${BASE}/${path}`, { headers: { "X-API-Key": key, Accept: "application/json" } });
  if (!res.ok) {
    console.error("O*NET error", res.status, await res.text().catch(() => ""));
    throw new Error("The assessment service is unavailable. Please try again shortly.");
  }
  return (await res.json()) as T;
}

export async function fetchQuestions(kind: AssessmentKind) {
  const total = kind === "mini" ? 30 : 60;
  const d = await onet<{ question: { index: number; area: string; text: string }[] }>(
    `${kind === "mini" ? "questions_30" : "questions"}?start=1&end=${total}`,
  );
  return d.question.map((q) => ({ index: q.index, area: q.area, text: q.text }));
}

export async function scoreAnswers(answers: string) {
  const r = await onet<{ result: { code: string; score: number }[] }>(`results?answers=${answers}`);
  const scores = Object.fromEntries(r.result.map((x) => [x.code, x.score])) as RiasecScores;
  const qs = new URLSearchParams(Object.entries(scores).map(([k, v]) => [k, String(v)]));
  const c = await onet<{ career?: { code: string; title: string; fit: string; tags?: { bright_outlook?: boolean } }[] }>(
    `careers?${qs}&start=1&end=30`,
  );
  const careers = (c.career ?? []).map((x) => ({ code: x.code, title: x.title, fit: x.fit, bright: !!x.tags?.bright_outlook }));
  return { scores, careers };
}
