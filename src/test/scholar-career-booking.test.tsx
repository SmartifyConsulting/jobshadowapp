import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn().mockImplementation(async (name: string) => ({
      data: name === "get_placement_country" ? "ZA" : [],
      error: null,
    })),
  },
}));
import { NewBooking } from "@/components/account/AccountSections";
import { CareerStepBrowser } from "@/components/account/CareerStepBrowser";
afterEach(cleanup);
const client = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
describe("guided career and host selection", () => {
  it("shows the chosen career guidance directly beneath the selector", () => {
    const cache = client();
    cache.setQueryData(
      ["public-career-content"],
      [{ name: "Accountant", description: "Saved overview" }],
    );
    cache.setQueryData(
      ["public-careers-catalog"],
      [{ name: "Accountant", recommended_courses: ["BCom Accounting"] }],
    );
    const { rerender } = render(
      <QueryClientProvider client={cache}>
        <CareerStepBrowser selected="Accountant" onSelect={vi.fn()} />
      </QueryClientProvider>,
    );
    const panel = screen.getByRole("region", { name: "Selected career details" });
    expect(within(panel).getByText("Saved overview")).toBeVisible();
    expect(within(panel).getByText("BCom Accounting")).toBeVisible();
    for (const title of ["Career Overview", "Skills Required", "Career Preparation"])
      expect(within(panel).getByRole("group", { name: title })).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Career" }).compareDocumentPosition(panel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    rerender(
      <QueryClientProvider client={cache}>
        <CareerStepBrowser selected="" onSelect={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("region", { name: "Selected career details" })).toBeNull();
  });
  it("browses descriptions and selects a career inline without a link away", () => {
    const cache = client();
    cache.setQueryData(["public-career-content"], []);
    cache.setQueryData(["public-careers-catalog"], []);
    const select = vi.fn();
    render(
      <QueryClientProvider client={cache}>
        <CareerStepBrowser selected="" onSelect={select} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Browse all career descriptions" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search careers" }), {
      target: { value: "Accountant" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Select Accountant" }));
    expect(select).toHaveBeenCalledWith("Accountant");
    expect(screen.queryByRole("link", { name: "Browse all career descriptions" })).toBeNull();
  });
  it("skips sector selection and lists every host matching the selected career and date range", () => {
    const cache = client();
    cache.setQueryData(["me"], { id: "test-scholar" });
    cache.setQueryData(["bookings", "test-scholar"], []);
    cache.setQueryData(["no-availability-message"], null);
    cache.setQueryData(
      ["placements"],
      [
        {
          id: 1,
          career: "Accountant",
          sector: "Finance",
          location: "Cape Town",
          availability: "6/2/2099",
          arrival_time: "09:00",
          collection_time: "15:00",
        },
        {
          id: 2,
          career: "Accountant",
          sector: "Business",
          location: "Durban",
          availability: "6/30/2099",
          arrival_time: "09:00",
          collection_time: "15:00",
        },
        {
          id: 3,
          career: "Accountant",
          sector: "Finance",
          location: "London",
          availability: "7/1/2099",
          arrival_time: "09:00",
          collection_time: "15:00",
        },
      ],
    );
    render(
      <QueryClientProvider client={cache}>
        <NewBooking initialCareer="Accountant" onBackToCareers={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.queryByText("Select a sector")).toBeNull();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2099-06-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2099-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Search Available Mentors" }));
    expect(screen.getByText("Available mentor placements (2)")).toBeVisible();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByText("London")).toBeNull();
    fireEvent.click(screen.getAllByRole("radio")[0]!);
    expect(screen.getByRole("button", { name: "Continue to Placement Details" })).toBeEnabled();
  });
});
