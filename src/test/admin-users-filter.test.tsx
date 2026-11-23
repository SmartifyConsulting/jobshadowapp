import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountRow } from "@/lib/users.server";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/users.functions", () => ({
  getAccounts: vi.fn(),
  updateAccount: vi.fn(),
  removeAccount: vi.fn(),
  createAccount: vi.fn(),
  syncCompanyContacts: vi.fn(),
}));
vi.mock("@/lib/public-holidays.functions", () => ({
  lookupPublicHolidays: vi.fn(),
  syncAutomaticHolidays: vi.fn().mockResolvedValue({ updated: 0, failures: [] }),
}));
vi.mock("@/lib/email.functions", () => ({ sendQueuedEmails: vi.fn() }));
vi.mock("@/lib/career-ai.functions", () => ({ draftCareerDescription: vi.fn() }));
vi.mock("@/lib/csv-import.functions", () => ({ mapCsvColumns: vi.fn() }));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/lib/indemnity-ai.functions", () => ({ extractCompanyIndemnity: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import {
  AdminUsers,
  Route,
  BookingSettings,
  CareerDescriptionField,
} from "@/routes/_authenticated/admin";
import { draftCareerDescription } from "@/lib/career-ai.functions";
import { getCareerGuidance } from "@/lib/career-guidance";
import { CAREER_DRAFT_FIELDS } from "@/lib/career-draft";
import { resolveConfirm } from "@/lib/dialogs";
import { accountInitial, alphabetInitial } from "@/lib/alphabet";

const account = (id: string, name: string): AccountRow => ({
  id,
  email: id + "@example.com",
  created_at: "2026-11-01T00:00:00Z",
  role: "mentor",
  roles: ["user", "mentor"],
  display_name: name,
  full_name: null,
  avatar_path: null,
  contact_no: null,
  school: null,
  id_number: null,
  applications: [],
  id_file_path: null,
  photo_path: null,
  id_verified: null,
  has_profile: false,
  has_scholar_profile: false,
  is_spam: false,
  booking_count: 0,
  self_registered: true,
  last_accessed_at: null,
});
function mount(extra: AccountRow[] = []) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(
    ["admin", "accounts"],
    [account("alice", "Alice Brown"), account("bob", "Bob Adams"), ...extra],
  );
  const companies = [
    {
      id: 1,
      company: "Group Company",
      mentor_name: "Alice Brown",
      mentor_email: "alice@example.com",
      backup_mentor_name: "Bob Adams",
      backup_mentor_email: "bob@example.com",
    },
    {
      id: 2,
      company: "Solo Company",
      mentor_name: "Solo Person",
      mentor_email: "solo@example.com",
      backup_mentor_name: null,
      backup_mentor_email: null,
    },
  ];
  client.setQueryData(["admin", "company-contact-classification"], companies);
  client.setQueryData(["admin", "companies", false], companies);
  render(
    <QueryClientProvider client={client}>
      <AdminUsers />
    </QueryClientProvider>,
  );
  return client;
}
afterEach(cleanup);

describe("User alphabet chips", () => {
  it("regenerates only the selected career after an explicit confirmation", async () => {
    const existing = {
      description: "Saved overview",
      ideal_for: "Saved ideal",
      specialisations: ["Saved role"],
      subjects: ["Saved subject"],
      school_skills: ["Saved foundation"],
      workplace_skills: ["Saved skill"],
      interpersonal_skills: ["Saved people skill"],
      recommended_courses: ["Saved course"],
      self_directed_learning: ["Saved resource"],
      future_outlook: "Saved outlook",
      ai_exposure_level: "low" as const,
      ai_exposure_note: "Saved note",
    };
    const onDraft = vi.fn();
    const ai = vi.mocked(draftCareerDescription).mockClear().mockResolvedValue(existing);
    const guidance = getCareerGuidance("Accountant", existing.description, existing);
    render(
      <CareerDescriptionField
        career="Accountant"
        value={existing.description}
        onChange={vi.fn()}
        skills={guidance.skills}
        onSkillsChange={vi.fn()}
        guidance={guidance}
        onGuidanceChange={vi.fn()}
        onDraft={onDraft}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "AI: Fill missing fields" }));
    expect(ai).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate this career" }));
    expect(ai).not.toHaveBeenCalled();
    resolveConfirm(true);
    const { self_directed_learning: _removed, ...remaining } = existing;
    await waitFor(() => expect(onDraft).toHaveBeenCalledWith(remaining, true));
    expect(ai).toHaveBeenCalledWith({
      data: { career: "Accountant", fields: [...CAREER_DRAFT_FIELDS] },
    });
  });
  it("keeps review-flagged Scholars visible and uses aligned icon-only actions", () => {
    const flagged = {
      ...account("flagged", "Flagged Scholar"),
      roles: ["user" as const],
      role: "user" as const,
      classification_unconfirmed: true,
    };
    const client = mount([flagged]);
    fireEvent.click(screen.getByRole("button", { name: "F" }));
    const edit = screen.getByRole("button", { name: "Edit Flagged Scholar" });
    expect(edit.textContent).toBe("");
    const row = edit.closest("tr")!;
    expect(within(row).getByText("Unknown")).toBeVisible();
    expect(row.lastElementChild).toContainElement(edit);
    const head = screen.getByRole("columnheader", { name: "First Name" }).closest("table")!;
    expect([...head.querySelectorAll("col")].map((col) => col.style.width)).toEqual(
      [...row.closest("table")!.querySelectorAll("col")].map((col) => col.style.width),
    );
    expect(screen.queryByRole("tab", { name: /Unclassified/ })).not.toBeInTheDocument();
    expect(within(row).getByText("Unclassified")).toBeVisible();
    client.clear();
  });
  it("keeps unassigned accounts out of Students and lists them under Unclassified", () => {
    const unknown = { ...account("unknown", "Unknown Person"), role: null, roles: [] };
    const client = mount([unknown]);
    expect(screen.getByRole("tab", { name: "Scholars (2)" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: /Unclassified/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View details for Unknown Person" }),
    ).not.toBeInTheDocument();
    client.clear();
  });
  it("opens the selected displayed-name group and supports switching and re-opening", () => {
    const client = mount();
    fireEvent.click(screen.getAllByRole("button", { name: "A" }).at(-1)!);
    expect(screen.getByRole("button", { name: "View details for Alice Brown" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "View details for Bob Adams" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "View details for Bob Adams" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { expanded: true }));
    expect(
      screen.queryByRole("button", { name: "View details for Bob Adams" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "View details for Bob Adams" })).toBeVisible();
    client.clear();
  });
  it("keeps the letter filter when switching to cards and clears it with All", () => {
    const client = mount();
    fireEvent.click(screen.getAllByRole("button", { name: "A" }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "Cards" }));
    expect(screen.getByRole("button", { name: "Alice Brown" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Bob Adams" })).not.toBeInTheDocument();
    expect(screen.getByText("Mentor", { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("heading", { name: "Users" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "Bob Adams" })).toBeVisible();
    client.clear();
  });
  it("filters role tabs without dropping multi-role accounts", () => {
    const school = {
      ...account("school", "School Contact"),
      role: "school" as const,
      roles: ["school" as const],
    };
    const client = mount([school]);
    expect(screen.getByRole("heading", { name: "Users" })).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Mentors (2)" }), { button: 0 });
    expect(screen.getByRole("tab", { name: "Company" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Independent" })).toBeVisible();
    fireEvent.click(screen.getByText("Registered mentor accounts (2)"));
    fireEvent.click(screen.getAllByRole("button", { name: "A" }).at(-1)!);
    expect(screen.getByRole("button", { name: "View details for Alice Brown" })).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Schools (0)" }), { button: 0 });
    expect(screen.getByRole("heading", { name: "Users" })).toBeVisible();
    fireEvent.click(screen.getByText("School contacts (1)"));
    expect(screen.getByRole("button", { name: "Edit School Contact" })).toBeVisible();
    client.clear();
  });
  it("uses consistent initials for accents, whitespace and email-only accounts", () => {
    expect(alphabetInitial("  Émilie")).toBe("E");
    expect(accountInitial({ display_name: " ", full_name: null, email: "alice@example.com" })).toBe(
      "A",
    );
    expect(alphabetInitial(null)).toBe("#");
  });
});

describe("Booking status chips", () => {
  it("filters actual rows and resets to All", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    client.setQueryData(["is-admin"], true);
    client.setQueryData(["admin", "combined-applications"], []);
    client.setQueryData(
      ["admin", "live-bookings"],
      [
        {
          id: "one",
          student_name: "Alice Confirmed",
          status: "confirmed",
          shadow_date: "2026-12-01",
        },
        {
          id: "two",
          student_name: "Bob Awaiting",
          status: "awaiting_payment",
          shadow_date: "2026-12-02",
        },
      ],
    );
    const Page = Route.options.component as () => React.JSX.Element;
    render(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Bookings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Evaluations" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(
      within(screen.getByRole("tablist", { name: "Admin reports" }))
        .getAllByRole("tab")
        .map((tab) => tab.textContent),
    ).toEqual([
      "Applications",
      "Bookings",
      "Refund Requests",
      "Evaluations",
      "Vouchers",
      "CSI",
      "Mentor Coverage",
      "Activity Log",
      "Token Ledger",
    ]);
    expect(screen.queryByRole("button", { name: "Applications" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Applications" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Bookings" }), { button: 0 });
    expect(screen.getByText("Alice Confirmed")).toBeVisible();
    expect(screen.getByText("Bob Awaiting")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirmed 1" }));
    expect(screen.getByText("Alice Confirmed")).toBeVisible();
    expect(screen.queryByText("Bob Awaiting")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmed 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "All 2" }));
    expect(screen.getByText("Bob Awaiting")).toBeVisible();
    client.clear();
  });
});

describe("Booking settings frames", () => {
  it("groups controls and updates the season preview without saving", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    client.setQueryData(["admin", "booking_settings"], {
      min_lead_days: 3,
      max_advance_days: 90,
      season_start_month: 2,
      season_end_month: 10,
      blackout_dates: [],
      public_holidays: [],
      scholar_reminder_days: [],
      mentor_reminder_days: [],
    });
    render(
      <QueryClientProvider client={client}>
        <BookingSettings />
      </QueryClientProvider>,
    );
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
    const solo = {
      ...account("solo", "Solo Person"),
      email: "solo@example.com",
      role: null,
      roles: [] as AccountRow["roles"],
    };
    const client = mount([solo]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Mentors (3)" }), { button: 0 });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Independent" }), { button: 0 });
    fireEvent.click(screen.getByText("Registered mentor accounts (1)"));
    fireEvent.click(screen.getAllByRole("button", { name: "S" }).at(-1)!);
    expect(screen.getByRole("button", { name: "View details for Solo Person" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: /Unclassified/ })).not.toBeInTheDocument();
    client.clear();
  });
  it("exposes the wizard on career rows and fills all guidance fields only as a draft", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    client.setQueryData(["is-admin"], true);
    client.setQueryData(["admin", "accounts"], []);
    client.setQueryData(["admin", "company-contact-classification"], []);
    client.setQueryData(["admin", "sectors", false], []);
    client.setQueryData(
      ["admin", "careers", false],
      [{ id: 1, name: "Accountant", description: "Original description" }],
    );
    const draft = {
      description: "Draft overview",
      ideal_for: "Draft ideal person",
      specialisations: ["Draft role"],
      subjects: ["Accounting"],
      school_skills: ["Numeracy"],
      workplace_skills: ["Financial reporting"],
      interpersonal_skills: ["Teamwork"],
      recommended_courses: ["BCom Accounting"],
      self_directed_learning: ["Free bookkeeping course on Alison"],
      future_outlook: "Automation will shift the role toward advisory work.",
      ai_exposure_level: "medium" as const,
      ai_exposure_note: "AI already drafts routine entries; judgement and client trust stay human.",
    };
    vi.mocked(draftCareerDescription).mockResolvedValue(draft);
    const Page = Route.options.component as () => React.JSX.Element;
    render(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sectors and Careers" }));
    expect(screen.getByRole("tab", { name: "Sectors" })).toHaveAttribute("aria-selected", "true");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Careers" }), { button: 0 });
    const uploadButton = screen.getByRole("button", { name: "Import CSV" });
    expect(uploadButton.closest("div.flex.flex-wrap.items-center.gap-3")).toContainElement(
      screen.getByRole("button", { name: "Export" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^A.*1/ }));
    expect(
      screen.getByRole("button", { name: "AI: Fill missing fields for Accountant" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "AI: Fill missing fields for Accountant" }));
    await waitFor(() => expect(screen.getByDisplayValue("Teamwork")).toBeVisible());
    expect(screen.getByDisplayValue("Original description")).toBeVisible();
    expect(screen.queryByDisplayValue("Draft overview")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Draft ideal person")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Draft role")).not.toBeInTheDocument();
    expect(vi.mocked(draftCareerDescription).mock.calls.at(-1)?.[0]).toEqual({
      data: {
        career: "Accountant",
        fields: [
          "interpersonal_skills",
          "recommended_courses",
          "future_outlook",
          "ai_exposure_level",
          "ai_exposure_note",
        ],
      },
    });
    expect(screen.getByRole("button", { name: "AI: Fill missing fields" })).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Regenerate this career" })).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Update" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: /Edit Career/ })).toBeNull();
    expect(screen.getByRole("group", { name: "Skills Required" })).toContainElement(
      screen.getByRole("textbox", { name: "Interpersonal Skills" }),
    );
    expect(screen.getByRole("group", { name: "Career Preparation" })).toContainElement(
      screen.getByRole("textbox", { name: "Recommended Training" }),
    );
    expect(screen.queryByText("Preview skills")).toBeNull();
    expect(screen.queryByText(/Explore On Your Own/)).toBeNull();
    client.clear();
  });
});
