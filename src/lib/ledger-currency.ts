// Country currencies: Unicode CLDR supplemental currencyData (current tender only).
// Time zones: IANA tz zone.tab. Currency-data licence is included alongside the data.
import currencies from "./country-currencies.json";
import zones from "./timezone-countries.json";

const regionCurrency = currencies as Record<string, string>;
const timezoneCountry = zones as Record<string, string>;
const names = new Intl.DisplayNames(["en"], { type: "region" });
export const LEDGER_COUNTRIES = Object.keys(currencies).filter((code) => /^[A-Z]{2}$/.test(code)).map((code) => ({ code, name: names.of(code) ?? code, currency: regionCurrency[code]! })).sort((a, b) => a.name.localeCompare(b.name));
export function deviceCountry(locale: string, timezone: string): string {
  const region = new Intl.Locale(locale).region;
  return timezoneCountry[timezone] ?? (region && regionCurrency[region] ? region : "US");
}
export const countryCurrency = (country: string) => regionCurrency[country] ?? "USD";
export type LedgerRate = { base: string; quote: string; rate: number; date: string };
export async function loadLedgerRate(currency: string, fetcher: typeof fetch = fetch): Promise<LedgerRate> {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency.");
  if (currency === "USD") return { base: "USD", quote: "USD", rate: 1, date: "" };
  const response = await fetcher("https://api.frankfurter.dev/v2/rate/usd/" + currency.toLowerCase(), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Exchange rate unavailable.");
  const data = await response.json();
  if (data.base !== "USD" || data.quote !== currency || typeof data.rate !== "number" || !Number.isFinite(data.rate) || data.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error("Invalid exchange rate.");
  return data;
}
export function localLedgerCost(row: Record<string, unknown>, source: "provider" | "estimated", rate: number): number | null {
  return row["cost_source"] === source && typeof row["cost_usd"] === "number" && Number.isFinite(row["cost_usd"]) && row["cost_usd"] >= 0 ? row["cost_usd"] * rate : null;
}
export function formatLedgerMoney(amount: number | null, currency: string): string {
  return amount === null ? "Not reported" : new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "code", minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(amount);
}
