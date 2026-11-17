import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountRow } from "@/lib/users.server";

vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/users.functions", () => ({ getAccounts: vi.fn(), updateAccount: vi.fn(), removeAccount: vi.fn() }));
vi.mock("@/lib/email.functions", () => ({ sendQueuedEmails: vi.fn() }));
vi.mock("@/lib/csv-import.functions", () => ({ mapCsvColumns: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { AdminUsers } from "@/routes/_authenticated/admin";
import { accountInitial, alphabetInitial } from "@/lib/alphabet";

const account = (id: string, name: string): AccountRow => ({
  id, email: id + "@example.com", created_at: "2026-11-01T00:00:00Z", role: "mentor", roles: ["mentor"],
  display_name: name, full_name: null, avatar_path: null, contact_no: null, school: null, id_number: null,
  applications: [], id_file_path: null, photo_path: null, id_verified: null, has_profile: false,
  has_scholar_profile: false, is_spam: false, booking_count: 0,
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["admin", "accounts"], [account("alice", "Alice Brown"), account("bob", "Bob Adams")]);
  render(<QueryClientProvider client={client}><AdminUsers /></QueryClientProvider>);
  return client;
}
afterEach(cleanup);

describe("User alphabet chips", () => {
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
  it("uses consistent initials for accents, whitespace and email-only accounts", () => {
    expect(alphabetInitial("  Émilie")).toBe("E");
    expect(accountInitial({ display_name: " ", full_name: null, email: "alice@example.com" })).toBe("A");
    expect(alphabetInitial(null)).toBe("#");
  });
});
