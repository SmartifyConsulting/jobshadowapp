import { afterEach, expect, it, vi } from "vitest";
import { locationSession, searchLocations, selectedLocation } from "@/lib/location-places";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("restricts Google city searches to the country and suburb searches to the city bounds", async () => {
  const search = vi.fn().mockResolvedValue({ suggestions: [] });
  const api = {
    AutocompleteSessionToken: class {},
    AutocompleteSuggestion: { fetchAutocompleteSuggestions: search },
  };
  vi.stubGlobal("google", { maps: { importLibrary: async () => api } });
  const session = await locationSession();
  await searchLocations(session, "ZA", "Joh", "city");
  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({
      includedRegionCodes: ["za"],
      includedPrimaryTypes: ["(cities)"],
      input: "Joh",
      sessionToken: session.token,
    }),
  );
  const bounds = { north: -25, south: -27, east: 29, west: 27 };
  await searchLocations(session, "ZA", "Rose", "suburb", bounds);
  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({ locationRestriction: bounds, includedPrimaryTypes: ["(regions)"] }),
  );
});
it("rejects a selected place outside its parent country or city", async () => {
  const place = {
    fetchFields: vi.fn().mockResolvedValue({}),
    addressComponents: [
      { types: ["country"], shortText: "ZA", longText: "South Africa" },
      { types: ["locality"], shortText: "Cape Town", longText: "Cape Town" },
      { types: ["neighborhood"], shortText: "Gardens", longText: "Gardens" },
    ],
  };
  const prediction = { placeId: "id", text: "Gardens", toPlace: () => place };
  await expect(selectedLocation(prediction, "GB", "suburb", "London")).rejects.toThrow(
    "selected country",
  );
  await expect(selectedLocation(prediction, "ZA", "suburb", "Johannesburg")).rejects.toThrow(
    "selected city",
  );
});
