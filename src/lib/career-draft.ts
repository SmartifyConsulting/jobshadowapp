import { z } from "zod";

const skill = z.string().trim().min(1).max(100);
const draftSchema = z.object({
  description: z.string().trim().min(1).max(3000),
  school_skills: z.array(skill).min(1).max(10),
  workplace_skills: z.array(skill).min(1).max(10),
  ideal_for: z.string().trim().min(1).max(1000),
  specialisations: z.array(skill).min(1).max(12),
  subjects: z.array(skill).min(1).max(10),
});

export type CareerDraft = z.infer<typeof draftSchema>;

export function parseCareerDraft(text: string) {
  try {
    const result = draftSchema.parse(JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")));
    return { ...result, school_skills: [...new Set(result.school_skills)], workplace_skills: [...new Set(result.workplace_skills)] };
  } catch {
    throw new Error("The AI returned an incomplete career draft. Your current content has been preserved; please try again.");
  }
}
