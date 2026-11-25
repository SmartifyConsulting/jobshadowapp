import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ search: vi.fn(), select: vi.fn() }));
vi.mock("@/lib/location-places", () => ({
  placesConfigured: () => true,
  locationSession: async () => ({}),
  searchLocations: api.search,
  selectedLocation: api.select,
}));
import { LocationFields, type UserLocation } from "@/components/account/LocationFields";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});
it("cascades country, city and suburb suggestions and clears dependent selections", async () => {
  vi.useFakeTimers();
  const bounds = { north: 53, south: 52, east: -1, west: -2 };
  api.search
    .mockResolvedValueOnce([{ placeId: "city", text: "Birmingham, UK" }])
    .mockResolvedValueOnce([{ placeId: "suburb", text: "Moseley, Birmingham, UK" }]);
  api.select
    .mockResolvedValueOnce({ name: "Birmingham", bounds })
    .mockResolvedValueOnce({ name: "Moseley" });
  function Form() {
    const [value, setValue] = useState<UserLocation>({ country_code: "GB", city: "", suburb: "" });
    return <LocationFields value={value} onChange={setValue} />;
  }
  render(<Form />);
  expect(screen.getByLabelText("Suburb")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "Birm" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(api.search).toHaveBeenCalledWith(expect.anything(), "GB", "Birm", "city", undefined);
  fireEvent.click(screen.getByRole("button", { name: "Birmingham, UK" }));
  await act(async () => {});
  expect(screen.getByLabelText("City")).toHaveValue("Birmingham");
  fireEvent.change(screen.getByLabelText("Suburb"), { target: { value: "Mose" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(api.search).toHaveBeenCalledWith(expect.anything(), "GB", "Mose", "suburb", bounds);
  fireEvent.click(screen.getByRole("button", { name: "Moseley, Birmingham, UK" }));
  await act(async () => {});
  expect(screen.getByLabelText("Suburb")).toHaveValue("Moseley");
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "US" } });
  expect(screen.getByLabelText("City")).toHaveValue("");
  expect(screen.getByLabelText("Suburb")).toHaveValue("");
  expect(screen.getByLabelText("Suburb")).toBeDisabled();
});
