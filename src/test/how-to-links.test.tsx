import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const state = vi.hoisted(() => ({ user: null as null | { id: string }, done: [] as boolean[] }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
vi.mock("@/components/SiteLayout", () => ({ SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>, useSiteSession: () => ({ data: { user: state.user, roles: [] } }) }));
vi.mock("@/components/HowToProgress", () => ({ useHowToProgress: () => ({ data: { student: state.done, mentor: [], host: [] }, error: null }) }));
vi.mock("@/components/YouTube", () => ({ YouTube: () => null }));
import { Route } from "@/routes/how-to";
afterEach(() => { cleanup(); state.user = null; state.done = []; });

describe("How To links", () => {
  it("provides sign-in return links to the selected student step", () => {
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    const links = within(screen.getByRole("navigation", { name: "For Students" })).getAllByRole("link");
    expect(links).toHaveLength(7);
    expect(links[0]).toHaveAttribute("href", "/register");
    expect(links[4]).toHaveAttribute("href", "/auth?go=studentForms");
  });
  it("links signed-in users directly to each wizard step and marks only verified progress", () => {
    state.user = { id: "student" }; state.done = [true, true, false, false, false, false, false];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    const links = within(screen.getByRole("navigation", { name: "For Students" })).getAllByRole("link");
    expect(links[1]).toHaveAttribute("href", "/profile?tab=bookings&step=profile");
    expect(links[1]).toHaveAccessibleName(/completed/);
    expect(links[4]).toHaveAttribute("href", "/profile?tab=bookings&step=forms");
    expect(links[4]).not.toHaveAccessibleName(/completed/);
    expect(within(screen.getByRole("navigation", { name: "For Hosts" })).getAllByRole("link")[2]).toHaveAttribute("href", "/mentor?section=settings");
  });
});
