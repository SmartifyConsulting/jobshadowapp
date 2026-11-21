import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/company-report")({
  head: () => ({
    meta: [{ title: "B-BBEE / CPD Report | JobShadow" }, { name: "robots", content: "noindex" }],
  }),
  component: CompanyReportPage,
});

type ReportRow = {
  scholar_name: string; school: string | null; population_group: string | null; gender: string | null;
  disability: string | null; citizenship: string | null; career: string; shadow_date: string;
  days_per_shadow: number | null; mentor_name: string; status: string;
};

function CompanyReportPage() {
  const companies = useQuery({
    queryKey: ["my-hr-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_hr_companies");
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: number; company: string }[];
    },
  });
  const [selected, setSelected] = useState<number | null>(null);
  const companyId = selected ?? companies.data?.[0]?.id ?? null;

  const report = useQuery({
    queryKey: ["company-bee-report", companyId],
    enabled: companyId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_company_bee_report", { _company: companyId! });
      if (error) throw new Error(error.message);
      return (data ?? []) as ReportRow[];
    },
  });

  function downloadCsv() {
    const rows = report.data ?? [];
    const headers = ["Scholar", "School", "Population group", "Gender", "Disability", "Citizenship", "Career", "Date", "Days", "Mentor", "Status"];
    const csv = [headers.join(","), ...rows.map((r) => [r.scholar_name, r.school, r.population_group, r.gender, r.disability, r.citizenship, r.career, r.shadow_date, r.days_per_shadow, r.mentor_name, r.status].map((v) => `"${String(v ?? "Not declared").replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "bee-cpd-report.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">B-BBEE / CPD Report</h1>
        <p className="mx-auto mt-2 max-w-7xl text-sm">Job shadows hosted at your company, with the demographic breakdown needed to claim CPD points and CSI spend credit. Demographic fields are self-declared by each scholar/parent.</p>
      </div>
      <section className="bg-muted/40 px-5 py-8">
        <div className="mx-auto max-w-7xl space-y-4">
          {companies.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {companies.data?.length === 0 && <p className="text-sm text-muted-foreground">No company is registered with your email as the HR contact.</p>}
          {companies.data && companies.data.length > 1 && (
            <label className="block max-w-xs text-sm">Company
              <select value={companyId ?? ""} onChange={(e) => setSelected(Number(e.target.value))} className="mt-1 w-full rounded border border-input bg-background px-2 py-2">
                {companies.data.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </label>
          )}
          {companyId !== null && (
            <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{report.data?.length ?? 0} job shadow(s)</h2>
                <Button variant="outline" disabled={!report.data?.length} onClick={downloadCsv}>Download CSV</Button>
              </div>
              <div className="mt-4 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead><tr>{["Scholar", "School", "Population group", "Gender", "Disability", "Citizenship", "Career", "Date", "Mentor", "Status"].map((h) => <th key={h} className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {report.isLoading ? <tr><td colSpan={10} className="p-4">Loading…</td></tr> : !report.data?.length ? <tr><td colSpan={10} className="p-4">No completed job shadows yet.</td></tr> : report.data.map((r, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="px-3 py-2">{r.scholar_name}</td>
                        <td className="px-3 py-2">{r.school ?? "—"}</td>
                        <td className="px-3 py-2">{r.population_group ?? "Not declared"}</td>
                        <td className="px-3 py-2">{r.gender ?? "Not declared"}</td>
                        <td className="px-3 py-2">{r.disability ?? "Not declared"}</td>
                        <td className="px-3 py-2">{r.citizenship ?? "Not declared"}</td>
                        <td className="px-3 py-2">{r.career}</td>
                        <td className="px-3 py-2">{r.shadow_date}</td>
                        <td className="px-3 py-2">{r.mentor_name}</td>
                        <td className="px-3 py-2">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
