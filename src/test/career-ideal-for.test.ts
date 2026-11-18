import { describe, expect, it } from "vitest";
import descriptions from "@/lib/career-descriptions.json";
import { ROLES } from "@/lib/data";
import { getCareerIdealFor } from "@/lib/career-ideal-for";

describe("Career suitability guidance", () => {
  it("covers every published career and real catalogue entry", () => {
    for (const role of ROLES) expect(role.idealFor, role.title).not.toBe("");
    for (const name of Object.keys(descriptions).filter((name) => name !== "Test")) {
      expect(getCareerIdealFor(name), name).not.toBe("");
      expect(getCareerIdealFor(name).split(/\s+/).length).toBeLessThanOrEqual(35);
    }
  });
  it("keeps aliases consistent and does not invent a profile for an unknown or test career", () => {
    expect(getCareerIdealFor("  ACCOUNTANT ")).toBe(getCareerIdealFor("Accountant"));
    expect(getCareerIdealFor("Book Keeper")).toBe(getCareerIdealFor("Bookkeeper"));
    expect(getCareerIdealFor("Accountant")).not.toBe(getCareerIdealFor("Software Developer"));
    expect(getCareerIdealFor("An unknown career")).toBe("");
    expect(getCareerIdealFor("Test")).toBe("");
  });
});
