import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/my-account")({
  head: () => ({
    meta: [
      { title: "My applications | JobShadow" },
      { name: "description", content: "Your JobShadow profile, bookings, payments and notifications." },
      { property: "og:title", content: "My applications | JobShadow" },
      { property: "og:description", content: "Your JobShadow profile, bookings, payments and notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyAccount,
});

const STATUS: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  indemnity_required: "Paid – indemnity needed",
  confirmed: "Confirmed",
  completed: "Completed",
};

function useUser() {
  return useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
}

function MyAccount() {
  const { data: user } = useUser();
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("scholar_profiles").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });
  return (
    <SiteLayout>
      <PageHero title="My applications" />
      <section className="mx-auto max-w-4xl space-y-10 px-5 py-10">
        {profile.isLoading || !user ? (
          <p>Loading…</p>
        ) : !profile.data ? (
          <ProfileForm userId={user.id} />
        ) : (
          <>
            <Bookings />
            <NewBooking />
            <Emails />
          </>
        )}
      </section>
    </SiteLayout>
  );
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the scholar's name"),
  contact_no: z.string().trim().min(10, "Enter a valid phone number"),
  id_number: z.string().trim().regex(/^[A-Za-z0-9]{6,13}$/, "Enter an ID or passport number"),
  school: z.string().trim().min(2, "Enter the current school"),
  school_type: z.enum(["Public School", "Private School", "Home School"]),
  career_interests: z.string().trim().max(200).optional(),
  dietary: z.string().trim().max(200).optional(),
  guardian_name: z.string().trim().min(2, "Enter parent/guardian name"),
  guardian_contact: z.string().trim().min(10, "Enter parent/guardian number"),
  guardian_email: z.string().trim().email("Enter a valid email"),
  guardian_id: z.string().trim().optional(),
  tc_accepted: z.literal(true, { errorMap: () => ({ message: "Please accept the Terms & Conditions" }) }),
});

function ProfileForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Record<string, string | boolean>>({ school_type: "Public School", tc_accepted: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<{ id?: File; photo?: File }>({});
  void files;
  const field = (k: string, label: string, placeholder?: string) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} placeholder={placeholder} value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = profileSchema.safeParse(f);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.from("scholar_profiles").insert({ ...r.data, career_interests: r.data.career_interests ?? null, dietary: r.data.dietary ?? null, guardian_id: r.data.guardian_id ?? null, user_id: userId });
    setBusy(false);
    if (error) return setErrors({ form: error.message });
    qc.invalidateQueries({ queryKey: ["profile"] });
  }
  return (
    <form onSubmit={save} className="space-y-6 rounded-lg border bg-card p-6">
      <div>
        <h1 className="font-display text-4xl text-primary">Personal Details</h1>
        <h5 className="mt-1 font-semibold">NOTE: no more than one scholar per registration.</h5>
      </div>
      <h5 className="font-semibold">The Job Shadow-ers Details</h5>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("full_name", "Name & Surname", "NAME & SURNAME")}
        {field("contact_no", "Tel No", "TEL NO")}
        {field("id_number", "ID / passport number", "ID NO")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h5 className="font-semibold">The Job Shadow-ers Scan of ID</h5>
          <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFiles({ ...files, id: e.target.files?.[0] })} />
        </div>
        <div>
          <h5 className="font-semibold">The Job Shadow-ers Profile Photo</h5>
          <Input type="file" accept="image/*" onChange={(e) => setFiles({ ...files, photo: e.target.files?.[0] })} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("school", "Current School", "CURRENT SCHOOL")}
        <div>
          <div className="flex gap-4 pt-7 text-sm">
            {["Public School", "Private School", "Home School"].map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="radio" name="school_type" checked={f["school_type"] === t} onChange={() => setF({ ...f, school_type: t })} /> {t}
              </label>
            ))}
          </div>
        </div>
        {field("career_interests", "Career interests")}
        {field("dietary", "Dietary requirements/allergies")}
      </div>
      <h5 className="font-semibold">Parent / Guardian Information</h5>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("guardian_name", "Parent / Guardian name", "PARENT / GUARDIAN NAME")}
        {field("guardian_contact", "Parent / Guardian contact no", "PARENT / GUARDIAN CONTACT NO")}
        {field("guardian_email", "Parent / Guardian email address", "PARENT / GUARDIAN EMAIL ADDRESS")}
        {field("guardian_id", "Parent / Guardian ID/passport", "PARENT / GUARDIAN ID NO")}
      </div>
      <div>
        <h1 className="font-display text-2xl text-primary">T &amp; C's</h1>
        <details className="mt-2 rounded border p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-semibold text-foreground">Terms &amp; Conditions</summary>
          <p className="mt-2">You are reading a legal document, which is an agreement between yourself, the browser or user of the Website or Services described herein, and the owners of the Website, referred to as “Jobshadow”, being a company registered in South Africa situated at 4th on Anslow Office Park, Anslow Lane, Bryanston 2021. By using this Website, you agree that all the terms of this Agreement are reasonable. If you don’t think that they are reasonable, you must not use this Website.</p>
          <p className="mt-2">SERVICES: Connecting Scholars to host companies through the use of the Website, and thereby providing Scholars the opportunity to learn about a particular industry or occupation and to gain valuable work skills through job shadowing.</p>
          <p className="mt-2">All payments are done online through PayFast – we do not keep any personal information in this regard.</p>
        </details>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!f["tc_accepted"]} onChange={(e) => setF({ ...f, tc_accepted: e.target.checked })} />
        I agree with the Terms &amp; Conditions
      </label>
      {errors["tc_accepted"] && <p className="text-xs text-destructive">{errors["tc_accepted"]}</p>}
      {errors["form"] && <p className="text-sm text-destructive">{errors["form"]}</p>}
      <Button type="submit" disabled={busy}>Submit</Button>
    </form>
  );
}

function Bookings() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => (await supabase.from("bookings").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [err, setErr] = useState<string | null>(null);
  async function act(fn: "confirm_test_payment" | "submit_indemnity", id: string) {
    setErr(null);
    const { error } = await supabase.rpc(fn, { _booking: id });
    if (error) setErr(error.message);
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["emails"] });
  }
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl text-primary">My bookings</h2>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {q.data?.length === 0 && <p className="text-muted-foreground">No bookings yet. Book your first Job Shadow below.</p>}
      {q.data?.map((b) => (
        <div key={b.id} className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{b.career} · {b.company}</p>
              <p className="text-sm text-muted-foreground">{b.sector} · {b.location} · {b.shadow_date}</p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{STATUS[b.status] ?? b.status}</span>
          </div>
          <p className="mt-2 text-sm">Amount: R{Number(b.amount_due).toFixed(0)}{b.voucher_code ? ` (voucher ${b.voucher_code}, -${b.discount}%)` : ""}</p>
          <div className="mt-3 flex gap-2">
            {b.status === "awaiting_payment" && (
              <Button size="sm" onClick={() => act("confirm_test_payment", b.id)}>Pay R{Number(b.amount_due).toFixed(0)} (test payment)</Button>
            )}
            {b.status === "indemnity_required" && (
              <Button size="sm" onClick={() => act("submit_indemnity", b.id)}>I've uploaded the signed indemnity</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

type Placement = { id: number; company: string; sector: string; career: string; location: string; availability: string; amount: number };

function NewBooking() {
  const qc = useQueryClient();
  const placements = useQuery({
    queryKey: ["placements"],
    queryFn: async () => ((await supabase.rpc("list_placements")).data ?? []) as Placement[],
  });
  const [sector, setSector] = useState("");
  const [pid, setPid] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const today = new Date();
  const sectors = useMemo(() => [...new Set((placements.data ?? []).map((p) => p.sector))].sort(), [placements.data]);
  const options = (placements.data ?? []).filter((p) => p.sector === sector);
  const chosen = options.find((p) => p.id === pid);
  const dates = (chosen?.availability ?? "")
    .split(",").map((d) => d.trim()).filter(Boolean)
    .filter((d) => { const [m, dd, y] = d.split("/").map(Number); return new Date(y!, m! - 1, dd!) >= today; });
  const base = Number(chosen?.amount ?? 0);
  const due = voucher ? Math.max(0, base - (base * Number(voucher.discount)) / 100) : base;

  async function applyVoucher() {
    setMsg(null);
    const { data } = await supabase.rpc("check_voucher", { _code: code });
    const v = data?.[0];
    if (!v) { setVoucher(null); return setMsg("That promo code isn't valid right now."); }
    setVoucher({ code: v.code, discount: Number(v.discount) });
    setMsg(`Promo code applied: ${v.discount}% off.`);
  }
  async function book() {
    if (!chosen || !date) return setMsg("Choose a career and a date.");
    const { error } = await supabase.from("bookings").insert({
      company_id: chosen.id, company: chosen.company, sector: chosen.sector, career: chosen.career, location: chosen.location,
      shadow_date: date, base_amount: base, voucher_code: voucher?.code ?? null, discount: voucher?.discount ?? 0, amount_due: due,
    });
    if (error) return setMsg(error.message);
    setPid(null); setDate(""); setVoucher(null); setCode("");
    setMsg("Booking created – pay below to secure it.");
    qc.invalidateQueries({ queryKey: ["bookings"] });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="font-display text-3xl text-primary">Book a Job Shadow</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>1. Sector</Label>
          <select className="w-full rounded-md border bg-background p-2" value={sector} onChange={(e) => { setSector(e.target.value); setPid(null); setDate(""); }}>
            <option value="">Select a sector</option>
            {sectors.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <Label>2. Career &amp; host</Label>
          <select className="w-full rounded-md border bg-background p-2" value={pid ?? ""} disabled={!sector} onChange={(e) => { setPid(Number(e.target.value) || null); setDate(""); }}>
            <option value="">Select a career</option>
            {options.map((p) => <option key={p.id} value={p.id}>{p.career} – {p.company}</option>)}
          </select>
        </div>
        <div>
          <Label>3. Date</Label>
          <select className="w-full rounded-md border bg-background p-2" value={date} disabled={!chosen} onChange={(e) => setDate(e.target.value)}>
            <option value="">{chosen && dates.length === 0 ? "No upcoming dates" : "Select a date"}</option>
            {dates.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <Label>4. Promo code (optional)</Label>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
            <Button type="button" variant="outline" onClick={applyVoucher} disabled={!code}>Apply</Button>
          </div>
        </div>
      </div>
      {chosen && <p className="text-sm">Price: <strong>R{due.toFixed(0)}</strong>{voucher && ` (was R${base.toFixed(0)})`} · {chosen.location}</p>}
      {msg && <p aria-live="polite" className="text-sm text-muted-foreground">{msg}</p>}
      <Button onClick={book} disabled={!chosen || !date}>5. Continue to payment</Button>
    </div>
  );
}

function Emails() {
  const q = useQuery({
    queryKey: ["emails"],
    queryFn: async () => (await supabase.from("email_outbox").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl text-primary">Email notifications</h2>
      <p className="text-sm text-muted-foreground">Emails this booking triggers. They are recorded here and not sent yet.</p>
      {q.data?.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
      {q.data?.map((m) => (
        <details key={m.id} className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm"><strong>{m.subject}</strong> → {m.recipient || "(no address on file)"}</summary>
          <p className="mt-2 text-sm">{m.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">{m.template} · {new Date(m.created_at).toLocaleString()}</p>
        </details>
      ))}
    </div>
  );
}
