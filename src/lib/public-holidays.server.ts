/** Looks up a country's public holidays for a given year from Nager.Date (date.nager.at), a
 * free public-holiday API with no key/account required, so the list is never hardcoded or
 * baked into a migration and works for any supported country, not just South Africa. */
export async function fetchPublicHolidays(year: number, countryCode: string): Promise<{ date: string; name: string }[]> {
  if (!Number.isInteger(year) || year < 2000 || year > 2200 || !/^[A-Z]{2}$/.test(countryCode)) throw new Error("Invalid holiday country or year.");
  const res = await fetch(`https://nagerholidays.com/api/v4/Holidays/${countryCode}/${year}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Could not fetch public holidays for ${countryCode} ${year} (${res.status}).`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Unexpected response from the public holiday service.");
  return data.filter((h) => h.nationalHoliday === true && Array.isArray(h.holidayTypes) && h.holidayTypes.includes("Public")).map((h: { date: string; name?: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h.date) || Number(h.date.slice(0,4)) !== year || Number.isNaN(Date.parse(h.date))) throw new Error("Invalid holiday date received.");
    return { date: h.date, name: h.name || "Public holiday" };
  });
}

export type HolidayCache = { load: (country: string, year: number) => Promise<string | null>; save: (country: string, year: number, dates: string[]) => Promise<void> };
export async function syncCountryHolidays(countries: string[], cache: HolidayCache, lookup = fetchPublicHolidays, now = new Date()) {
  const failures: string[] = []; let updated = 0;
  const year = now.getUTCFullYear();
  for (const country of new Set(countries)) {
    if (!/^[A-Z]{2}$/.test(country)) { failures.push("Invalid host country."); continue; }
    for (const calendarYear of [year, year + 1]) {
      try {
        const synced = await cache.load(country, calendarYear);
        if (synced && now.getTime() - Date.parse(synced) < 24 * 60 * 60 * 1000) continue;
        const dates = await lookup(calendarYear, country);
        await cache.save(country, calendarYear, [...new Set(dates.map((holiday) => holiday.date))]);
        updated++;
      } catch { failures.push(`Public holidays for ${country} ${calendarYear} could not be updated.`); }
    }
  }
  return { updated, failures };
}
