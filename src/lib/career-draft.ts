import { z } from "zod";

const skill = z.string().trim().min(1).max(100);
const draftSchema = z.object({
  description: z.string().trim().min(1).max(3000),
  school_skills: z.array(skill).min(1).max(10),
  workplace_skills: z.array(skill).min(1).max(10),
  ideal_for: z.string().trim().min(1).max(1000),
  specialisations: z.array(skill).min(1).max(12),
  subjects: z.array(skill).min(1).max(10),
  interpersonal_skills: z.array(skill).min(1).max(8),
  recommended_courses: z.array(skill).min(1).max(8),
  self_directed_learning: z.array(skill).min(1).max(8),
  future_outlook: z.string().trim().min(1).max(800),
  ai_exposure_level: z.enum(["low", "medium", "high"]),
  ai_exposure_note: z.string().trim().min(1).max(500),
});

export type CareerDraft = z.infer<typeof draftSchema>;
export const CAREER_DRAFT_FIELDS = ["description", "school_skills", "workplace_skills", "ideal_for", "specialisations", "subjects", "interpersonal_skills", "recommended_courses", "self_directed_learning", "future_outlook", "ai_exposure_level", "ai_exposure_note"] as const;
export type CareerDraftField = typeof CAREER_DRAFT_FIELDS[number];

export function missingCareerFields(content: Record<string, unknown>): CareerDraftField[] {
  return CAREER_DRAFT_FIELDS.filter((key) => {
    const value = content[key];
    return Array.isArray(value) ? !value.some((item) => typeof item === "string" && item.trim()) : typeof value !== "string" || !value.trim();
  });
}

/** Re-check at application time so an edit made while AI was working is preserved. */
export function careerDraftPatch(current: Record<string, unknown>, generated: Partial<CareerDraft>, regenerate = false): Partial<CareerDraft> {
  const allowed = new Set(regenerate ? CAREER_DRAFT_FIELDS : missingCareerFields(current));
  return Object.fromEntries(Object.entries(generated).filter(([key]) => allowed.has(key as CareerDraftField))) as Partial<CareerDraft>;
}

export function parseCareerDraft(text: string, fields: readonly CareerDraftField[] = CAREER_DRAFT_FIELDS): Partial<CareerDraft> {
  try {
    const raw = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
    return Object.fromEntries(fields.map((key) => {
      const value = draftSchema.shape[key].parse(raw[key]);
      return [key, Array.isArray(value) ? [...new Set(value)] : value];
    })) as Partial<CareerDraft>;
  } catch {
    throw new Error("The AI returned an incomplete career draft. Your current content has been preserved; please try again.");
  }
}
