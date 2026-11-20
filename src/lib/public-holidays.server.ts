/** Looks up a country's public holidays for a given year from Nager.Date (date.nager.at), a
 * free public-holiday API with no key/account required, so the list is never hardcoded or
 * baked into a migration and works for any supported country, not just South Africa. */
export async function fetchPublicHolidays(year: number, countryCode: string): Promise<{ date: string; name: string }[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`);
  if (!res.ok) throw new Error(`Could not fetch public holidays for ${countryCode} ${year} (${res.status}).`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Unexpected response from the public holiday service.");
  return data.map((h: { date: string; localName?: string; name?: string }) => {
    const [y, m, d] = h.date.split("-").map(Number);
    return { date: `${m}/${d}/${y}`, name: h.localName || h.name || "Public holiday" };
  });
}
