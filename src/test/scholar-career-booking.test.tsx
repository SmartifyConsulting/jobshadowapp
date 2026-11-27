import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({
  user: { id: "test-scholar", user_metadata: {} as Record<string, string> },
  save: vi.fn(),
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSiteSession: () => ({ data: null }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: auth.user }, error: null }),
      updateUser: auth.save,
    },
    rpc: vi.fn().mockImplementation(async (name: string) => ({
      data: name === "get_placement_country" ? "ZA" : [],
      error: null,
    })),
  },
}));
import { AccountPanel, NewBooking } from "@/components/account/AccountSections";
import { CareerStepBrowser } from "@/components/account/CareerStepBrowser";
afterEach(cleanup);
beforeEach(() => {
  auth.user = { id: "test-scholar", user_metadata: {} };
  auth.save.mockReset().mockImplementation(async ({ data }) => {
    auth.user = { ...auth.user, user_metadata: { ...auth.user.user_metadata, ...data } };
    return { data: { user: auth.user }, error: null };
  });
});
const client = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
describe("guided career and host selection", () => {
  it("cascades sector and category choices and clears an incompatible saved career", () => {
    const cache = client();
    cache.setQueryData(["public-career-content"], []);
    cache.setQueryData(["public-careers-catalog"], []);
    function Picker() {
      const [selected, setSelected] = useState("Accountant");
      return <CareerStepBrowser selected={selected} onSelect={setSelected} />;
    }
    render(
      <QueryClientProvider client={cache}>
        <Picker />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Sector" })).toHaveValue("Business & Finance");
    expect(screen.getByRole("combobox", { name: "Career Category" })).toHaveValue(
      "Accounting & Audit",
    );
    expect(screen.getByRole("combobox", { name: "Career" })).toHaveValue("Accountant");
    fireEvent.change(screen.getByRole("combobox", { name: "Sector" }), {
      target: { value: "Education" },
    });
    expect(screen.getByRole("combobox", { name: "Career Category" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Career" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Career" })).toBeDisabled();
    expect(screen.queryByRole("region", { name: "Selected career details" })).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "Sector" }), {
      target: { value: "Business & Finance" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Career Category" }), {
      target: { value: "Accounting & Audit" },
    });
    const choices = within(screen.getByRole("combobox", { name: "Career" }));
    expect(choices.getByRole("option", { name: /^Accountant$/ })).toBeInTheDocument();
    expect(choices.queryByRole("option", { name: /^Teacher$/ })).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "Career" }), {
      target: { value: "Accountant" },
    });
    expect(screen.getByRole("region", { name: "Selected career details" })).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Career Category" }), {
      target: { value: "Actuarial Science" },
    });
    expect(screen.getByRole("combobox", { name: "Career" })).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Selected career details" })).toBeNull();
  });

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
    fireEvent.click(screen.getByRole("button", { name: "Browse All Careers" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search careers" }), {
      target: { value: "Accountant" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Select Accountant" }));
    expect(select).toHaveBeenCalledWith("Accountant");
    fireEvent.click(screen.getAllByRole("button", { name: "Collapse Careers" }).at(-1)!);
    expect(screen.queryByRole("region", { name: "Browse career catalogue" })).toBeNull();
    expect(screen.getByRole("button", { name: "Browse All Careers" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("link", { name: "Browse All Careers" })).toBeNull();
  });
  it("restores the saved career after remount and opens Step 3 directly", async () => {
    const mount = (step: string) => {
      const cache = client();
      cache.setQueryData(["me"], auth.user);
      cache.setQueryData(["scholar-profile", auth.user.id], {});
      cache.setQueryData(["bookings", auth.user.id], []);
      cache.setQueryData(["public-career-content"], []);
      cache.setQueryData(["public-careers-catalog"], []);
      cache.setQueryData(["placements"], []);
      return render(
        <QueryClientProvider client={cache}>
          <AccountPanel withBookings initialStep={step} />
        </QueryClientProvider>,
      );
    };
    const first = mount("careers");
    fireEvent.change(screen.getByRole("combobox", { name: "Sector" }), {
      target: { value: "Business & Finance" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Career Category" }), {
      target: { value: "Accounting & Audit" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Career" }), {
      target: { value: "Accountant" },
    });
    await waitFor(() =>
      expect(auth.save).toHaveBeenCalledWith({ data: { selected_career: "Accountant" } }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue to Find a Host" })).toBeEnabled(),
    );
    first.unmount();
    const second = mount("request");
    expect(screen.getByRole("heading", { name: "Mentor Availability" })).toBeVisible();
    expect(screen.getByText("Accountant", { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to Careers" }));
    expect(screen.getByRole("combobox", { name: "Career" })).toHaveValue("Accountant");
    second.unmount();
    auth.user = { id: "other-scholar", user_metadata: {} };
    mount("request");
    expect(screen.getByRole("combobox", { name: "Career" })).toHaveValue("");
    expect(screen.queryByRole("heading", { name: "Mentor Availability" })).toBeNull();
  });
  it("shows a failed preference save and lets the scholar retry", async () => {
    auth.save.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Network unavailable" },
    });
    const cache = client();
    cache.setQueryData(["me"], auth.user);
    cache.setQueryData(["scholar-profile", auth.user.id], {});
    cache.setQueryData(["bookings", auth.user.id], []);
    cache.setQueryData(["public-career-content"], []);
    cache.setQueryData(["public-careers-catalog"], []);
    render(
      <QueryClientProvider client={cache}>
        <AccountPanel withBookings initialStep="careers" />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Sector" }), {
      target: { value: "Business & Finance" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Career Category" }), {
      target: { value: "Accounting & Audit" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Career" }), {
      target: { value: "Accountant" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    expect(auth.user.user_metadata["selected_career"]).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
    await waitFor(() => expect(auth.user.user_metadata["selected_career"]).toBe("Accountant"));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
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
    expect(screen.getByRole("button", { name: "Continue to Payment" })).toBeEnabled();
  });
});
