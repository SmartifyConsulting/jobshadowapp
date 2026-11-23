import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleNavigation } from "@/components/RoleNavigation";
afterEach(cleanup);
describe("persistent role navigation", () => {
  it.each([
    ["admin", "Users", "/admin?section=users"],
    ["mentor", "Calendar", "/mentor?section=calendar"],
    ["school", "Overview", "/school?section=overview"],
    ["hr_admin", "Mentors", "/company-report?section=mentors"],
  ])("keeps %s navigation on public/profile screens", (role, label, href) => {
    render(<RoleNavigation roles={[role!]} pathname="/how-to" />);
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
  });
  it("does not duplicate navigation inside an existing portal", () => {
    render(<RoleNavigation roles={["mentor"]} pathname="/mentor" />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
  it("does not show administrative menus to scholars or signed-out viewers", () => {
    const r = render(<RoleNavigation roles={["user"]} pathname="/profile" />);
    expect(screen.queryByRole("navigation")).toBeNull();
    r.rerender(<RoleNavigation roles={[]} pathname="/how-to" />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
  it("preserves Admin priority for multi-role accounts", () => {
    render(<RoleNavigation roles={["school", "mentor", "admin"]} pathname="/roles" />);
    expect(screen.getByRole("link", { name: "Users" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Calendar" })).toBeNull();
  });
});
