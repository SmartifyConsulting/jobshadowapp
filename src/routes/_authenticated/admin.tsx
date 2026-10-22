import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users as UsersIcon, FileText, ShoppingCart, Briefcase, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin: Job Shadow" },
      { name: "description", content: "JobShadow admin: applications, companies, vouchers and careers." },
      { property: "og:title", content: "Admin: Job Shadow" },
      { property: "og:description", content: "JobShadow admin area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Col = { key: string; label: string };
const TABLES: { id: string; label: string; icon: typeof UsersIcon; table: string; singular: string; cols: Col[] }[] = [
  { id: "apps", label: "Applications", icon: UsersIcon, table: "legacy_applications", singular: "Applications", cols: [
    { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "id_number", label: "ID No." },
    { key: "email", label: "Email" }, { key: "contact", label: "Contact" }, { key: "school", label: "School" },
    { key: "company", label: "Company" }, { key: "career", label: "Career" }, { key: "dates", label: "Dates" },
    { key: "paid", label: "Paid" }, { key: "indemnity", label: "Indemnity" }, { key: "cancelled", label: "Cancelled" } ] },
  { id: "companies", label: "Companies", icon: FileText, table: "companies", singular: "Jobs", cols: [
    { key: "id", label: "ID" }, { key: "company", label: "Company" }, { key: "career", label: "Career" },
    { key: "sector", label: "Sector" }, { key: "location", label: "Location" }, { key: "mentor_name", label: "Mentor" },
    { key: "mentor_email", label: "Mentor email" }, { key: "mentor_phone", label: "Mentor phone" },
    { key: "dates", label: "Dates" }, { key: "max_applicants", label: "Places" }, { key: "amount", label: "Price (R)" } ] },
  { id: "vouchers", label: "Vouchers", icon: ShoppingCart, table: "vouchers", singular: "Vouchers", cols: [
    { key: "id", label: "#" }, { key: "name", label: "Name" }, { key: "code", label: "Code" },
    { key: "discount", label: "Discount" }, { key: "available_from", label: "From" },
    { key: "available_until", label: "Until" }, { key: "usage_limit", label: "Limit" } ] },
  { id: "sectors", label: "Sectors", icon: FileText, table: "sectors", singular: "Sectors", cols: [{ key: "id", label: "#" }, { key: "name", label: "Sector Name" }] },
  { id: "careers", label: "Careers", icon: Briefcase, table: "careers", singular: "Careers", cols: [{ key: "id", label: "#" }, { key: "name", label: "Career Name" }] },
  { id: "users", label: "Users", icon: GraduationCap, table: "legacy_users", singular: "Users", cols: [
    { key: "id", label: "Id" }, { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "has_profile", label: "Profile" } ] },
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
  const [active, setActive] = useState(TABLES[0]!.id);
  const section = TABLES.find((t) => t.id === active) ?? TABLES[0]!;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 shrink-0 bg-foreground text-background">
        <div className="px-5 py-6">
          <img src={logo.url} alt="Job Shadow" width={358} height={195} className="h-10 w-auto" />
        </div>
        <nav className="space-y-1 px-3">
          {TABLES.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm font-medium transition ${active === t.id ? "bg-background/10" : "hover:bg-background/5"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-end bg-foreground px-6 py-4 text-background">
          <button onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))} className="text-sm font-semibold hover:underline">Logout</button>
        </header>
        <main className="p-0">
          {admin.isLoading ? (
            <p className="p-8">Loading…</p>
          ) : !admin.data ? (
            <p className="p-8">Your account doesn't have admin access. Ask JobShadow to grant it.</p>
          ) : (
            <DataTable key={section.id} title={section.singular} table={section.table} cols={section.cols} />
          )}
        </main>
      </div>
    </div>
  );
}

function fmt(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function DataTable({ title, table, cols }: { title: string; table: string; cols: Col[] }) {
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 bg-foreground px-6 py-6 text-background">
        <h1 className="text-2xl font-semibold">{title} {!isLoading && `(${rows.length})`}</h1>
        <button className="bg-cta px-4 py-2 text-sm font-bold uppercase text-cta-foreground">Export</button>
      </div>
      <div className="bg-teal/90 px-6 py-6 text-primary-foreground">
        <label className="block max-w-sm text-sm">
          Search Table
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Input Value" className="mt-1 w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none placeholder:text-primary-foreground/60" />
        </label>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-primary-foreground/30 font-semibold">
                {cols.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2">{c.label}</th>)}
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-3 py-4" colSpan={cols.length + 1}>Loading…</td></tr>
              ) : rows.map((r) => (
                <tr key={String(r["id"])} className="border-b border-primary-foreground/10">
                  {cols.map((c) => <td key={c.key} className="px-3 py-2 align-top">{fmt(r[c.key])}</td>)}
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="rounded bg-sky-500 p-1.5 text-white" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      <button className="rounded bg-destructive p-1.5 text-white" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
