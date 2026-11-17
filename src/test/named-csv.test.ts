import { describe, expect, it } from "vitest";
import { parseCsv, planNamedCsv } from "@/lib/named-csv";

describe("Career and sector CSV imports", () => {
  it("reads quoted commas, escaped quotes, BOMs and embedded newlines", () => {
    expect(parseCsv('\uFEFFName,Description\r\n"Engineering, Mining","A ""quoted"" description\ncontinued"')).toEqual([["Name", "Description"], ["Engineering, Mining", 'A "quoted" description\ncontinued']]);
  });
  it("updates descriptions by exact existing name and creates missing names without needing IDs", () => {
    const plan = planNamedCsv('Name,Description\nAccountant,Updated description\nEngineer,New description', [{ id: 1, name: "Accountant" }], true);
    expect(plan.updates).toEqual([{ id: 1, description: "Updated description" }]);
    expect(plan.creates).toEqual([{ id: 2, name: "Engineer", description: "New description" }]);
  });
  it("never renames an existing record or resolves ambiguous names arbitrarily", () => {
    expect(() => planNamedCsv('ID,Name\n1,Unrelated name', [{ id: 1, name: "Accountant" }], true)).toThrow("different name");
    expect(() => planNamedCsv('Name\nAccountant', [{ id: 1, name: "Accountant" }, { id: 2, name: "Accountant" }], true)).toThrow("ambiguous");
    expect(() => planNamedCsv('ID,Name\n3,Accountant', [{ id: 1, name: "Accountant" }], true)).toThrow("different ID");
  });
  it("preserves sector records and ignores description columns for sectors", () => {
    const plan = planNamedCsv('Sector Name,Description\nHealth,Ignored\nTechnology,Ignored', [{ id: 2, name: "Health" }], false);
    expect(plan.updates).toEqual([]); expect(plan.unchanged).toBe(1);
    expect(plan.creates).toEqual([{ id: 3, name: "Technology" }]);
  });
  it("rejects malformed rows and duplicate names before any write", () => {
    expect(() => parseCsv('Name\n"Not closed')).toThrow("not closed");
    expect(() => planNamedCsv('Name\nA\nA', [], false)).toThrow("more than once");
    expect(() => planNamedCsv('ID,Name\nbad,A', [], false)).toThrow("whole number");
  });
});
