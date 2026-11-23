import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    data: [
      {
        id: "one",
        name: "Example High",
        region: "GP",
        city: "Johannesburg",
        school_type: "Public School",
      },
      {
        id: "two",
        name: "Example Private",
        region: "GP",
        city: "Johannesburg",
        school_type: "Private School",
      },
    ],
    error: null,
  }),
);
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { SchoolPicker } from "@/components/account/SchoolPicker";
import { DietaryNeedsPicker } from "@/components/account/ScholarSelections";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function School() {
  const [form, setForm] = useState({ school: "", country: "ZA", type: "Not recorded" });
  return (
    <SchoolPicker
      school={form.school}
      country={form.country}
      schoolType={form.type}
      onChange={(school, country, type) => setForm({ school, country, type })}
    />
  );
}
describe("Secondary information selectors", () => {
  it("searches only the selected country and derives the selected school type", async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={cache}>
        <School />
      </QueryClientProvider>,
    );
    fireEvent.focus(screen.getByRole("combobox", { name: "Current School" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Current School" }), {
      target: { value: "Exam" },
    });
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("search_country_schools", {
        _country: "ZA",
        _search: "Exam",
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Example Private/ }));
    expect(rpc).toHaveBeenCalledWith("search_country_schools", { _country: "ZA", _search: "Exam" });
    expect(screen.getByRole("combobox", { name: "Current School" })).toHaveValue("Example Private");
    expect(screen.getByText("School Type: Private School")).toBeVisible();
    expect(screen.queryByRole("radio")).toBeNull();
  });
  it("offers Home School without loading private learner records", () => {
    const cache = new QueryClient();
    render(
      <QueryClientProvider client={cache}>
        <School />
      </QueryClientProvider>,
    );
    fireEvent.focus(screen.getByRole("combobox", { name: "Current School" }));
    fireEvent.click(screen.getByRole("button", { name: "Home School" }));
    expect(screen.getByRole("combobox", { name: "Current School" })).toHaveValue("Home School");
    expect(screen.getByText("School Type: Home School")).toBeVisible();
    expect(rpc).toHaveBeenCalledWith("search_country_schools", { _country: "ZA", _search: "" });
  });
  it("browses schools immediately without changing an unknown country or existing school", async () => {
    const change = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SchoolPicker
          school="Existing school"
          country=""
          schoolType="Not recorded"
          onChange={change}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show school list" }));
    await screen.findByRole("button", { name: /Example Private/ });
    expect(rpc).toHaveBeenCalledWith("search_country_schools", { _country: "ZA", _search: "" });
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Current School" })).toHaveFocus();
    fireEvent.change(screen.getByRole("combobox", { name: "Current School" }), {
      target: { value: "Example" },
    });
    expect(change).toHaveBeenCalledWith("Example", "", "Not recorded");
    fireEvent.click(await screen.findByRole("button", { name: /Example Private/ }));
    expect(change).toHaveBeenLastCalledWith("Example Private", "ZA", "Private School");
  });
  it("preserves existing allergies and supports common event-menu choices", () => {
    const change = vi.fn();
    render(<DietaryNeedsPicker value="Peanut allergy" onChange={change} />);
    expect(screen.getByLabelText("Dietary details")).toHaveValue("Peanut allergy");
    fireEvent.change(screen.getByRole("combobox", { name: "Dietary Needs" }), {
      target: { value: "Vegan" },
    });
    expect(change).toHaveBeenCalledWith("Vegan");
  });
});
