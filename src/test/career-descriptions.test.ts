import { describe, expect, it } from "vitest";
import descriptions from "@/lib/career-descriptions.json";
import rawRoles from "@/lib/roles.json";
import { getCareerDescription, withCareerDescriptions } from "@/lib/career-descriptions";

describe("Short career descriptions", () => {
  it("covers every published career with concise wording", () => {
    for (const role of rawRoles) {
      expect(getCareerDescription(role.title), role.title).not.toBe("");
    }
    for (const text of Object.values(descriptions)) expect(text.split(/\s+/).length).toBeLessThanOrEqual(40);
  });
  it("preserves custom descriptions and original records", () => {
    const row = { id: 1, name: "Bookkeeper", description: "Custom administrator wording." };
    const result = withCareerDescriptions([row, { id: 2, name: "Accountant", description: null }]);
    expect(result[0]).toEqual(row);
    expect(result[1]?.description).toContain("financial");
    expect(row.description).toBe("Custom administrator wording.");
  });
  it("handles case and spacing without inventing unknown careers", () => {
    expect(getCareerDescription("  ACCOUNTANT ")).toBe(getCareerDescription("Accountant"));
    expect(getCareerDescription("Unknown newly added career")).toBe("");
    expect(getCareerDescription("Test")).toContain("does not describe a real career");
  });
});
