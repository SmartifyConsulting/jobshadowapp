import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mentorGroups } from "@/lib/provider-directory";
import { companyKey } from "@/lib/company-classification";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
function nomineeDetails(record: Record<string, unknown>, names: string[], emails: string[]) {
  return ["mentor", "backup_mentor"].flatMap((prefix) => {
    const name = text(record[prefix + "_name"]);
    const email = text(record[prefix + "_email"]);
    if (
      !names.some((n) => companyKey(n) === companyKey(name)) &&
      !emails.some((e) =>
        email
          .toLowerCase()
          .split(/[,;]/)
          .map((v) => v.trim())
          .includes(e.toLowerCase()),
      )
    )
      return [];
    return [
      {
        kind: prefix === "mentor" ? "Primary" : "Backup",
        first: text(record[prefix + "_first_name"]),
        last: text(record[prefix + "_last_name"]),
        phone: text(record[prefix + "_phone"]),
        position: prefix === "mentor" ? text(record["mentor_position"]) : "",
      },
    ];
  });
}
export function CompanyMentors() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["my-company-mentors"],
    queryFn: async () => {
      const r = await supabase.rpc("list_my_company_mentors");
      if (r.error) throw new Error(r.error.message);
      return (Array.isArray(r.data) ? r.data : []) as Record<string, unknown>[];
    },
  });
  const groups = useMemo(
    () =>
      mentorGroups(query.data ?? []).sort((a, b) =>
        (a.names[0] || a.emails[0] || "").localeCompare(b.names[0] || b.emails[0] || ""),
      ),
    [query.data],
  );
  const rows = groups.filter((g) =>
    [...g.names, ...g.emails, ...g.careers, g.company]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const detail = groups.find((g) => g.key === selected);
  const contacts = (g: (typeof groups)[number]) =>
    g.records.flatMap((r) => nomineeDetails(r, g.names, g.emails));
  return (
    <section className="min-w-0 bg-ivory p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Mentors ({groups.length})</h1>
        <label className="text-sm">
          Search mentors
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, company, email or career"
            className="ml-3 w-64 max-w-full border border-input bg-background px-3 py-2"
          />
        </label>
      </div>
      {query.isLoading ? (
        <p className="mt-5 text-sm">Loading mentors…</p>
      ) : query.error ? (
        <div role="alert" className="mt-5 text-sm">
          <p>Mentors could not be loaded.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead>
              <tr>
                {["Mentor", "Nomination", "Company", "Careers", "Email", "Mobile", "Details"].map(
                  (h) => (
                    <th key={h} className="border-b border-border px-3 py-2 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.key} className="border-b border-border/60">
                  <td className="px-3 py-3 font-medium">
                    {g.names.join(" · ") || "Name not recorded"}
                  </td>
                  <td className="px-3 py-3">
                    {unique(contacts(g).map((c) => c.kind)).join(" / ")}
                  </td>
                  <td className="px-3 py-3">{g.company || "Not recorded"}</td>
                  <td className="max-w-60 px-3 py-3">{g.careers.join(", ") || "Not recorded"}</td>
                  <td className="max-w-64 break-words px-3 py-3">
                    {g.emails.join(", ") || "Not recorded"}
                  </td>
                  <td className="px-3 py-3">
                    {unique(contacts(g).map((c) => c.phone)).join(" · ") || "Not recorded"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`View ${g.names[0] || g.emails[0] || "mentor"} details`}
                      onClick={() => setSelected(g.key)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-5">
                    {groups.length
                      ? "No mentors match your search."
                      : "No mentors have been nominated on your company’s placements yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Sheet
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto bg-ivory sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{detail?.names.join(" · ") || "Mentor details"}</SheetTitle>
            <SheetDescription>
              {detail?.company} · Nominated mentor and placement details
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-5 space-y-5">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["First name", unique(contacts(detail).map((c) => c.first)).join(" / ")],
                  ["Last name", unique(contacts(detail).map((c) => c.last)).join(" / ")],
                  ["Email", detail.emails.join(", ")],
                  ["Mobile", unique(contacts(detail).map((c) => c.phone)).join(" / ")],
                  ["Position", unique(contacts(detail).map((c) => c.position)).join(" / ")],
                  ["Nomination", unique(contacts(detail).map((c) => c.kind)).join(" / ")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words">{value || "Not recorded"}</dd>
                  </div>
                ))}
              </dl>
              <h2 className="font-semibold">Linked placements ({detail.records.length})</h2>
              {detail.records.map((record) => (
                <div key={String(record["id"])} className="rounded border border-border p-4">
                  <h3 className="font-semibold">
                    {text(record["career"]) || "Career not recorded"}
                  </h3>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    {[
                      ["Company", "company"],
                      ["Company code", "company_code"],
                      ["Sector", "sector"],
                      ["Overview", "description"],
                      ["Location", "location"],
                      ["Address", "address"],
                      ["Country", "country_code"],
                      ["Website", "website"],
                      ["Available dates", "availability"],
                      ["Listed dates", "dates"],
                      ["Arrival time", "arrival_time"],
                      ["Collection time", "collection_time"],
                      ["Arrival instructions", "arrival_instruction"],
                      ["Days per visit", "days_per_shadow"],
                      ["Places per date", "max_applicants"],
                      ["Mode", "mode"],
                      ["Year", "year"],
                      ["Active", "active"],
                    ].map(([label, key]) => {
                      const value = record[key!];
                      return (
                        <div
                          key={key}
                          className={
                            key === "description" || key === "arrival_instruction"
                              ? "col-span-2"
                              : ""
                          }
                        >
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words">
                            {Array.isArray(value)
                              ? value.join(", ") || "Not recorded"
                              : typeof value === "boolean"
                                ? value
                                  ? "Yes"
                                  : "No"
                                : value == null || value === ""
                                  ? "Not recorded"
                                  : String(value)}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
