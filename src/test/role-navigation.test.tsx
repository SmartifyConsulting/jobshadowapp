import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleNavigation } from "@/components/RoleNavigation";
afterEach(cleanup);
describe("portal-only role navigation", () => {
  it.each([
    ["admin", "Users", "/admin?section=users"],
    ["school", "Overview", "/school?section=overview"],
    ["hr_admin", "Mentors", "/company-report?section=mentors"],
  ])("shows %s navigation inside the matching portal", (role, label, href) => {
    render(<RoleNavigation roles={[role!]} pathname={href!.split("?")[0]!} />);
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
  });
  it.each(["admin", "mentor", "school", "hr_admin"])(
    "keeps %s sidebars off Home and public/profile pages",
    (role) => {
      const view = render(<RoleNavigation roles={[role]} pathname="/" />);
      expect(screen.queryByRole("navigation")).toBeNull();
      for (const pathname of ["/roles", "/how-to", "/profile"]) {
        view.rerender(<RoleNavigation roles={[role]} pathname={pathname} />);
        expect(screen.queryByRole("navigation")).toBeNull();
      }
    },
  );
  it("keeps the mentor portal free of a sidebar", () => {
    render(<RoleNavigation roles={["mentor"]} pathname="/mentor" />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
  it("does not show a menu for an unrelated portal", () => {
    render(<RoleNavigation roles={["mentor"]} pathname="/admin" />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
  it("does not show administrative menus to scholars or signed-out viewers", () => {
    const r = render(<RoleNavigation roles={["user"]} pathname="/profile" />);
    expect(screen.queryByRole("navigation")).toBeNull();
    r.rerender(<RoleNavigation roles={[]} pathname="/how-to" />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
  it("matches the visited portal for multi-role accounts", () => {
    render(<RoleNavigation roles={["school", "mentor", "admin"]} pathname="/admin" />);
    expect(screen.getByRole("link", { name: "Users" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Calendar" })).toBeNull();
  });
});
