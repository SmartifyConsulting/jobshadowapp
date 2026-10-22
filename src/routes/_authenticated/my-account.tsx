import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TERMS } from "@/lib/terms";
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
      <section className="bg-teal space-y-10 px-5 py-10 text-primary-foreground">
        <div className="mx-auto max-w-4xl space-y-10">
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
        </div>
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
  const [files, setFiles] = useState<{ id?: File | undefined; photo?: File | undefined }>({});

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
    if (!files.id) return setErrors({ form: "Please upload a scan of the scholar's ID." });
    setBusy(true);
    const upload = async (file: File | undefined, kind: string) => {
      if (!file) return null;
      const path = `${userId}/${kind}-${Date.now()}-${file.name}`;
      const res = await supabase.storage.from("scholar-docs").upload(path, file, { upsert: true });
      if (res.error) throw new Error(res.error.message);
      return path;
    };
    let id_file_path: string | null = null;
    let photo_path: string | null = null;
    try {
      id_file_path = await upload(files.id, "id");
      photo_path = await upload(files.photo, "photo");
    } catch (ex) {
      setBusy(false);
      return setErrors({ form: (ex as Error).message });
    }
    const { error } = await supabase.from("scholar_profiles").insert({ ...r.data, career_interests: r.data.career_interests ?? null, dietary: r.data.dietary ?? null, guardian_id: r.data.guardian_id ?? null, user_id: userId, id_file_path, photo_path });
    setBusy(false);
    if (error) return setErrors({ form: error.message });
    qc.invalidateQueries({ queryKey: ["profile"] });
  }
  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Personal Details</h1>
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
      <details className="group -mx-6 bg-cta px-6 py-5 text-cta-foreground">
        <summary className="flex cursor-pointer list-none items-center gap-3 font-display text-2xl">
          <ChevronDown className="h-6 w-6 shrink-0 transition group-open:rotate-180" /> T &amp; C's
        </summary>
        <a href="#" onClick={(e) => e.preventDefault()} className="mt-3 block text-sm font-bold underline">View here</a>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
          {TERMS.map((t, i) => <p key={i}>{t}</p>)}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f["tc_accepted"]} onChange={(e) => setF({ ...f, tc_accepted: e.target.checked })} />
          I agree with the Terms &amp; Conditions
        </label>
      </details>
      {errors["tc_accepted"] && <p className="text-xs text-destructive">{errors["tc_accepted"]}</p>}
      {errors["form"] && <p className="text-sm text-destructive">{errors["form"]}</p>}
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground">Complete &amp; Go To Step 2</Button>
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
  async function uploadIndemnity(id: string, file: File) {
    setErr(null);
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    const path = `${uid}/indemnity-${id}-${file.name}`;
    const up = await supabase.storage.from("scholar-docs").upload(path, file, { upsert: true });
    if (up.error) return setErr(up.error.message);
    await supabase.rpc("set_indemnity_path", { _booking: id, _path: path });
    await act("submit_indemnity", id);
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
              <label className="text-sm">
                <span className="font-semibold">Upload signed indemnity: </span>
                <input type="file" accept="image/*,application/pdf,.doc,.docx" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadIndemnity(b.id, file); }} />
              </label>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

type Placement = { id: number; company: string; sector: string; career: string; location: string; availability: string; amount: number; days_per_shadow: number | null; arrival_time: string | null; collection_time: string | null; description: string | null };

function NewBooking() {
  const qc = useQueryClient();
  const placements = useQuery({
    queryKey: ["placements"],
    queryFn: async () => ((await supabase.rpc("list_placements")).data ?? []) as Placement[],
  });
  const [sector, setSector] = useState("");
  const [career, setCareer] = useState("");
  const [step, setStep] = useState(1);
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

  const careers = [...new Set(options.map((p) => p.career))].sort();
  const hosts = options.filter((p) => p.career === career);
  const sel = "block w-full max-w-md border-b border-primary-foreground/50 bg-transparent p-2 text-primary-foreground outline-none [&>option]:text-foreground";
  const titles = ["Sector", "Career", "Company", "Placement Details", "Date & Pay"];
  const STEP_BG = ["bg-teal", "bg-cta", "bg-teal", "bg-cta", "bg-teal"];
  const canContinue = (step === 1 && !!sector) || (step === 2 && !!career) || (step === 3 && !!chosen) || step === 4;

  return (
    <div className="-mx-6">
      <div className={`${STEP_BG[step - 1]} px-6 py-5 text-primary-foreground`}>
        <div className="flex items-center gap-3">
          <ChevronDown className="h-6 w-6 shrink-0" />
          <h2 className="font-display text-2xl">Step {step}: {titles[step - 1]}</h2>
        </div>
        <div className="mt-5">
          {step === 1 && (
            <select className={sel} value={sector} onChange={(e) => { setSector(e.target.value); setCareer(""); setPid(null); setDate(""); }}>
              <option value="">Select a sector</option>
              {sectors.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          {step === 2 && (
            <>
              <select className={sel} value={career} onChange={(e) => { setCareer(e.target.value); setPid(null); setDate(""); }}>
                <option value="">Select a career</option>
                {careers.map((c) => <option key={c}>{c}</option>)}
              </select>
              {career && <p className="mt-3 text-sm">{options.find((p) => p.career === career)?.description || ""}</p>}
            </>
          )}
          {step === 3 && (
            <select className={sel} value={pid ?? ""} onChange={(e) => { setPid(Number(e.target.value) || null); setDate(""); }}>
              <option value="">Select a company</option>
              {hosts.map((p) => <option key={p.id} value={p.id}>{p.company} – {p.location}</option>)}
            </select>
          )}
          {step === 4 && chosen && (
            <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold">Company</dt><dd>{chosen.company}</dd></div>
              <div><dt className="font-semibold">Location</dt><dd>{chosen.location}</dd></div>
              <div><dt className="font-semibold">Days per shadow</dt><dd>{chosen.days_per_shadow ?? 1}</dd></div>
              <div><dt className="font-semibold">Arrival time</dt><dd>{chosen.arrival_time || "TBC"}</dd></div>
              <div><dt className="font-semibold">Collection time</dt><dd>{chosen.collection_time || "TBC"}</dd></div>
              <div><dt className="font-semibold">Fee</dt><dd>R{base.toFixed(0)}</dd></div>
            </dl>
          )}
          {step === 5 && chosen && (
            <div className="space-y-3">
              <p className="text-sm">{dates.length ? "Please select from the available dates below" : "There are no available dates for this placement."}</p>
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <button key={d} type="button" onClick={() => setDate(d)} className={`border px-3 py-1 text-sm ${date === d ? "bg-primary text-primary-foreground" : "border-primary-foreground/60"}`}>{d}</button>
                ))}
              </div>
              <div>
                <label className="text-sm font-semibold">Voucher code</label>
                <div className="mt-1 flex gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full max-w-xs border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none" />
                  <button type="button" onClick={applyVoucher} disabled={!code} className="border border-primary-foreground/60 px-4 py-1.5 text-sm font-semibold uppercase disabled:opacity-50">Apply</button>
                </div>
              </div>
              <p className="text-sm">Total: <strong>R{due.toFixed(0)}</strong>{voucher && ` (was R${base.toFixed(0)})`}</p>
            </div>
          )}
          {msg && <p aria-live="polite" className="mt-3 text-sm font-semibold">{msg}</p>}
        </div>
      </div>
      <div className="flex gap-2 bg-primary px-6 py-5">
        {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="bg-primary-foreground/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground">Back to Step {step - 1}</button>}
        {step < 5 ? (
          <button type="button" onClick={() => setStep(step + 1)} disabled={!canContinue} className="bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50">Continue to Step {step + 1}</button>
        ) : (
          <button type="button" onClick={async () => { await book(); setStep(1); setSector(""); setCareer(""); }} disabled={!chosen || !date} className="bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50">Pay with PayFast</button>
        )}
      </div>
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
