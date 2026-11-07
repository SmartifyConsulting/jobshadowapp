import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({
    meta: [
      { title: "Mentor Portal | JobShadow" },
      { name: "description", content: "Manage your Job Shadow placements and bookings." },
      { property: "og:title", content: "Mentor Portal | JobShadow" },
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
  arrival_time: string | null; collection_time: string | null; description: string | null;
};
type MentorBooking = {
  id: string; company: string; career: string; location: string; shadow_date: string; status: string;
  scholar_name: string | null; scholar_contact: string | null; scholar_school: string | null; indemnity_received: boolean;
};

const STATUS: Record<string, string> = { awaiting_payment: "Awaiting payment", indemnity_required: "Paid – indemnity needed", confirmed: "Confirmed", completed: "Completed" };

function MentorPortal() {
  const placements = useQuery({
    queryKey: ["mentor-placements"],
    queryFn: async () => ((await supabase.rpc("list_mentor_placements")).data ?? []) as Placement[],
  });
  const bookings = useQuery({
    queryKey: ["mentor-bookings"],
    queryFn: async () => ((await supabase.rpc("list_mentor_bookings")).data ?? []) as MentorBooking[],
  });

  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-5xl text-xl font-bold md:text-2xl">Mentor Portal</h1>
      </div>
      <section className="mx-auto max-w-5xl space-y-10 px-5 py-8">
        <div>
          <h2 className="font-display text-2xl">My Placements</h2>
          {placements.isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
          {!placements.isLoading && placements.data?.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">No placements are linked to this email. Contact the JobShadow admin if this looks wrong.</p>
          )}
          <div className="mt-4 space-y-4">
            {placements.data?.map((p) => <PlacementCard key={p.id} placement={p} />)}
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl">Upcoming Bookings</h2>
          {bookings.isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
          {!bookings.isLoading && bookings.data?.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">No bookings yet.</p>
          )}
          <div className="mt-4 space-y-3">
            {bookings.data?.map((b) => (
              <div key={b.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{b.scholar_name ?? "Scholar"} · {b.career}</p>
                    <p className="text-sm text-muted-foreground">{b.scholar_school ?? ""} · {b.location} · {b.shadow_date}</p>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{STATUS[b.status] ?? b.status}</span>
                </div>
                <p className="mt-2 text-sm">
                  Contact: {b.scholar_contact ?? "—"} · Indemnity: {b.indemnity_received ? "Received" : "Outstanding"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
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
      _max_applicants: vals.max_applicants ? Number(vals.max_applicants) : null,
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
          <p className="font-semibold">{placement.career} — {placement.company}</p>
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
          <label className="text-sm">Dates (comma separated)
            <input value={vals.dates} onChange={(e) => setVals({ ...vals, dates: e.target.value })} className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none" />
          </label>
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
