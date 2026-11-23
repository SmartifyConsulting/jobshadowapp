import { describe, expect, it } from "vitest";
import descriptions from "@/lib/career-descriptions.json";
import { getCareerSkills } from "@/lib/career-skills";
import { parseCareerDraft } from "@/lib/career-draft";

describe("Career skills", () => {
  it("covers every real catalogue career with school and workplace skills", () => {
    for (const name of Object.keys(descriptions).filter((name) => name !== "Test")) {
      const skills = getCareerSkills(name);
      expect(skills.school.length, name).toBeGreaterThanOrEqual(3);
      expect(skills.workplace.length, name).toBeGreaterThanOrEqual(3);
      expect(new Set(skills.workplace).size, name).toBe(skills.workplace.length);
    }
    expect(getCareerSkills("Test")).toEqual({ school: [], workplace: [] });
  });
  it("keeps aliases consistent and gives unknown new careers no invented requirements", () => {
    expect(getCareerSkills("Book Keeper")).toEqual(getCareerSkills("Bookkeeper"));
    expect(getCareerSkills("Unknown new career")).toEqual({ school: [], workplace: [] });
    expect(getCareerSkills("Mechanical Engineer").workplace).toContain("CAD design");
  });
  it("respects edited and explicitly cleared lists while falling back for NULL", () => {
    expect(getCareerSkills("Accountant", ["  Research  ", "Research"], [])).toEqual({ school: ["Research"], workplace: [] });
    expect(getCareerSkills("Accountant", null, null).workplace).toContain("Financial reporting");
  });
  it("validates structured AI drafts before replacing any content", () => {
    const draft = { description: "Draft description", ideal_for: "People who enjoy technical problems.", specialisations: ["Design Engineer"], subjects: ["Mathematics"], school_skills: ["Mathematics"], workplace_skills: ["CAD design", "CAD design"], interpersonal_skills: ["Teamwork"], recommended_courses: ["BEng Mechanical"], self_directed_learning: ["Free CAD tutorials on YouTube"], future_outlook: "Automation will change routine design tasks.", ai_exposure_level: "medium" as const, ai_exposure_note: "AI can generate draft CAD models, but validation and client sign-off stay human." };
    expect(parseCareerDraft("```json\n" + JSON.stringify(draft) + "\n```").workplace_skills).toEqual(["CAD design"]);
    expect(() => parseCareerDraft('{"description":"Only a description"}')).toThrow("preserved");
    expect(() => parseCareerDraft("not json")).toThrow("preserved");
  });
});
