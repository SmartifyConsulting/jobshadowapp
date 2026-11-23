import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }), useNavigate: () => navigate, Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }));
vi.mock("@/components/SiteLayout", () => ({ SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>, useSiteSession: () => ({ data: { user: { id: "scholar-admin" }, isAdmin: true, roles: ["admin", "hr_admin"] } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { Route } from "@/routes/index";
afterEach(() => { cleanup(); navigate.mockClear(); });
it("opens the student wizard from Book Job Shadow even when the scholar also has admin access", () => {
  const Home = Route.options.component as () => React.JSX.Element;
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: "Book Job Shadow" }));
  expect(navigate).toHaveBeenCalledWith({ to: "/profile", search: { tab: "bookings", step: "profile" } });
});
