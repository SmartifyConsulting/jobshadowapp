import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
import { CompanyMentors } from "@/components/CompanyMentors";
afterEach(cleanup);
describe("Company nominated mentors", () => {
  it("lists primary and backup nominees, consolidates placements, and opens all details", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(
      ["my-company-mentors"],
      [
        {
          id: 1,
          company: "Example Company",
          mentor_name: "Alex Mentor",
          mentor_email: "alex@example.com",
          mentor_phone: "+27111111111",
          mentor_position: "Engineer",
          backup_mentor_name: "Blair Backup",
          backup_mentor_email: "blair@example.com",
          backup_mentor_phone: "+27222222222",
          career: "Engineer",
          location: "Johannesburg",
          active: true,
          arrival_time: "09:00",
          collection_time: "15:00",
        },
        {
          id: 2,
          company: "Example Company",
          mentor_name: "Alex Mentor",
          mentor_email: "alex@example.com",
          mentor_phone: "+27111111111",
          career: "Technician",
          active: false,
        },
      ],
    );
    render(
      <QueryClientProvider client={client}>
        <CompanyMentors />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "Mentors (2)" })).toBeVisible();
    expect(screen.getByText("Blair Backup")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View Alex Mentor details" }));
    expect(screen.getByText("Linked placements (2)")).toBeVisible();
    expect(screen.getByText("09:00")).toBeVisible();
    expect(screen.getByText("15:00")).toBeVisible();
  });
});
