import { describe, expect, it } from "vitest";
import { CAREER_DRAFT_FIELDS, careerDraftPatch, missingCareerFields, parseCareerDraft } from "@/lib/career-draft";

describe("AI career content protection", () => {
  it("requests only blank fields, treating whitespace and empty lists as missing", () => {
    const missing = missingCareerFields({ description: "Existing description", school_skills: ["Numeracy"], interpersonal_skills: ["  "], recommended_courses: "  " });
    expect(missing).not.toContain("description"); expect(missing).not.toContain("school_skills");
    expect(missing).toContain("interpersonal_skills"); expect(missing).toContain("recommended_courses");
    expect(missingCareerFields(Object.fromEntries(CAREER_DRAFT_FIELDS.map((key) => [key, "Populated"])))).toEqual([]);
  });
  it("validates only requested output and discards attempts to replace other fields", () => {
    expect(parseCareerDraft(JSON.stringify({ description: "Replacement", interpersonal_skills: ["Teamwork", "Teamwork"] }), ["interpersonal_skills"])).toEqual({ interpersonal_skills: ["Teamwork"] });
    expect(() => parseCareerDraft('{}', ["interpersonal_skills"])).toThrow("preserved");
  });
  it("preserves existing content and edits made while AI was working", () => {
    const generated = { description: "AI replacement", interpersonal_skills: ["AI teamwork"], recommended_courses: ["Course"] };
    const current = { description: "Original", interpersonal_skills: ["Admin's new edit"] };
    expect(careerDraftPatch(current, generated)).toEqual({ recommended_courses: ["Course"] });
    expect(careerDraftPatch(current, generated, true)).toEqual(generated);
  });
});
