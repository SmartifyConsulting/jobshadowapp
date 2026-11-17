import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Briefcase, MessageSquare, ChevronLeft, ChevronRight, Settings as SettingsIcon, X } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteLayout";
import { bookingDayKey, countByDay, filterHostBookings } from "@/lib/host-bookings";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({
    meta: [
      { title: "Host Portal | JobShadow" },
      { name: "description", content: "Manage your Job Shadow placements and bookings." },
      { property: "og:title", content: "Host Portal | JobShadow" },
      { property: "og:description", content: "Manage your Job Shadow placements and bookings." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MentorPortal,
});

type Placement = {
  id: number; company: string; career: string; sector: string; location: string; dates: string | null;
  active: boolean; max_applicants: number | null; days_per_shadow: number | null;
  arrival_time: string | null; collection_time: string | null; description: string | null; mode: string | null;
  allow_weekends: boolean; allow_off_season: boolean;
};
type MentorBooking = {
  id: string; company: string; career: string; location: string; shadow_date: string; status: string;
  scholar_name: string | null; scholar_contact: string | null; scholar_school: string | null; indemnity_received: boolean;
  internship_preapproved: boolean; internship_notes: string | null;
};

const STATUS: Record<string, string> = { awaiting_payment: "Awaiting payment", indemnity_required: "Paid – indemnity needed", confirmed: "Confirmed", completed: "Completed" };

type Section = "calendar" | "shadows" | "messages" | "settings";
const MENU: { id: Section; label: string; icon: typeof CalendarDays }[] = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "shadows", label: "Job Shadows", icon: Briefcase },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MentorPortal() {
  const [active, setActive] = useState<Section>("calendar");
  const placements = useQuery({
    queryKey: ["mentor-placements"],
    queryFn: async () => ((await supabase.rpc("list_mentor_placements")).data ?? []) as Placement[],
  });
  const bookings = useQuery({
    queryKey: ["mentor-bookings"],
    queryFn: async () => ((await supabase.rpc("list_mentor_bookings")).data ?? []) as MentorBooking[],
  });
  const all = bookings.data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <SiteHeader />
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
      <aside className="shrink-0 bg-brand-deep text-primary-foreground shadow-warm md:w-60">
        <p className="px-6 pt-4 text-xs font-bold uppercase tracking-widest text-primary-foreground/70 md:pt-6">Host Portal</p>
        <nav className="flex gap-1 overflow-x-auto px-3 py-3 md:block md:space-y-1">
          {MENU.map((m) => (
            <button key={m.id} onClick={() => setActive(m.id)} aria-pressed={active === m.id} className={`flex shrink-0 items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left text-sm font-medium transition md:w-full ${active === m.id ? "border-primary-foreground bg-primary-foreground/15" : "border-transparent text-primary-foreground/85 hover:bg-primary-foreground/10"}`}>
              <m.icon className="h-4 w-4" /> {m.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <main className="space-y-6 p-6">
          {bookings.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {active === "calendar" && <HostCalendar bookings={all} />}
          {active === "shadows" && <JobShadows bookings={all} placements={placements.data ?? []} loadingPlacements={placements.isLoading} />}
          {active === "messages" && <HostMessages />}
          {active === "settings" && <HostSettings />}
        </main>
      </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function HostCalendar({ bookings }: { bookings: MentorBooking[] }) {
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [day, setDay] = useState<string | null>(null);
  const counts = useMemo(() => countByDay(bookings), [bookings]);
  const first = new Date(month.y, month.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const key = (d: number) => `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const shift = (n: number) => { const d = new Date(month.y, month.m + n, 1); setMonth({ y: d.getFullYear(), m: d.getMonth() }); setDay(null); };
  const today = todayKey();
  const selected = day ? bookings.filter((b) => bookingDayKey(b.shadow_date) === day && b.status !== "cancelled") : [];
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-full border bg-card"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-36 text-center text-sm font-semibold">{first.toLocaleString("en-ZA", { month: "long", year: "numeric" })}</span>
          <button onClick={() => shift(1)} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-full border bg-card"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 rounded-xl border bg-card p-3 text-center text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1 font-semibold text-muted-foreground">{d}</div>)}
        {cells.map((d, i) => d === null ? <div key={`e${i}`} /> : (
          <button key={d} onClick={() => setDay(key(d))} className={`relative min-h-16 rounded-md border p-1 text-left transition hover:bg-muted ${day === key(d) ? "border-primary" : "border-transparent"} ${key(d) === today ? "bg-accent/30" : ""}`}>
            <span className="text-sm">{d}</span>
            {(counts.get(key(d)) ?? 0) > 0 && (
              <span className="absolute bottom-1 right-1 rounded-full bg-cta px-2 py-0.5 text-[10px] font-bold text-cta-foreground">
                {counts.get(key(d))}<span className="hidden sm:inline"> student{counts.get(key(d)) === 1 ? "" : "s"}</span>
              </span>
            )}
          </button>
        ))}
      </div>
      {day && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Booked on {day}</h2>
          {selected.length === 0 ? <p className="text-sm text-muted-foreground">No students booked on this day.</p> : selected.map((b) => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </section>
  );
}

function JobShadows({ bookings, placements, loadingPlacements }: { bookings: MentorBooking[]; placements: Placement[]; loadingPlacements: boolean }) {
  const [filter, setFilter] = useState<"upcoming" | "pending" | "all">("upcoming");
  const rows = filterHostBookings(bookings, filter, todayKey());
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Job Shadows</h1>
        <div className="flex rounded-full border bg-card p-1 text-xs font-semibold">
          {(["upcoming", "pending", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-full px-4 py-1.5 capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No job shadows here.</p> : rows.map((b) => <BookingCard key={b.id} booking={b} />)}
      </div>
      <div>
        <h2 className="text-lg font-semibold">My Placements</h2>
        {loadingPlacements && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
        {!loadingPlacements && placements.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No placements are linked to this email. Contact the JobShadow admin if this looks wrong.</p>}
        <div className="mt-4 space-y-4">{placements.map((p) => <PlacementCard key={p.id} placement={p} />)}</div>
      </div>
    </section>
  );
}

function parseUsDate(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function toUsDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function DatesPicker({ value, onChange, allowWeekends = true, allowOffSeason = true }: { value: string; onChange: (v: string) => void; allowWeekends?: boolean; allowOffSeason?: boolean }) {
  const dates = value.split(",").map((s) => s.trim()).filter(Boolean).map(parseUsDate).filter((d): d is Date => d !== null);
  function set(next: Date[]) {
    onChange(next.map(toUsDate).join(", "));
  }
  const disabledMatchers = [
    { before: new Date() },
    ...(allowWeekends ? [] : [(d: Date) => d.getDay() === 0 || d.getDay() === 6]),
    ...(allowOffSeason ? [] : [(d: Date) => { const m = d.getMonth() + 1; return m < 2 || m > 10; }]),
  ];
  return (
    <div className="flex flex-wrap items-start gap-4">
      <Calendar mode="multiple" selected={dates} onSelect={(d) => set(d ?? [])} disabled={disabledMatchers} className="rounded-md border bg-background" />
      <div className="flex flex-wrap gap-1.5">
        {dates.length === 0 && <span className="text-xs text-muted-foreground">No dates set.</span>}
        {dates.map((d, i) => (
          <span key={i} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
            {toUsDate(d)}
            <button type="button" onClick={() => set(dates.filter((_, idx) => idx !== i))} aria-label={`Remove ${toUsDate(d)}`} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

function HostSettings() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["host-settings"],
    queryFn: async () => (await supabase.rpc("get_my_host_settings")).data,
  });
  const [paused, setPaused] = useState(false);
  const [maxWeek, setMaxWeek] = useState("");
  const [maxMonth, setMaxMonth] = useState("");
  const [bufferDays, setBufferDays] = useState("");
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    const s = settings.data;
    setPaused(s.paused);
    setMaxWeek(s.max_shadows_per_week != null ? String(s.max_shadows_per_week) : "");
    setMaxMonth(s.max_shadows_per_month != null ? String(s.max_shadows_per_month) : "");
    setBufferDays(s.buffer_days != null ? String(s.buffer_days) : "");
    setBlackoutDates((s.blackout_dates ?? []).map(parseUsDate).filter((d): d is Date => d !== null));
  }, [settings.data]);

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const { error } = await supabase.rpc("update_my_host_settings", {
      _paused: paused,
      _max_shadows_per_week: maxWeek ? Number(maxWeek) : null,
      _max_shadows_per_month: maxMonth ? Number(maxMonth) : null,
      _buffer_days: bufferDays ? Number(bufferDays) : null,
      _blackout_dates: blackoutDates.map(toUsDate),
    } as never);
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["host-settings"] });
  }

  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        These apply across all your placements. Sensible defaults are used unless you set your own — you don't need
        to configure anything here unless you want to.
      </p>

      <div className="rounded-lg border bg-card p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          Temporarily pause new booking requests
        </label>
        <p className="mt-1 text-xs text-muted-foreground">Your placements stay listed, but students can't book a new job shadow with you while this is on.</p>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <label className="text-sm">Maximum shadows per week
          <input type="number" min={0} value={maxWeek} onChange={(e) => setMaxWeek(e.target.value)} placeholder="No limit" className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none" />
        </label>
        <label className="text-sm">Maximum shadows per month
          <input type="number" min={0} value={maxMonth} onChange={(e) => setMaxMonth(e.target.value)} placeholder="No limit" className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none" />
        </label>
        <label className="text-sm sm:col-span-2">Buffer between job shadows (days)
          <input type="number" min={0} value={bufferDays} onChange={(e) => setBufferDays(e.target.value)} placeholder="No buffer" className="mt-1 block w-full max-w-xs border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none" />
        </label>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold">Personal blackout dates</p>
        <p className="mt-1 text-xs text-muted-foreground">Dates you're unavailable — leave, meetings, holidays. Separate from the dates you set per placement.</p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <Calendar mode="multiple" selected={blackoutDates} onSelect={(d) => setBlackoutDates(d ?? [])} className="rounded-md border bg-background" />
          <div className="flex flex-wrap gap-1.5">
            {blackoutDates.length === 0 && <span className="text-xs text-muted-foreground">No blackout dates set.</span>}
            {blackoutDates.map((d, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                {toUsDate(d)}
                <button type="button" onClick={() => setBlackoutDates((cur) => cur.filter((_, idx) => idx !== i))} aria-label={`Remove ${toUsDate(d)}`} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}
      <button onClick={save} disabled={busy || settings.isLoading} className="rounded bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50">{saved ? "Saved" : "Save"}</button>
    </section>
  );
}

function HostMessages() {
  const q = useQuery({
    queryKey: ["emails"],
    queryFn: async () => (await supabase.from("email_outbox").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">Messages</h1>
      {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
      {q.data?.map((m) => (
        <details key={m.id} className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm"><strong>{m.subject}</strong> <span className="text-muted-foreground">· {new Date(m.created_at).toLocaleString("en-ZA")}</span></summary>
          <p className="mt-2 whitespace-pre-line text-sm">{m.body}</p>
        </details>
      ))}
    </section>
  );
}

function BookingCard({ booking }: { booking: MentorBooking }) {
  const qc = useQueryClient();
  const [preapproved, setPreapproved] = useState(booking.internship_preapproved);
  const [notes, setNotes] = useState(booking.internship_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveInternship() {
    setBusy(true);
    setSaved(false);
    const { error } = await supabase.rpc("set_internship_preapproval", { _booking: booking.id, _preapproved: preapproved, _notes: (notes || null) as string });
    setBusy(false);
    if (error) return window.alert(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["mentor-bookings"] });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{booking.scholar_name ?? "Scholar"} · {booking.career}</p>
          <p className="text-sm text-muted-foreground">{booking.scholar_school ?? ""} · {booking.location} · {booking.shadow_date}</p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{STATUS[booking.status] ?? booking.status}</span>
      </div>
      <p className="mt-2 text-sm">
        Contact: {booking.scholar_contact ?? "—"} · Indemnity: {booking.indemnity_received ? "Received" : "Outstanding"}
      </p>
      {booking.status === "completed" && (
        <Link to="/evaluation/$bookingId" params={{ bookingId: booking.id }} className="mt-2 inline-block rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground">Evaluate this placement</Link>
      )}
      <div className="mt-3 border-t border-foreground/10 pt-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={preapproved} onChange={(e) => setPreapproved(e.target.checked)} />
          Pre-approve this scholar for a future internship at your company
        </label>
        {preapproved && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for admin (e.g. preferred start date, role)"
            className="mt-2 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
          />
        )}
        <button onClick={saveInternship} disabled={busy} className="mt-2 rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50">
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

function PlacementCard({ placement }: { placement: Placement }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [vals, setVals] = useState({
    dates: placement.dates ?? "",
    active: placement.active,
    max_applicants: placement.max_applicants != null ? String(placement.max_applicants) : "",
    arrival_time: placement.arrival_time ?? "",
    collection_time: placement.collection_time ?? "",
    description: placement.description ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("update_mentor_placement", {
      _id: placement.id,
      _dates: vals.dates,
      _active: vals.active,
      _max_applicants: vals.max_applicants ? Number(vals.max_applicants) : (null as unknown as number),
      _arrival_time: vals.arrival_time,
      _collection_time: vals.collection_time,
      _description: vals.description,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["mentor-placements"] });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{placement.career} — {placement.company}{placement.mode ? ` (${placement.mode})` : ""}</p>
          <p className="text-sm text-muted-foreground">{placement.sector} · {placement.location}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${placement.active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
          {placement.active ? "Active" : "Inactive"}
        </span>
      </div>

      {!editing ? (
        <div className="mt-3 space-y-1 text-sm">
          <p>Dates: {placement.dates || "—"}</p>
          <p>Places: {placement.max_applicants ?? "—"} · Arrival: {placement.arrival_time || "TBC"} · Collection: {placement.collection_time || "TBC"}</p>
          {placement.description && <p className="text-muted-foreground">{placement.description}</p>}
          <button onClick={() => setEditing(true)} className="mt-2 rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground">Edit</button>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-sm">Available dates</p>
            {!(placement.allow_weekends && placement.allow_off_season) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {!placement.allow_weekends && "Weekends are excluded for this placement. "}
                {!placement.allow_off_season && "Only February–October dates are allowed. "}
                Ask JobShadow admin to change this.
              </p>
            )}
            <div className="mt-2"><DatesPicker value={vals.dates} onChange={(v) => setVals({ ...vals, dates: v })} allowWeekends={placement.allow_weekends} allowOffSeason={placement.allow_off_season} /></div>
          </div>
          <label className="text-sm">Places
            <input type="number" value={vals.max_applicants} onChange={(e) => setVals({ ...vals, max_applicants: e.target.value })} className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none" />
          </label>
          <label className="text-sm">Arrival time
            <input value={vals.arrival_time} onChange={(e) => setVals({ ...vals, arrival_time: e.target.value })} className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none" />
          </label>
          <label className="text-sm">Collection time
            <input value={vals.collection_time} onChange={(e) => setVals({ ...vals, collection_time: e.target.value })} className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none" />
          </label>
          <label className="text-sm sm:col-span-2">Description
            <textarea value={vals.description} onChange={(e) => setVals({ ...vals, description: e.target.value })} className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={vals.active} onChange={(e) => setVals({ ...vals, active: e.target.checked })} />
            Active (visible for booking)
          </label>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={save} disabled={busy} className="rounded bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50">Save</button>
            <button onClick={() => setEditing(false)} className="rounded bg-muted px-4 py-2 text-xs font-bold uppercase text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
