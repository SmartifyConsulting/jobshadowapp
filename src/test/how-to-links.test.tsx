import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  roles: [] as string[],
  done: [] as boolean[],
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  useSiteSession: () => ({ data: { user: state.user, roles: state.roles } }),
}));
vi.mock("@/components/HowToProgress", () => ({
  useHowToProgress: () => ({ data: { student: state.done, mentor: [], host: [] }, error: null }),
}));
vi.mock("@/components/YouTube", () => ({ YouTube: () => null }));
import { Route } from "@/routes/how-to";
afterEach(() => {
  cleanup();
  state.user = null;
  state.roles = [];
  state.done = [];
});

describe("How To links", () => {
  it("prioritises an existing scholar profile for an Admin/HR user and allows switching guides", () => {
    state.user = { id: "elena-test" };
    state.roles = ["admin", "hr_admin"];
    state.done = [true, true, false, false, false, false, false];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(
      within(screen.getByRole("navigation", { name: "How-to steps" })).getAllByRole("link"),
    ).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Scholars" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Mentors" }));
    expect(
      within(screen.getByRole("navigation", { name: "Vetting and onboarding steps" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(7);
    expect(
      within(screen.getByRole("navigation", { name: "Hosting and feedback steps" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Hosts" }));
    expect(screen.getByRole("link", { name: "Register as a host" })).toHaveAttribute(
      "href",
      "/contact?type=host",
    );
    fireEvent.click(screen.getByRole("button", { name: "Schools" }));
    expect(
      within(screen.getByRole("navigation", { name: "How-to steps" })).getAllByRole("link"),
    ).toHaveLength(7);
    expect(screen.getByRole("link", { name: "Register as a school" })).toHaveAttribute(
      "href",
      "/contact?type=school",
    );
    expect(screen.getByText("School guide")).toBeVisible();
  });
  it("shows a single scholar step frame with a sign-in return link when signed out", () => {
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(screen.getByText(/click on each step to complete it/i)).toBeVisible();
    const links = within(screen.getByRole("navigation", { name: "How-to steps" })).getAllByRole(
      "link",
    );
    expect(links).toHaveLength(8);
    expect(links[0]).toHaveAttribute("href", "/register");
    expect(links[4]).toHaveAttribute("href", "/auth?go=studentPayment");
    expect(links[5]).toHaveAttribute("href", "/auth?go=studentForms");
    expect(screen.getByText("You Are Here")).toBeVisible();
  });
  it("links signed-in scholars directly to each wizard step and marks only verified progress", () => {
    state.user = { id: "student" };
    state.done = [true, true, false, false, false, false, false];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    const links = within(screen.getByRole("navigation", { name: "How-to steps" })).getAllByRole(
      "link",
    );
    expect(links[1]).toHaveAttribute("href", "/profile?tab=bookings&step=profile");
    expect(links[1]).toHaveAccessibleName(/completed/);
    expect(links[5]).toHaveAttribute("href", "/profile?tab=bookings&step=forms");
    expect(links[5]).not.toHaveAccessibleName(/completed/);
  });
  it("shows the mentor step frame instead when the signed-in user is a mentor", () => {
    state.user = { id: "m" };
    state.roles = ["mentor"];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Scholars" })).toBeNull();
    expect(screen.getByText("Onboarding")).toBeVisible();
    expect(screen.getByText("Step 2: Hosting & Feedback")).toBeVisible();
    const links = within(
      screen.getByRole("navigation", { name: "Hosting and feedback steps" }),
    ).getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/mentor?section=settings");
  });
});
