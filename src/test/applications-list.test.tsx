import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/users.functions", () => ({ getAccounts: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { ApplicationsList } from "@/components/ApplicationsList";
import { combineApplicationRecords } from "@/lib/application-records";
afterEach(cleanup);
describe("Unified Applications screen", () => {
  it("filters booked records, restores all records and exposes retained headings", () => {
    const records = combineApplicationRecords([], [{ id: "booked", user_id: "a", company_id: 1, status: "confirmed" }, { id: "pending", user_id: "b", status: "awaiting_payment" }], [{ id: 9, name: "Imported Person" }], [{ user_id: "a", full_name: "Alice Booked" }, { user_id: "b", full_name: "Bob Pending" }], [{ id: 1, mentor_name: "Host Person", hr_contact_name: "HR Person" }]);
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["admin", "combined-applications"], { records, companies: [{ id: 1, mentor_name: "Host Person", hr_contact_name: "HR Person" }] });
    render(<QueryClientProvider client={client}><ApplicationsList onEditImported={() => {}} onDeleteImported={() => {}} /></QueryClientProvider>);
    expect(screen.getByRole("columnheader", { name: "Mentor" })).toBeVisible();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Scholars (3)", "Mentors (0)", "Hosts (0)"]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Mentors (0)" }), { button: 0 });
    expect(screen.getByRole("status")).toHaveTextContent("No mentor applications are stored");
    expect(screen.queryByRole("button", { name: "Bob" })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Scholars (3)" }), { button: 0 });
    // Defaults to the Pending filter: only Bob (awaiting payment) shows, not Alice (booked/confirmed).
    expect(screen.getByRole("button", { name: "Bob" })).toBeVisible();
    expect(screen.getByText("Pending", { selector: "span" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Alice" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Booked 1" }));
    expect(screen.getByText("HR Person")).toBeVisible();
    expect(screen.getByRole("button", { name: "Alice" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Bob" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Imported" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All 3" }));
    expect(screen.getByRole("button", { name: "Imported" })).toBeVisible();
    fireEvent.click(screen.getByText(/Customise View \(/));
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getByRole("columnheader", { name: "Parent/guardian email" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Indemnity status" })).toBeVisible();
    client.clear();
  });
});
