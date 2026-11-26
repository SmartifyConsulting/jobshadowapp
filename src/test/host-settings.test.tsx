const cvDraft = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
vi.mock("@/components/mentor/MentorOnboardingWizard", () => ({
  MentorOnboardingWizard: ({
    renderProfile,
    renderHosting,
  }: {
    renderProfile: (done: () => void) => React.ReactNode;
    renderHosting: () => React.ReactNode;
  }) => (
    <>
      {renderProfile(() => {})}
      {renderHosting()}
    </>
  ),
}));
vi.mock("@/lib/mentor-cv.functions", () => ({ draftMentorProfileFromCv: cvDraft }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/public-holidays.functions", () => ({
  syncAutomaticHolidays: vi.fn().mockResolvedValue({ updated: 0, failures: [] }),
}));
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
}));
vi.mock("@/components/SiteLayout", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: "mentor@example.com" } } }),
    },
    storage: { from: () => ({ upload }) },
  },
}));
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect: (dates: Date[]) => void }) => (
    <button onClick={() => onSelect([new Date(2030, 5, 10)])}>Choose available date</button>
  ),
}));
import { Route } from "@/routes/_authenticated/mentor";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
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
    expect(screen.queryByRole("navigation", { name: "Mentor navigation" })).toBeNull();
    expect(await screen.findByRole("heading", { name: "Alex" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Personal Details" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tabpanel", { name: "Professional Profile" })).toHaveAttribute(
      "data-state",
      "inactive",
    );
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Professional Profile" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByRole("group", { name: "Skills & Expertise" })).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Personal Details" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.queryByRole("button", { name: /^Edit Profile$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit Professional Details" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save Personal Details" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Personal Details" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Professional Details" })).toBeNull();
    expect(screen.getByRole("group", { name: "Profile Summary" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Personal Details" })).toHaveAttribute("data-state", "active");
    expect(screen.queryByText("Mentor Portal")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Set Availability/ }));
    expect(screen.getByRole("heading", { name: "Available Dates and Times" })).toBeVisible();
    expect(screen.queryByText("Personal blackout dates")).not.toBeInTheDocument();
    await screen.findByRole("combobox", { name: "2030-06-11 From" });
    expect(screen.getByText("Open Spots Per Session")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Explore software engineering with our team." },
    });
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
    expect(rpc).toHaveBeenCalledWith(
      "update_mentor_placement",
      expect.objectContaining({
        _description: "Explore software engineering with our team.",
        _dates: "06/10/2030",
        _arrival_time: "10:00",
        _collection_time: "14:00",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Receive Booking Requests/ }));
    expect(screen.getByRole("region", { name: "Job Shadows Calendar" })).toHaveClass("lg:w-1/2");
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeVisible();
    client.clear();
  });
});
it("lands directly on profile after its data is ready without showing a sidebar", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(["mentor-bookings"], []);
  client.setQueryData(["mentor-placements"], []);
  client.setQueryData(["me"], { id: "mentor" });
  client.setQueryData(["profile", "mentor"], { first_name: "Alex" });
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
  expect(await screen.findByRole("heading", { name: "Alex" })).toBeVisible();
  expect(screen.queryByRole("navigation", { name: "Mentor navigation" })).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
  client.clear();
});
it.each([null, "mentor@example.com/cv.docx"])(
  "offers a red upload control without a separate autofill button for %s",
  async (cvPath) => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    client.setQueryData(["me"], { id: "mentor" });
    client.setQueryData(["profile", "mentor"], { first_name: "Alex" });
    client.setQueryData(["mentor-bookings"], []);
    client.setQueryData(["mentor-placements"], []);
    client.setQueryData(["host-profile"], { cv_path: cvPath });
    const Page = Route.options.component as () => React.JSX.Element;
    render(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>,
    );
    const input = screen.getByLabelText("Upload CV") as HTMLInputElement;
    expect(screen.getByRole("group", { name: "CV" })).toBeVisible();
    expect(input.closest("label")).toHaveClass("bg-primary");
    expect(screen.queryByRole("button", { name: "Fill From My CV" })).toBeNull();
    expect(cvDraft).not.toHaveBeenCalled();
    client.clear();
  },
);
it("reviews CV drafts, preserves populated fields and keeps edits made while AI is running", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(["me"], { id: "mentor" });
  client.setQueryData(["profile", "mentor"], { first_name: "Alex" });
  client.setQueryData(["mentor-bookings"], []);
  client.setQueryData(["mentor-placements"], []);
  client.setQueryData(["host-settings"], {});
  client.setQueryData(["host-profile"], {
    bio: "My original bio",
    specialties: [],
    cv_path: "mentor@example.com/cv.pdf",
  });
  let finish!: (value: unknown) => void;
  cvDraft.mockImplementationOnce(
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
  const groups = screen.getAllByRole("group");
  expect(groups.find((group) => group.getAttribute("aria-label") === "CV")).toBeVisible();
  fireEvent.drop(screen.getByLabelText("CV upload area"), {
    dataTransfer: {
      files: [new File(["%PDF-synthetic"], "test-cv.pdf", { type: "application/pdf" })],
    },
  });
  await waitFor(() =>
    expect(cvDraft).toHaveBeenCalledWith({
      data: { storagePath: expect.stringMatching(/mentor@example.com\/cv-.*-test-cv\.pdf$/) },
    }),
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Professional Profile" }), {
    button: 0,
    ctrlKey: false,
  });
  const specialties = screen.getByRole("textbox", { name: "Skills & Expertise" });
  fireEvent.change(specialties, { target: { value: "Manually entered while waiting" } });
  finish({
    bio: "AI replacement",
    specialties: ["AI specialty"],
    certifications: "BSc Computing",
    linkedin_url: "https://www.linkedin.com/in/example",
  });
  await waitFor(() =>
    expect(screen.getByRole("tabpanel", { name: "Professional Profile" })).toHaveTextContent(
      "CV draft added to empty fields. Review the Professional Profile tab",
    ),
  );
  expect(screen.getByRole("textbox", { name: /^Experience$/ })).toHaveValue("My original bio");
  expect(specialties).toHaveValue("Manually entered while waiting");
  expect(screen.getByRole("textbox", { name: /^Qualifications$/ })).toHaveValue("BSc Computing");
  expect(rpc.mock.calls.some((call) => call[0] === "update_my_host_profile")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /Set Availability/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save Contact Preferences" }));
  await waitFor(() =>
    expect(rpc).toHaveBeenCalledWith(
      "update_my_host_profile",
      expect.objectContaining({ _bio: "My original bio", _specialties: [], _certifications: null }),
    ),
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Personal Details" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(screen.getByRole("textbox", { name: /^Qualifications$/ })).toHaveValue("BSc Computing");
  expect(screen.getByRole("textbox", { name: "Skills & Expertise" })).toHaveValue(
    "Manually entered while waiting",
  );
  expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
  client.clear();
});
it("autosaves changed professional fields after 40 seconds without repeating unchanged saves", async () => {
  vi.useFakeTimers();
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(["me"], { id: "mentor" });
  client.setQueryData(["profile", "mentor"], { first_name: "Alex", last_name: "Example" });
  client.setQueryData(["mentor-bookings"], []);
  client.setQueryData(["mentor-placements"], []);
  client.setQueryData(["host-profile"], { bio: "Original bio", specialties: ["Engineering"] });
  const Page = Route.options.component as () => React.JSX.Element;
  render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Professional Profile" }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.change(screen.getByRole("textbox", { name: /^Experience$/ }), {
    target: { value: "Updated bio" },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(39_999);
  });
  expect(rpc.mock.calls.filter(([name]) => name === "update_my_host_profile")).toHaveLength(0);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(rpc).toHaveBeenCalledWith(
    "update_my_host_profile",
    expect.objectContaining({ _bio: "Updated bio", _specialties: ["Engineering"] }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(40_000);
  });
  expect(rpc.mock.calls.filter(([name]) => name === "update_my_host_profile")).toHaveLength(1);
  cleanup();
  client.clear();
});
