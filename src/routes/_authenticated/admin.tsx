import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | JobShadow" },
      { name: "description", content: "JobShadow admin: applications, companies, vouchers and careers." },
      { property: "og:title", content: "Admin | JobShadow" },
      { property: "og:description", content: "JobShadow admin area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Col = { key: string; label: string };
const TABLES: { id: string; label: string; table: string; cols: Col[] }[] = [
  { id: "apps", label: "Applications", table: "legacy_applications", cols: [
    { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "id_number", label: "ID No." },
    { key: "email", label: "Email" }, { key: "contact", label: "Contact" }, { key: "school", label: "School" },
    { key: "company", label: "Company" }, { key: "career", label: "Career" }, { key: "dates", label: "Dates" },
    { key: "paid", label: "Paid" }, { key: "indemnity", label: "Indemnity" }, { key: "cancelled", label: "Cancelled" } ] },
  { id: "companies", label: "Companies", table: "companies", cols: [
    { key: "id", label: "ID" }, { key: "company", label: "Company" }, { key: "career", label: "Career" },
    { key: "sector", label: "Sector" }, { key: "location", label: "Location" }, { key: "mentor_name", label: "Mentor" },
    { key: "mentor_email", label: "Mentor email" }, { key: "mentor_phone", label: "Mentor phone" },
    { key: "dates", label: "Dates" }, { key: "max_applicants", label: "Places" }, { key: "amount", label: "Price (R)" } ] },
  { id: "vouchers", label: "Vouchers", table: "vouchers", cols: [
    { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "code", label: "Code" },
    { key: "discount", label: "Discount %" }, { key: "available_from", label: "From" },
    { key: "available_until", label: "Until" }, { key: "usage_limit", label: "Limit" } ] },
  { id: "sectors", label: "Sectors", table: "sectors", cols: [{ key: "id", label: "ID" }, { key: "name", label: "Name" }] },
  { id: "careers", label: "Careers", table: "careers", cols: [{ key: "id", label: "ID" }, { key: "name", label: "Name" }] },
  { id: "users", label: "Users", table: "legacy_users", cols: [
    { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "has_profile", label: "Profile" } ] },
];

function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
      return (data?.length ?? 0) > 0;
    },
  });
}

function AdminPage() {
  const admin = useIsAdmin();
  return (
    <SiteLayout>
      <PageHero title="Admin" sub="All records brought over from the old JobShadow admin." />
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-4 flex justify-end">
          <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))}>Log out</Button>
        </div>
        {admin.isLoading ? <p>Loading…</p> : !admin.data ? (
          <p className="rounded-lg border bg-card p-6">Your account doesn't have admin access. Ask JobShadow to grant it.</p>
        ) : (
          <Tabs defaultValue="apps">
            <TabsList className="flex-wrap">
              {TABLES.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
            {TABLES.map((t) => (
              <TabsContent key={t.id} value={t.id}><DataTable table={t.table} cols={t.cols} /></TabsContent>
            ))}
          </Tabs>
        )}
      </section>
    </SiteLayout>
  );
}

function fmt(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function DataTable({ table, cols }: { table: string; cols: Col[] }) {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", table],
    queryFn: async () => {
      let query = supabase.from(table as "careers").select("*").order("id", { ascending: false });
      if (table === "legacy_users") query = (query as any).eq("is_spam", false);
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await query.range(from, from + 999);
        if (error) throw error;
        rows.push(...(data as Record<string, unknown>[]));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
  });
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data ?? []).filter((r) => !s || cols.some((c) => fmt(r[c.key]).toLowerCase().includes(s)));
  }, [data, q, cols]);
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <span className="text-sm text-muted-foreground">{isLoading ? "Loading…" : `${rows.length} records`}</span>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>{cols.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="border-t">
                {cols.map((c) => <td key={c.key} className="px-3 py-2 align-top">{fmt(r[c.key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
