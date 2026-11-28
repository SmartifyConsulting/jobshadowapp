import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
  useNavigate: () => navigate,
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  useSiteSession: () => ({ isPending: false, data: { isAdmin: false, roles: ["user"] } }),
}));
vi.mock("@/components/account/AccountProfile", () => ({
  AccountProfile: () => null,
  useOwnIdentity: () => ({ pending: false, user: { data: { id: "scholar", email: "scholar@example.com" } }, profile: { data: { first_name: "Test", last_name: "Scholar" } } }),
}));
vi.mock("@/components/account/AccountSections", () => ({
  SCHOLAR_DETAIL_TABS: [],
  AccountPanel: ({ withBookings }: { withBookings?: boolean }) => <div>{withBookings ? "Accordion workflow" : "Editable profile"}</div>,
  Bookings: () => <article>Accountant booking card</article>,
}));
vi.mock("@/components/account/ProfilePreview", () => ({ ProfilePreview: () => null }));
vi.mock("@/components/account/ProfileSummaryCard", () => ({ ProfileSummaryCard: () => <div>Scholar identity</div> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { ScholarProfileContent } from "@/routes/_authenticated/profile";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("switches to booking cards inside Profile without navigation or opening the workflow", () => {
  const cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  cache.setQueryData(["scholar-profile", "scholar"], { first_name: "Test", last_name: "Scholar" });
  render(<QueryClientProvider client={cache}><ScholarProfileContent search={{}} /></QueryClientProvider>);
  expect(screen.getByText("Editable profile")).toBeVisible();
  fireEvent.mouseDown(screen.getByRole("tab", { name: "My Bookings" }), { button: 0, ctrlKey: false });
  expect(screen.getByRole("article")).toHaveTextContent("Accountant booking card");
  expect(screen.queryByText("Accordion workflow")).toBeNull();
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Profile" })).toBeVisible();
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Profile" }), { button: 0, ctrlKey: false });
  expect(screen.getByText("Editable profile")).toBeVisible();
});
