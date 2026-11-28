import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }), useNavigate: () => navigate, Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }));
vi.mock("@/components/SiteLayout", () => ({ SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>, useSiteSession: () => ({ data: { user: { id: "returning-scholar" } } }) }));
vi.mock("@/components/RegisterForm", () => ({ RegisterForm: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { Route } from "@/routes/index";
afterEach(cleanup);
it("resumes the scholar journey without forcing the completed profile step", () => {
  const Home = Route.options.component as () => React.JSX.Element;
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: "Book Job Shadow" }));
  expect(navigate).toHaveBeenCalledWith({ to: "/profile", search: { tab: "bookings", entry: "workflow" } });
});
