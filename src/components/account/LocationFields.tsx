import { CountrySelect } from "@/components/CountrySelect";
import { useEffect, useId, useRef, useState } from "react";
import {
  locationSession,
  placesConfigured,
  searchLocations,
  selectedLocation,
  type LocationSession,
  type LocationPrediction,
  type PlaceBounds,
} from "@/lib/location-places";
export type UserLocation = { country_code: string; city: string; suburb: string };
export function readUserLocation(data: Record<string, unknown> = {}): UserLocation {
  const value = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");
  return { country_code: value("country_code"), city: value("city"), suburb: value("suburb") };
}
export function locationText(value: UserLocation) {
  let country = value.country_code;
  if (/^[A-Z]{2}$/.test(country))
    country = new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country;
  return [value.suburb, value.city, country].filter(Boolean).join(", ");
}
export function LocationFields({
  value,
  onChange,
  disabled = false,
  inputClassName,
}: {
  value: UserLocation;
  onChange: (value: UserLocation) => void;
  disabled?: boolean;
  inputClassName?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState<{ field: "city" | "suburb"; text: string } | null>(null);
  const [suggestions, setSuggestions] = useState<LocationPrediction[]>([]);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState("");
  const [choosing, setChoosing] = useState(false);
  const sessions = useRef<Partial<Record<"city" | "suburb", LocationSession>>>({});
  const cityBounds = useRef<{ key: string; bounds?: PlaceBounds } | null>(null);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    let cancelled = false;
    setSuggestions([]);
    setActive(-1);
    setMessage("");
    if (!query || query.text.trim().length < 2 || !value.country_code || disabled) return;
    if (!placesConfigured()) {
      setMessage("Enter your city and suburb manually.");
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const field = query.field;
          let bounds: PlaceBounds | undefined;
          if (field === "suburb") {
            if (!value.city.trim()) return;
            const key = value.country_code + ":" + value.city;
            if (cityBounds.current?.key !== key) {
              const citySession = await locationSession();
              const cities = await searchLocations(
                citySession,
                value.country_code,
                value.city,
                "city",
              );
              const match = cities.find(
                (city) => city.mainText?.toString().toLowerCase() === value.city.toLowerCase(),
              );
              const result = match
                ? await selectedLocation(match, value.country_code, "city")
                : null;
              cityBounds.current = { key, ...(result?.bounds ? { bounds: result.bounds } : {}) };
            }
            bounds = cityBounds.current?.bounds;
            if (!bounds) {
              if (!cancelled)
                setMessage("Choose your city from suggestions, or enter the suburb manually.");
              return;
            }
          }
          const session = sessions.current[field] ?? (await locationSession());
          sessions.current[field] = session;
          const matches = await searchLocations(
            session,
            value.country_code,
            query.text,
            field,
            bounds,
          );
          if (!cancelled) {
            setSuggestions(matches);
            if (!matches.length)
              setMessage("No matching locations found. You can enter this location manually.");
          }
        } catch {
          if (!cancelled)
            setMessage(
              "Location suggestions are unavailable. You can enter your location manually.",
            );
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, value.country_code, value.city, disabled]);
  async function choose(prediction: LocationPrediction) {
    if (!query) return;
    const field = query.field;
    const previous = latest.current;
    setChoosing(true);
    try {
      const place = await selectedLocation(prediction, previous.country_code, field, previous.city);
      if (
        latest.current.country_code !== previous.country_code ||
        latest.current.city !== previous.city
      )
        return;
      if (field === "city") {
        cityBounds.current = {
          key: previous.country_code + ":" + place.name,
          ...(place.bounds ? { bounds: place.bounds } : {}),
        };
        onChange({ ...previous, city: place.name, suburb: "" });
      } else onChange({ ...previous, suburb: place.name });
      delete sessions.current[field];
      setQuery(null);
      setSuggestions([]);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Choose another location or enter it manually.",
      );
    } finally {
      setChoosing(false);
    }
  }
  const input =
    inputClassName ??
    "mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none";
  return (
    <fieldset disabled={disabled || choosing} className="grid min-w-0 gap-3 sm:grid-cols-3">
      <CountrySelect
        label="Country"
        allowEmpty
        value={value.country_code}
        onChange={(country_code) => {
          setQuery(null);
          setSuggestions([]);
          cityBounds.current = null;
          sessions.current = {};
          onChange({ country_code, city: "", suburb: "" });
        }}
      />
      {(["city", "suburb"] as const).map((field) => (
        <div key={field} className="relative min-w-0">
          <label className="block text-sm" htmlFor={id + field}>
            {field === "city" ? "City" : "Suburb"}
          </label>
          <input
            id={id + field}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={query?.field === field && suggestions.length > 0}
            aria-controls={id + field + "-suggestions"}
            aria-activedescendant={
              active >= 0 && query?.field === field ? id + field + active : undefined
            }
            autoComplete="off"
            disabled={!value.country_code || (field === "suburb" && !value.city.trim())}
            value={value[field]}
            maxLength={100}
            className={input}
            onChange={(e) => {
              if (field === "city") {
                cityBounds.current = null;
                delete sessions.current.suburb;
              }
              onChange({
                ...value,
                [field]: e.target.value,
                ...(field === "city" ? { suburb: "" } : {}),
              });
              setQuery({ field, text: e.target.value });
            }}
            onBlur={() => {
              setQuery(null);
              setSuggestions([]);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery(null);
                setSuggestions([]);
              }
              if (!suggestions.length) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setActive(
                  (current) =>
                    (current + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) %
                    suggestions.length,
                );
              }
              if (event.key === "Enter" && active >= 0) {
                event.preventDefault();
                void choose(suggestions[active]!);
              }
            }}
          />
          {query?.field === field && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded border bg-background text-foreground shadow-lg">
              <ul
                role="listbox"
                id={id + field + "-suggestions"}
                aria-label={field === "city" ? "City suggestions" : "Suburb suggestions"}
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.placeId}
                    id={id + field + index}
                    role="option"
                    aria-selected={index === active}
                    className={index === active ? "bg-muted" : ""}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void choose(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      {suggestion.text.toString()}
                    </button>
                  </li>
                ))}
              </ul>
              <span
                translate="no"
                className="block whitespace-nowrap px-3 py-2 font-sans text-xs font-normal text-[#5E5E5E]"
              >
                Google Maps
              </span>
            </div>
          )}
        </div>
      ))}
      {message && (
        <p role="status" className="text-xs text-muted-foreground sm:col-span-3">
          {message}
        </p>
      )}
    </fieldset>
  );
}
