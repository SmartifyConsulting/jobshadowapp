import { describe, expect, it } from "vitest";
import { buildSupportCareerContext } from "@/lib/support-careers";
import { dominantImageColour } from "@/lib/image-colour";

describe("Reddy career reference", () => {
  it("uses saved career guidance, training and new careers without including private fields", () => {
    const result = JSON.parse(
      buildSupportCareerContext(
        [
          {
            name: "Accountant",
            description: "Admin edited overview",
            school_skills: ["Numeracy"],
            ideal_for: "Careful thinkers",
            subjects: ["Accounting"],
            specialisations: ["Auditor"],
          },
        ],
        [
          {
            name: "Accountant",
            interpersonal_skills: ["Client communication"],
            recommended_courses: ["BCom Accounting"],
            self_directed_learning: ["Practise bookkeeping"],
            future_outlook: "Evolving tools",
            ai_exposure_level: "medium",
            ai_exposure_note: "Routine tasks can be automated",
            secret: "DO NOT INCLUDE",
          },
          { name: "New Career", description: "A newly added role" },
        ],
        "What training and skills does an accountant need?",
      ),
    );
    const row = result.details.find((row: { name: string }) => row.name === "Accountant");
    expect(row).toMatchObject({
      description: "Admin edited overview",
      subjects: ["Accounting"],
      interpersonal_skills: ["Client communication"],
      recommended_courses: ["BCom Accounting"],
      ideal_for: "Careful thinkers",
      ai_exposure_level: "medium",
    });
    expect(result.directory).toContainEqual({ name: "New Career", sector: "Other Careers" });
    expect(JSON.stringify(result)).not.toContain("DO NOT INCLUDE");
  });
  it("retrieves a previous career for a follow-up question and retains explicitly empty lists", () => {
    const result = JSON.parse(
      buildSupportCareerContext(
        [{ name: "Accountant", subjects: [] }],
        [],
        "Tell me about Accountant\nAnd which subjects?",
      ),
    );
    expect(
      result.details.find((row: { name: string }) => row.name === "Accountant").subjects,
    ).toEqual([]);
  });
});
it("fills avatar gaps with the dominant colour, ignoring transparent pixels", () => {
  expect(dominantImageColour([200, 0, 0, 255, 202, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 0])).toBe(
    "rgb(201, 0, 0)",
  );
});
