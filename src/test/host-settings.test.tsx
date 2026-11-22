import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }) }));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/components/ui/calendar", () => ({ Calendar: ({ onSelect }: { onSelect: (dates: Date[]) => void }) => <button onClick={() => onSelect([new Date(2030, 5, 10)])}>Choose available date</button> }));
import { Route } from "@/routes/_authenticated/mentor";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("Host availability settings", () => {
  it("offers available dates and times and saves them using the existing placement API", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["mentor-bookings"], []);
    client.setQueryData(["mentor-placements"], [{ id: 12, company: "Company", career: "Engineer", sector: "Engineering", location: "Cape Town", dates: "6/11/2030", active: true, max_applicants: 2, arrival_time: "09:00", collection_time: "15:00", description: "", mode: "Face-to-Face", allow_weekends: true, allow_off_season: true }]);
    client.setQueryData(["host-settings"], { paused: false, max_shadows_per_week: 3, max_shadows_per_month: null, buffer_days: null, blackout_dates: ["6/12/2030"] });
    const Page = Route.options.component as () => React.JSX.Element;
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Available Dates and Times" })).toBeVisible();
    expect(screen.queryByText("Personal blackout dates")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose available date" }));
    fireEvent.change(screen.getByLabelText("Available from (arrival time)"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Available until (collection time)"), { target: { value: "14:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("update_mentor_placement", expect.objectContaining({ _id: 12, _dates: "6/10/2030", _arrival_time: "10:00", _collection_time: "14:00" })));
    client.clear();
  });
});
