import { CountrySelect } from "@/components/CountrySelect";
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
  const input =
    inputClassName ??
    "mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none";
  return (
    <fieldset disabled={disabled} className="grid min-w-0 gap-3 sm:grid-cols-3">
      <CountrySelect
        label="Country"
        allowEmpty
        value={value.country_code}
        onChange={(country_code) => onChange({ ...value, country_code })}
      />
      <label className="block text-sm">
        City
        <input
          autoComplete="address-level2"
          value={value.city}
          maxLength={100}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          className={input}
        />
      </label>
      <label className="block text-sm">
        Suburb
        <input
          autoComplete="address-level3"
          value={value.suburb}
          maxLength={100}
          onChange={(e) => onChange({ ...value, suburb: e.target.value })}
          className={input}
        />
      </label>
    </fieldset>
  );
}
