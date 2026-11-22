import { describe, expect, it } from "vitest";
import { getCareerGuidance } from "@/lib/career-guidance";

describe("Structured career guidance", () => {
  it("provides editable catalogue defaults and keeps explicit empty overrides", () => {
    const accountant = getCareerGuidance("Accountant", "Role description");
    expect(accountant.specialisations).toHaveLength(6);
    expect(accountant.subjects).toContain("Accounting");
    const edited = getCareerGuidance("Accountant", "Role description", { ideal_for: "Saved guidance", specialisations: ["Saved role"], subjects: [] });
    expect(edited.idealFor).toBe("Saved guidance");
    expect(edited.specialisations).toEqual(["Saved role"]);
    expect(edited.subjects).toEqual([]);
  });
  it("retains specialisations already authored in old descriptions", () => {
    expect(getCareerGuidance("New career", "Explore **One role**, **Another role**.").specialisations).toEqual(["One role", "Another role"]);
    expect(getCareerGuidance("Accountant", "Records financial transactions.\n\n**Tax Accountant**, **Auditor**").overview).toBe("Records financial transactions.");
    expect(getCareerGuidance("New career", "Works with **software** systems.").overview).toBe("Works with **software** systems.");
  });
});
