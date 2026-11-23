vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/public-holidays.functions", () => ({
  syncAutomaticHolidays: vi.fn().mockResolvedValue({ updated: 0, failures: [] }),
}));
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
}));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect: (dates: Date[]) => void }) => (
    <button onClick={() => onSelect([new Date(2030, 5, 10)])}>Choose available date</button>
  ),
}));
import { Route } from "@/routes/_authenticated/mentor";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Host availability settings", () => {
  it("offers available dates and times and saves separate hours for each selected day", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    client.setQueryData(["mentor-bookings"], []);
    client.setQueryData(["me"], { id: "mentor" });
    client.setQueryData(["profile", "mentor"], { first_name: "Alex" });
    client.setQueryData(["host-profile"], {});
    client.setQueryData(
      ["mentor-placements"],
      [
        {
          id: 12,
          company: "Company",
          career: "Engineer",
          sector: "Engineering",
          location: "Cape Town",
          dates: "6/11/2030",
          active: true,
          max_applicants: 2,
          arrival_time: "09:00",
          collection_time: "15:00",
          description: "",
          mode: "Face-to-Face",
          allow_weekends: true,
          allow_off_season: true,
        },
      ],
    );
    client.setQueryData(["host-settings"], {
      paused: false,
      max_shadows_per_week: 3,
      max_shadows_per_month: null,
      buffer_days: null,
      blackout_dates: ["6/12/2030"],
    });
    const Page = Route.options.component as () => React.JSX.Element;
    render(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("navigation", { name: "Mentor navigation" }).querySelector("button"),
    ).toHaveTextContent("Profile");
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(screen.getByText("Mentor Portal")).toHaveClass("text-black");
    fireEvent.click(screen.getByRole("button", { name: "Profile" }));
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "Availability & Bookings" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByRole("heading", { name: "Available Dates and Times" })).toBeVisible();
    expect(screen.queryByText("Personal blackout dates")).not.toBeInTheDocument();
    await screen.findByRole("combobox", { name: "2030-06-11 From" });
    expect(screen.getByText("Open Spots Per Session")).toBeVisible();
    expect(screen.queryByLabelText("Description")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Choose available date" }));
    fireEvent.change(screen.getByRole("combobox", { name: "2030-06-10 From" }), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "2030-06-10 To" }), {
      target: { value: "14:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith(
        "save_placement_day_times",
        expect.objectContaining({
          _id: 12,
          _slots: [{ day: "2030-06-10", from_time: "10:00", to_time: "14:00" }],
        }),
      ),
    );
    client.clear();
  });
});
it("keeps the sidebar hidden until initial portal data is ready", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(["mentor-bookings"], []);
  let finish!: (data: unknown) => void;
  rpc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const Page = Route.options.component as () => React.JSX.Element;
  render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Loading your portal");
  expect(screen.queryByRole("navigation", { name: "Mentor navigation" })).toBeNull();
  finish({ data: [], error: null });
  expect(await screen.findByRole("navigation", { name: "Mentor navigation" })).toBeVisible();
  expect(screen.queryByRole("status")).toBeNull();
  client.clear();
});
