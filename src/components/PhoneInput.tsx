import { useEffect, useRef, useState } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
import { Input } from "@/components/ui/input";

const names = new Intl.DisplayNames(["en"], { type: "region" });
const countries = getCountries().map((country) => ({ country, name: names.of(country) ?? country, code: getCountryCallingCode(country) })).sort((a, b) => a.name.localeCompare(b.name));
function parts(value: string) {
  const parsed = parsePhoneNumberFromString(value, "ZA");
  return { country: parsed?.country ?? "ZA" as CountryCode, national: parsed ? String(parsed.nationalNumber) : value };
}
export function phoneWithCountryCode(national: string, country: CountryCode): string {
  if (!national.trim()) return "";
  const parsed = parsePhoneNumberFromString(national, country);
  return parsed ? String(parsed.number) : national.startsWith("+") ? national : "+" + getCountryCallingCode(country) + national.replace(/\D/g, "").replace(/^0+/, "");
}
export function PhoneInput({ id, label = "Mobile Number", value, onChange, required = false, disabled = false }: {
  id?: string; label?: string; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean;
}) {
  const [draft, setDraft] = useState(() => parts(value));
  const emitted = useRef(value);
  useEffect(() => { if (value !== emitted.current) { setDraft(parts(value)); emitted.current = value; } }, [value]);
  function change(next: typeof draft) { setDraft(next); const full = phoneWithCountryCode(next.national, next.country); emitted.current = full; onChange(full); }
  return <div className="flex min-w-0 gap-2">
    <select aria-label={label + " Country Code"} value={draft.country} disabled={disabled} onChange={(event) => change({ ...draft, country: event.target.value as CountryCode })} className="h-9 w-32 max-w-[42%] shrink-0 rounded-md border border-input bg-transparent px-2 text-xs outline-none [&>option]:bg-background [&>option]:text-foreground">
      {countries.map(({ country, name, code }) => <option key={country} value={country} title={name}>{country} +{code}</option>)}
    </select>
    <Input id={id} type="tel" inputMode="tel" autoComplete="tel-national" aria-label={label} className="min-w-0 flex-1" placeholder="Mobile number" required={required} disabled={disabled} value={draft.national} onChange={(event) => change({ ...draft, national: event.target.value })} />
  </div>;
}
