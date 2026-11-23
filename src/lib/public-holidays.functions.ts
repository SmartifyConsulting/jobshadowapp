import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchPublicHolidays, syncCountryHolidays, type HolidayCache } from "./public-holidays.server";
import { z } from "zod";

export const lookupPublicHolidays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number; countryCode: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    return (await fetchPublicHolidays(data.year, data.countryCode)).map((holiday) => { const [y,m,d] = holiday.date.split("-").map(Number); return { ...holiday, date: `${m}/${d}/${y}` }; });
  });

/** Admin sign-in refreshes every host country's calendar. A host may update only their own placement country. */
export const syncAutomaticHolidays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ companyId: z.number().int().positive().optional(), countryCode: z.string().regex(/^[A-Z]{2}$/).optional() }).refine((data) => !data.companyId || !!data.countryCode, "Choose a country for the host").parse(value))
  .handler(async ({ context, data }) => {
    const admin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (admin.error) throw admin.error;
    if (!admin.data) {
      if (!data.companyId) throw new Error("Forbidden");
      const own = await context.supabase.rpc("list_mentor_placements");
      if (own.error || !own.data?.some((row) => row.id === data.companyId)) throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cache: HolidayCache = {
      load: async (country, year) => { const r = await supabaseAdmin.from("country_holiday_calendars").select("synced_at").eq("country_code", country).eq("year", year).maybeSingle(); if (r.error) throw r.error; return r.data?.synced_at ?? null; },
      save: async (country, year, dates) => { const r = await supabaseAdmin.rpc("store_country_public_holidays", { _country_code: country, _year: year, _dates: dates }); if (r.error) throw r.error; },
    };
    const countries: string[] = [];
    if (data.countryCode) countries.push(data.countryCode);
    else for (let from=0; ; from+=1000) {
      const r = await supabaseAdmin.from("companies").select("country_code").order("id").range(from,from+999);
      if (r.error) throw r.error;
      countries.push(...(r.data ?? []).map((row) => row.country_code));
      if (!r.data || r.data.length<1000) break;
    }
    const result = await syncCountryHolidays(countries,cache);
    if (data.companyId && data.countryCode) {
      if (result.failures.length) throw new Error(result.failures.join(" "));
      const changed = await context.supabase.rpc("set_placement_country", { _id: data.companyId, _country_code: data.countryCode });
      if (changed.error) throw changed.error;
    }
    return result;
  });
