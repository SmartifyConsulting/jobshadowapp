import { describe, expect, it } from "vitest";
import { hollandCode, matchCareers, maxAreaScore } from "@/lib/assessment";

describe("assessment", () => {
  it("builds the top-three Holland code", () => {
    expect(hollandCode({ realistic: 1, investigative: 9, artistic: 7, social: 5, enterprising: 2, conventional: 0 })).toBe("IAS");
  });
  it("max score per area matches the quiz length", () => {
    expect(maxAreaScore("mini")).toBe(20);
    expect(maxAreaScore("full")).toBe(40);
  });
  it("matches O*NET titles to JobShadow careers by word", () => {
    const r = matchCareers(["Civil Engineers", "Accountants & Auditors"], [{ title: "Civil Engineer" }, { title: "Chef" }, { title: "Accountant" }]);
    expect(r.map((c) => c.title).sort()).toEqual(["Accountant", "Civil Engineer"]);
  });
});
