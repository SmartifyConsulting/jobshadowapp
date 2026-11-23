import { describe, expect, it } from "vitest";
import { canonicalSchool, schoolDirectory } from "@/lib/school-directory";
import type { AccountRow } from "@/lib/users.server";
const account = (id: string, school: string, country?: string) =>
  ({ id, school, school_country_code: country, roles: ["user"], is_spam: false }) as AccountRow;
describe("reviewed school grouping", () => {
  it("combines reviewed misspellings and counts every scholar once without rewriting profiles", () => {
    const users = [
      account("one", "Reddford house bluehills"),
      account("two", "Reddford House Blue Hills"),
      account("three", "Reddford House Blue Hills"),
    ];
    const original = structuredClone(users);
    const grouped = schoolDirectory(users);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.name).toBe("Reddford House Blue Hills");
    expect(grouped[0]!.scholars).toHaveLength(3);
    expect(grouped[0]!.sourceNames).toEqual([
      "Reddford house bluehills",
      "Reddford House Blue Hills",
    ]);
    expect(users).toEqual(original);
  });
  it("groups punctuation variants and leaves different campuses, school phases and genders separate", () => {
    const grouped = schoolDirectory([
      account("a", "St. Stithians Girls College"),
      account("b", "St Stithians Girls Collage"),
      account("c", "St Stithians Boys College"),
      account("d", "St Stithians College"),
      account("e", "Crawford Preparatory Sandton"),
      account("f", "Crawford College Sandton"),
      account("g", "Crawford International Pretoria"),
    ]);
    expect(grouped).toHaveLength(6);
    expect(grouped.find((s) => s.name === "St Stithians Girls' College")!.scholars).toHaveLength(2);
  });
  it("does not use a South African alias for an explicitly different country", () => {
    expect(canonicalSchool("Kingsmead collage", "GB")).toEqual({
      name: "Kingsmead collage",
      country: "GB",
    });
    expect(
      schoolDirectory([
        account("a", "Kingsmead College", "ZA"),
        account("b", "Kingsmead College", "GB"),
      ]),
    ).toHaveLength(2);
  });
  it("does not guess a campus from a brand-only entry", () => {
    expect(
      schoolDirectory([
        account("a", "Curro"),
        account("b", "Curro Waterfall"),
        account("c", "Curro Krugersdorp"),
      ]),
    ).toHaveLength(3);
  });
  it("combines the user-confirmed Kitso, Parktown Girls and Roedean SA variants", () => {
    const names = [
      "Kitso Ya Boleng",
      "KYB",
      "KYB Academy",
      "Kitso Ya Boleng TEPP",
      "Kitso Ya Boleng Academy.",
      "Kitso Ya Boleng NPC",
      "Kitso ya boleng bridging school",
      "Parktown Girls",
      "Parktown Girls High Schools",
      "Parktown High School for Girls",
      "Roedean",
      "Roedean (SA)",
      "Roedean school",
      "Roedean School (SA)",
    ];
    const groups = schoolDirectory(names.map((name, index) => account(String(index), name)));
    expect(groups.map((group) => [group.name, group.scholars.length])).toEqual([
      ["Kitso Ya Boleng", 7],
      ["Parktown High School for Girls", 3],
      ["Roedean School (SA)", 4],
    ]);
    expect(
      schoolDirectory([account("sa", "Roedean", "ZA"), account("uk", "Roedean", "GB")]),
    ).toHaveLength(2);
    expect(canonicalSchool("Parktown Boys High School").name).toBe("Parktown Boys High School");
  });
});
