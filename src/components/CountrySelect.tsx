import currencies from "@/lib/country-currencies.json";
const names = new Intl.DisplayNames(["en"], { type: "region" });
const countries = Object.keys(currencies)
  .filter((code) => /^[A-Z]{2}$/.test(code))
  .map((code) => ({ code, name: names.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));
export function CountrySelect({
  value,
  onChange,
  label = "Host country",
  allowEmpty = false,
}: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  allowEmpty?: boolean;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded border border-input bg-background px-2 py-2 text-sm"
      >
        {allowEmpty && <option value="">Select Country</option>}
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </label>
  );
}
