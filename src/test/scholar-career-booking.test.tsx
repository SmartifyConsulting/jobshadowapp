import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({
  user: { id: "test-scholar", user_metadata: {} } as {
    id: string;
    email?: string;
    user_metadata: Record<string, unknown>;
  },
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
const client = () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  cache.setQueryData(["career-favourites", "test-scholar"], new Set());
  return cache;
};
describe("guided career and host selection", () => {
  it("lets the test scholar review Step 4 without creating a booking or recording payment", async () => {
    auth.user = {
      id: "1ec456b0-6280-4732-9393-9e67991ffdfa",
      email: "elenanicolettis@icloud.com",
      user_metadata: { selected_career: "Accountant" },
    };
    const cache = client();
    cache.setQueryData(["me"], auth.user);
    cache.setQueryData(["scholar-profile", auth.user.id], {});
    cache.setQueryData(["bookings", auth.user.id], []);
    cache.setQueryData(["career-favourites", auth.user.id], new Set());
    cache.setQueryData(
      ["placements"],
      [
        {
          id: 900000115,
          career: "Accountant",
          location: "Johannesburg",
          availability: "6/12/2099",
          arrival_time: "09:00",
          collection_time: "12:00",
          amount: 350,
        },
      ],
    );
    const firstVisit = render(
      <QueryClientProvider client={cache}>
        <AccountPanel withBookings initialStep="request" />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2099-06-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2099-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Search Available Mentors" }));
    fireEvent.click(screen.getByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Make Payment" }));
    expect(screen.getByLabelText("Selected Career: Accountant")).toBeVisible();
    expect(
      screen.getByText(
        "Payment preview only. No booking, payment or confirmation has been created.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Payment Unavailable in Preview" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Pay with PayFast" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue to Complete Forms" })).toBeNull();
    await waitFor(() =>
      expect(auth.user.user_metadata["mentor_search"]).toMatchObject({ placementId: 900000115 }),
    );
    firstVisit.unmount();
    const returnCache = client();
    returnCache.setQueryData(["me"], auth.user);
    returnCache.setQueryData(["scholar-profile", auth.user.id], {});
    returnCache.setQueryData(["bookings", auth.user.id], []);
    returnCache.setQueryData(["placements"], cache.getQueryData(["placements"]));
    returnCache.setQueryData(
      ["sample-booking-form-templates"],
      [
        {
          key: "standard_indemnity_clauses",
          title: "Indemnity and Consent",
          body: "Current approved form text",
        },
      ],
    );
    render(
      <QueryClientProvider client={returnCache}>
        <AccountPanel withBookings initialStep="payment" />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: "Step 4: Make Payment" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Step 4: Make Payment" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByLabelText("Selected Career: Accountant")).toBeVisible();
    expect(screen.getByRole("button", { name: "Payment Unavailable in Preview" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Complete Forms" }));
    expect(screen.getByRole("button", { name: "Step 5: Complete Forms" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.click(screen.getByText("Form C: Standard JobShadow Indemnity Clauses"));
    expect(screen.getByText("Current approved form text")).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Payment Successful" })).toBeNull();
    expect(screen.getByRole("button", { name: "Step 6: Identity Verification" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Identity Verification" }));
    expect(screen.getByRole("button", { name: "Step 6: Identity Verification" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Your identity has not been marked as verified/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Step 7: Booking Confirmation" })).toBeVisible();
  });
  it("restores searched dates and mentor selection from the account after remount", async () => {
    const mount = (user = auth.user, available = true) => {
      const cache = client();
      cache.setQueryData(["me"], user);
      cache.setQueryData(["career-favourites", user.id], new Set());
      cache.setQueryData(["bookings", user.id], []);
      cache.setQueryData(
        ["placements"],
        available
          ? [
              {
                id: 91,
                career: "Accountant",
                location: "Cape Town",
                availability: "6/12/2099",
                arrival_time: "09:00",
                collection_time: "15:00",
              },
            ]
          : [],
      );
      return render(
        <QueryClientProvider client={cache}>
          <NewBooking initialCareer="Accountant" />
        </QueryClientProvider>,
      );
    };
    const first = mount();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2099-06-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2099-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Search Available Mentors" }));
    fireEvent.click(screen.getByRole("radio"));
    await waitFor(() =>
      expect(auth.user.user_metadata["mentor_search"]).toMatchObject({
        from: "2099-06-01",
        to: "2099-06-30",
        placementId: 91,
      }),
    );
    first.unmount();
    const second = mount();
    expect(screen.getByLabelText("From")).toHaveValue("2099-06-01");
    expect(screen.getByLabelText("To")).toHaveValue("2099-06-30");
    expect(screen.getByText("Available mentor placements (1)")).toBeVisible();
    expect(screen.getByRole("radio")).toBeChecked();
    second.unmount();
    const third = mount(auth.user, false);
    expect(screen.getByText("Available mentor placements (0)")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue to Make Payment" })).toBeDisabled();
    third.unmount();
    mount({ id: "other-scholar", user_metadata: {} });
    expect(screen.getByLabelText("From")).toHaveValue("");
    expect(screen.getByLabelText("To")).toHaveValue("");
  });

  it("shows a failed search save and retries without losing the results", async () => {
    auth.save.mockResolvedValueOnce({ error: { message: "Offline" } });
    const cache = client();
    cache.setQueryData(["me"], auth.user);
    cache.setQueryData(["bookings", auth.user.id], []);
    cache.setQueryData(["placements"], []);
    render(
      <QueryClientProvider client={cache}>
        <NewBooking initialCareer="Accountant" />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2099-06-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2099-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Search Available Mentors" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your search could not be saved");
    expect(screen.getByText("Available mentor placements (0)")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry Saving" }));
    await waitFor(() =>
      expect(auth.user.user_metadata["mentor_search"]).toMatchObject({
        from: "2099-06-01",
        to: "2099-06-30",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
  it("matches only other favourites in the searched range and lets the scholar choose one", async () => {
    const cache = client();
    cache.setQueryData(["me"], auth.user);
    cache.setQueryData(["bookings", auth.user.id], []);
    cache.setQueryData(
      ["career-favourites", auth.user.id],
      new Set(["business-finance--accountant"]),
    );
    const placement = {
      sector: "Finance",
      arrival_time: "09:00",
      collection_time: "15:00",
      company: "Example",
      amount: 350,
      days_per_shadow: 1,
    };
    cache.setQueryData(
      ["placements"],
      [
        {
          ...placement,
          id: 10,
          career: "Accountant",
          location: "Cape Town",
          availability: "6/12/2099",
        },
        {
          ...placement,
          id: 11,
          career: "Accountant",
          location: "Outside Range",
          availability: "7/12/2099",
        },
        {
          ...placement,
          id: 12,
          career: "Teacher",
          location: "Not Favourited",
          availability: "6/12/2099",
        },
        {
          ...placement,
          id: 13,
          career: "Accountant",
          location: "No Hours",
          availability: "6/12/2099",
          arrival_time: null,
        },
      ],
    );
    render(
      <QueryClientProvider client={cache}>
        <NewBooking initialCareer="Property And Facilities Manager" />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2099-06-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2099-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Search Available Mentors" }));
    const matches = screen.getByRole("complementary", { name: "Favourite career availability" });
    expect(within(matches).getByText("Accountant")).toBeVisible();
    expect(within(matches).getByText("Cape Town")).toBeVisible();
    expect(within(matches).queryByText("Outside Range")).toBeNull();
    expect(within(matches).queryByText("Not Favourited")).toBeNull();
    expect(within(matches).queryByText("No Hours")).toBeNull();
    fireEvent.click(within(matches).getByRole("button", { name: "Choose This Mentor" }));
    expect(screen.getByRole("heading", { name: "Mentor Availability" })).toBeVisible();
    expect(screen.getByLabelText("Selected Career: Accountant")).toBeVisible();
    expect(screen.getAllByText("Cape Town")[0]).toBeVisible();
    expect(screen.getByText("Available mentor placements (1)")).toBeVisible();
    expect(screen.getByRole("radio")).toBeChecked();
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2099-06-02" } });
    expect(
      within(
        screen.getByRole("complementary", { name: "Favourite career availability" }),
      ).queryByRole("button", { name: "Choose This Mentor" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Continue to Make Payment" })).toBeDisabled();
  });
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
      expect(screen.getByRole("button", { name: "Continue to Find a Mentor" })).toBeEnabled(),
    );
    first.unmount();
    const second = mount("request");
    expect(screen.getByRole("heading", { name: "Mentor Availability" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Step 4: Make Payment" })).toBeDisabled();
    expect(screen.getByLabelText("Selected Career: Accountant")).toBeVisible();
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
    expect(screen.getByRole("button", { name: "Continue to Make Payment" })).toBeDisabled();
  });
});
