import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  roles: [] as string[],
  done: [] as boolean[],
  guide: undefined as "company" | undefined,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
    useSearch: () => ({ guide: state.guide }),
  }),
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  useSiteSession: () => ({ data: { user: state.user, roles: state.roles } }),
}));
vi.mock("@/components/HowToProgress", () => ({
  useHowToProgress: () => ({ data: { student: state.done, mentor: [], host: [] }, error: null }),
}));
vi.mock("@/components/YouTube", () => ({ YouTube: () => null }));
vi.mock("@/routes/_authenticated/profile", () => ({
  ScholarProfileContent: ({ embedded }: { embedded: boolean }) => (
    <div role="region" aria-label="Scholar accordion journey">
      {embedded ? "Inline profile and booking steps" : "Standalone"}
    </div>
  ),
}));
import { Route } from "@/routes/how-to";
afterEach(() => {
  cleanup();
  state.user = null;
  state.roles = [];
  state.done = [];
  state.guide = undefined;
});

describe("How To links", () => {
  it("explains the company journey and keeps KYB separate from mentor verification", () => {
    state.user = { id: "company" };
    state.roles = ["hr_admin"];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(screen.getByRole("button", { name: "Companies" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const links = within(screen.getByRole("navigation", { name: "How-to steps" })).getAllByRole(
      "link",
    );
    expect(links).toHaveLength(6);
    expect(links[0]).toHaveAccessibleName(/completed/);
    expect(links[1]).toHaveAccessibleName("Verify your business (KYB)");
    expect(links[1]).not.toHaveAccessibleName(/completed/);
    expect(links[2]).toHaveAttribute("href", "/company-report?section=mentors");
    expect(links[5]).toHaveAttribute("href", "/company-report?section=csi");
    expect(links[1]).toHaveAttribute("href", "/contact");
    expect(links[3]).toHaveAttribute("href", "/how-to?guide=mentor");
    expect(screen.queryByRole("heading", { name: "1. Register your company" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mentors" }));
    expect(screen.getByRole("navigation", { name: "Vetting and onboarding steps" })).toBeVisible();
  });

  it("offers the company explanation before registration", () => {
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Companies" }));
    expect(screen.getByRole("link", { name: "Register your company" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.queryByRole("link", { name: /completed/ })).toBeNull();
  });

  it("prioritises an existing scholar profile for an Admin/HR user and allows switching guides", () => {
    state.user = { id: "elena-test" };
    state.roles = ["admin", "hr_admin"];
    state.done = [true, true, false, false, false, false, false];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(
      within(screen.getByRole("navigation", { name: "How-to steps" })).getAllByRole("link"),
    ).toHaveLength(10);
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
    expect(screen.queryByRole("button", { name: /Hosts/ })).toBeNull();
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
    expect(links).toHaveLength(10);
    expect(links[0]).toHaveAttribute("href", "/register");
    expect(links[4]).toHaveAttribute("href", "/auth?go=studentPayment");
    expect(links[5]).toHaveAttribute("href", "/auth?go=studentForms");
    expect(links[6]).toHaveAttribute("href", "/auth?go=studentIdentity");
    expect(links[7]).toHaveAttribute("href", "/auth?go=studentConfirmation");
    expect(screen.getByText("You Are Here")).toBeVisible();
  });
  it("shows the actual inline scholar journey without audience tabs even with a company guide URL", async () => {
    state.user = { id: "raphaela" };
    state.roles = ["user"];
    state.guide = "company";
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(
      await screen.findByRole("region", { name: "Scholar accordion journey" }),
    ).toHaveTextContent("Inline profile and booking steps");
    expect(screen.queryByRole("button", { name: "Scholars" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mentors" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Companies" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "How-to steps" })).toBeNull();
  });
  it("shows the mentor step frame instead when the signed-in user is a mentor", () => {
    state.user = { id: "m" };
    state.roles = ["mentor"];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Scholars" })).toBeNull();
    expect(screen.getByText("Step 1: Onboarding")).toBeVisible();
    expect(screen.getByText("Step 2: Hosting & Feedback")).toBeVisible();
    const links = within(
      screen.getByRole("navigation", { name: "Hosting and feedback steps" }),
    ).getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/mentor?section=settings");
  });
});

it("opens public company benefits directly without signing in and separates reach from mentor hours", () => {
  state.guide = "company";
  const Page = Route.options.component as () => React.JSX.Element;
  render(<Page />);
  expect(screen.getByRole("heading", { name: "Why Companies Participate" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Support Skills Development" })).toBeVisible();
  expect(screen.getByText("R1,000")).toBeVisible();
  expect(screen.getByText("R10,000")).toBeVisible();
  expect(screen.getByText(/Figures are not cash reimbursements/)).toBeVisible();
  expect(screen.getByRole("link", { name: "Discuss Company Participation" })).toHaveAttribute(
    "href",
    "/contact?type=host#contact-form",
  );
  fireEvent.click(screen.getByRole("button", { name: "Scholars" }));
  expect(screen.queryByRole("heading", { name: "Why Companies Participate" })).toBeNull();
});
