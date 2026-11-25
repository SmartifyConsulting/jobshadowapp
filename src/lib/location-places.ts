export type PlaceBounds = { north: number; south: number; east: number; west: number };
type Component = { longText: string; shortText: string; types: string[] };
export type LocationPrediction = {
  placeId: string;
  text: { toString(): string };
  mainText?: { toString(): string };
  types?: string[];
  toPlace(): {
    addressComponents?: Component[];
    viewport?: { toJSON(): PlaceBounds };
    fetchFields(options: { fields: string[] }): Promise<unknown>;
  };
};
type PlacesLibrary = {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(
      request: Record<string, unknown>,
    ): Promise<{ suggestions: { placePrediction?: LocationPrediction }[] }>;
  };
};
type GoogleWindow = Window & {
  google?: { maps?: { importLibrary(name: string): Promise<PlacesLibrary> } };
};
let loading: Promise<PlacesLibrary> | null = null;
export const placesConfigured = () => !!import.meta.env["VITE_GOOGLE_PLACES_API_KEY"];
async function library(): Promise<PlacesLibrary> {
  const google = (window as GoogleWindow).google;
  if (google?.maps?.importLibrary) return google.maps.importLibrary("places");
  if (!placesConfigured()) throw new Error("Location suggestions are not configured.");
  if (!loading)
    loading = new Promise<PlacesLibrary>((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.src =
        "https://maps.googleapis.com/maps/api/js?libraries=places&v=weekly&key=" +
        encodeURIComponent(import.meta.env["VITE_GOOGLE_PLACES_API_KEY"] as string);
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error("Location service did not respond."));
      }, 15_000);
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error("Location service is unavailable."));
      };
      script.onload = () => {
        clearTimeout(timer);
        const maps = (window as GoogleWindow).google?.maps;
        if (!maps) reject(new Error("Location service is unavailable."));
        else maps.importLibrary("places").then(resolve, reject);
      };
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}
export type LocationSession = { api: PlacesLibrary; token: unknown };
export async function locationSession(): Promise<LocationSession> {
  const api = await library();
  return { api, token: new api.AutocompleteSessionToken() };
}
export async function searchLocations(
  session: LocationSession,
  country: string,
  text: string,
  field: "city" | "suburb",
  bounds?: PlaceBounds,
) {
  if (!/^[A-Z]{2}$/.test(country) || text.trim().length < 2) return [];
  const result = await session.api.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: text.trim(),
    includedRegionCodes: [country.toLowerCase()],
    includedPrimaryTypes: field === "city" ? ["(cities)"] : ["(regions)"],
    language: "en",
    sessionToken: session.token,
    ...(bounds ? { locationRestriction: bounds } : {}),
  });
  return result.suggestions
    .flatMap((suggestion) => (suggestion.placePrediction ? [suggestion.placePrediction] : []))
    .filter(
      (prediction) =>
        field === "city" ||
        prediction.types?.some((type) => type === "neighborhood" || type.startsWith("sublocality")),
    )
    .slice(0, 5);
}
export async function selectedLocation(
  prediction: LocationPrediction,
  country: string,
  field: "city" | "suburb",
  city?: string,
) {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ["addressComponents", "viewport"] });
  const component = (types: string[]) =>
    place.addressComponents?.find((part) => types.some((type) => part.types.includes(type)));
  if (component(["country"])?.shortText.toUpperCase() !== country)
    throw new Error("Choose a location in the selected country.");
  const locality = component(["locality", "postal_town"]);
  if (
    field === "suburb" &&
    city &&
    locality &&
    locality.longText.toLocaleLowerCase() !== city.toLocaleLowerCase()
  )
    throw new Error("Choose a suburb in the selected city.");
  const part =
    field === "city"
      ? (locality ?? component(["administrative_area_level_3"]))
      : component(["neighborhood", "sublocality_level_1", "sublocality_level_2", "sublocality"]);
  if (!part) throw new Error("This location could not be selected. Enter it manually instead.");
  return { name: part.longText, bounds: place.viewport?.toJSON() };
}
