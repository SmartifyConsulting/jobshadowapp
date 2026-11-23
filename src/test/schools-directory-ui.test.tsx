import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SchoolsDirectory } from "@/components/SchoolsDirectory";
import type { AccountRow } from "@/lib/users.server";
afterEach(cleanup);
describe("expandable school scholars", () => {
  it("shows collapsed school totals, then the scholars as children without repeating headings", () => {
    const accounts = [
      {
        id: "one",
        school: "Kitso Ya Boleng",
        roles: ["user"],
        full_name: "Amy Scholar",
        email: "amy@example.com",
        is_spam: false,
      },
      {
        id: "two",
        school: "KYB Academy",
        roles: ["user"],
        full_name: "Ben Scholar",
        email: "ben@example.com",
        is_spam: false,
      },
      {
        id: "three",
        school: "Roedean school",
        roles: ["user"],
        full_name: "Cleo Scholar",
        email: "cleo@example.com",
        is_spam: false,
      },
    ] as AccountRow[];
    render(
      <SchoolsDirectory
        accounts={accounts}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        busyId={null}
      />,
    );
    const school = screen.getByRole("button", { name: "Kitso Ya Boleng" });
    expect(school).toHaveAttribute("aria-expanded", "false");
    expect(school.closest("tr")).toHaveTextContent("2");
    expect(screen.queryByText("Amy Scholar")).toBeNull();
    fireEvent.click(school);
    expect(school).toHaveAttribute("aria-expanded", "true");
    const children = screen.getByRole("list", { name: "Scholars at Kitso Ya Boleng" });
    expect(within(children).getAllByRole("listitem")).toHaveLength(2);
    expect(within(children).getByText("Amy Scholar")).toBeVisible();
    expect(within(children).getByText("ben@example.com")).toBeVisible();
    expect(screen.queryByText("Cleo Scholar")).toBeNull();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    fireEvent.click(school);
    expect(screen.queryByText("Amy Scholar")).toBeNull();
    expect(school.closest("tr")).toHaveTextContent("2");
    expect(accounts[1]!.school).toBe("KYB Academy");
  });
});
