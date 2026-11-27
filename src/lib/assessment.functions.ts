import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchQuestions, scoreAnswers } from "./assessment.server";

const kind = z.enum(["mini", "full"]);

export const getAssessmentQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind }).parse(d))
  .handler(async ({ data }) => fetchQuestions(data.kind));

export const submitAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ kind, answers: z.string().regex(/^[1-5]+$/) })
      .refine((v) => v.answers.length === (v.kind === "mini" ? 30 : 60), "Answer every question")
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { scores, careers } = await scoreAnswers(data.answers);
    const { error } = await (context.supabase as unknown as { from: (t: string) => { insert: (r: object) => Promise<{ error: unknown }> } })
      .from("scholar_assessments")
      .insert({ user_id: context.userId, kind: data.kind, answers: data.answers, ...scores, onet_careers: careers });
    if (error) {
      console.error(error);
      throw new Error("Could not save your results.");
    }
    return { scores, careers };
  });
