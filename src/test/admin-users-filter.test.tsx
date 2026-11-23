import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountRow } from "@/lib/users.server";

vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/users.functions", () => ({ getAccounts: vi.fn(), updateAccount: vi.fn(), removeAccount: vi.fn(), createAccount: vi.fn() }));
vi.mock("@/lib/public-holidays.functions", () => ({ lookupPublicHolidays: vi.fn() }));
vi.mock("@/lib/email.functions", () => ({ sendQueuedEmails: vi.fn() }));
vi.mock("@/lib/career-ai.functions", () => ({ draftCareerDescription: vi.fn() }));
vi.mock("@/lib/csv-import.functions", () => ({ mapCsvColumns: vi.fn() }));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/lib/indemnity-ai.functions", () => ({ extractCompanyIndemnity: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { AdminUsers, Route, BookingSettings, CareerDescriptionField } from "@/routes/_authenticated/admin";
import { draftCareerDescription } from "@/lib/career-ai.functions";
import { accountInitial, alphabetInitial } from "@/lib/alphabet";

const account = (id: string, name: string): AccountRow => ({
  id, email: id + "@example.com", created_at: "2026-11-01T00:00:00Z", role: "mentor", roles: ["user", "mentor"],
  display_name: name, full_name: null, avatar_path: null, contact_no: null, school: null, id_number: null,
  applications: [], id_file_path: null, photo_path: null, id_verified: null, has_profile: false,
  has_scholar_profile: false, is_spam: false, booking_count: 0,
});
function mount(extra: AccountRow[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["admin", "accounts"], [account("alice", "Alice Brown"), account("bob", "Bob Adams"), ...extra]);
  const companies = [{ id: 1, company: "Group Company", mentor_name: "Alice Brown", mentor_email: "alice@example.com", backup_mentor_name: "Bob Adams", backup_mentor_email: "bob@example.com" }, { id: 2, company: "Solo Company", mentor_name: "Solo Person", mentor_email: "solo@example.com", backup_mentor_name: null, backup_mentor_email: null }];
  client.setQueryData(["admin", "company-contact-classification"], companies);
  client.setQueryData(["admin", "companies", false], companies);
  render(<QueryClientProvider client={client}><AdminUsers /></QueryClientProvider>);
  return client;
}
afterEach(cleanup);

describe("User alphabet chips", () => {
  it("keeps unassigned accounts out of Students and lists them under Unclassified", () => {
    const unknown = { ...account("unknown", "Unknown Person"), role: null, roles: [] };
    const client = mount([unknown]);
    expect(screen.getByRole("tab", { name: "Students (2)" })).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Unclassified (1)" }), { button: 0 });
    fireEvent.click(screen.getByRole("button", { name: "U" }));
    expect(screen.getByRole("button", { name: "View details for Unknown Person" })).toBeVisible();
    client.clear();
  });
  it("opens the selected displayed-name group and supports switching and re-opening", () => {
    const client = mount();
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(screen.getByRole("button", { name: "View details for Alice Brown" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "View details for Bob Adams" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "View details for Bob Adams" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { expanded: true }));
    expect(screen.queryByRole("button", { name: "View details for Bob Adams" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "View details for Bob Adams" })).toBeVisible();
    client.clear();
  });
  it("keeps the letter filter when switching to cards and clears it with All", () => {
    const client = mount();
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    fireEvent.click(screen.getByRole("button", { name: "Cards" }));
    expect(screen.getByRole("button", { name: "Alice Brown" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Bob Adams" })).not.toBeInTheDocument();
    expect(screen.getByText("Host", { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("heading", { name: "Users (2)" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "Bob Adams" })).toBeVisible();
    client.clear();
  });
  it("filters role tabs without dropping multi-role accounts", () => {
    const school = { ...account("school", "School Contact"), role: "school" as const, roles: ["school" as const] };
    const client = mount([school]);
    expect(screen.getByRole("heading", { name: "Users (2)" })).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Hosts (1)" }), { button: 0 });
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(screen.getByRole("button", { name: "View details for Alice Brown" })).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Schools (1)" }), { button: 0 });
    expect(screen.getByRole("heading", { name: "Users (1)" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "S" }));
    expect(screen.getByRole("button", { name: "View details for School Contact" })).toBeVisible();
    client.clear();
  });
  it("uses consistent initials for accents, whitespace and email-only accounts", () => {
    expect(alphabetInitial("  Émilie")).toBe("E");
    expect(accountInitial({ display_name: " ", full_name: null, email: "alice@example.com" })).toBe("A");
    expect(alphabetInitial(null)).toBe("#");
  });
});


describe("Booking status chips", () => {
  it("filters actual rows and resets to All", () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["is-admin"], true);
    client.setQueryData(["admin", "combined-applications"], []);
    client.setQueryData(["admin", "live-bookings"], [
      { id: "one", student_name: "Alice Confirmed", status: "confirmed", shadow_date: "2026-12-01" },
      { id: "two", student_name: "Bob Awaiting", status: "awaiting_payment", shadow_date: "2026-12-02" },
    ]);
    const Page = Route.options.component as () => React.JSX.Element;
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
    expect(screen.queryByRole("button", { name: "Bookings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Companies" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Evaluations" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Bookings", "Evaluations", "Vouchers", "BEE / CPD", "Mentor Coverage", "Activity Log", "Token Ledger"]);
    expect(screen.getByText("Alice Confirmed")).toBeVisible();
    expect(screen.getByText("Bob Awaiting")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirmed 1" }));
    expect(screen.getByText("Alice Confirmed")).toBeVisible();
    expect(screen.queryByText("Bob Awaiting")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmed 1" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "All 2" }));
    expect(screen.getByText("Bob Awaiting")).toBeVisible();
    client.clear();
  });
});


describe("Booking settings frames", () => {
  it("groups controls and updates the season preview without saving", () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["admin", "booking_settings"], { min_lead_days: 3, max_advance_days: 90, season_start_month: 2, season_end_month: 10, blackout_dates: [], public_holidays: [], scholar_reminder_days: [], mentor_reminder_days: [] });
    render(<QueryClientProvider client={client}><BookingSettings /></QueryClientProvider>);
    expect(screen.getByRole("heading", { name: "Scheduling Windows & Lead Times" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Operating Season & Request Caps" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Blackout Dates & Public Holidays" })).toBeVisible();
    expect(screen.getByLabelText("February: Active")).toBeVisible();
    expect(screen.getByLabelText("January: Inactive")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Season starts"), { target: { value: "3" } });
    expect(screen.getByLabelText("February: Inactive")).toBeVisible();
    expect(screen.getByLabelText("Minimum request lead time", { exact: false })).toHaveValue(3);
    client.clear();
  });
});


describe("Visible provider directories and career wizard", () => {
  it("reclassifies a zero-role account as a sole mentor instead of Unclassified", () => {
    const solo = { ...account("solo", "Solo Person"), email: "solo@example.com", role: null, roles: [] as AccountRow["roles"] };
    const client = mount([solo]);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Mentors (1)' }), { button: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'S' }));
    expect(screen.getByRole('button', { name: 'View details for Solo Person' })).toBeVisible();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Unclassified (0)' }), { button: 0 });
    expect(screen.queryByRole('button', { name: 'View details for Solo Person' })).not.toBeInTheDocument();
    client.clear();
  });
  it("exposes the wizard on career rows and fills all guidance fields only as a draft", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(['is-admin'], true);
    client.setQueryData(['admin', 'accounts'], []);
    client.setQueryData(['admin', 'company-contact-classification'], []);
    client.setQueryData(['admin', 'sectors', false], []);
    client.setQueryData(['admin', 'careers', false], [{ id: 1, name: 'Accountant', description: 'Original description' }]);
    const draft = { description: 'Draft overview', ideal_for: 'Draft ideal person', specialisations: ['Draft role'], subjects: ['Accounting'], school_skills: ['Numeracy'], workplace_skills: ['Financial reporting'] };
    vi.mocked(draftCareerDescription).mockResolvedValue(draft);
    const Page = Route.options.component as () => React.JSX.Element;
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Sectors and Careers' }));
    expect(screen.getByRole('tab', { name: 'Sectors' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Careers' }), { button: 0 });
    const file = screen.getByLabelText('Upload careers CSV');
    expect(file.closest('div.flex.flex-wrap.items-center.gap-3')).toContainElement(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('button', { name: /^A.*1/ }));
    expect(screen.getByRole('button', { name: 'AI wizard' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'AI wizard' }));
    fireEvent.click(screen.getByRole('button', { name: 'AI wizard' }));
    await waitFor(() => expect(screen.getByDisplayValue('Draft overview')).toBeVisible());
    expect(screen.getByDisplayValue('Draft ideal person')).toBeVisible();
    expect(screen.getByDisplayValue('Draft role')).toBeVisible();
    expect(screen.getByDisplayValue('Accounting')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Update' })).toBeVisible();
    client.clear();
  });
});
