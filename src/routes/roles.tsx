import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, ChevronDown, Search, Bell } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT_EMAIL, ROLES } from "@/lib/data";

const BAND_COLORS = ["bg-cta text-cta-foreground", "bg-accent text-accent-foreground", "bg-teal text-teal-foreground", "bg-primary text-primary-foreground"];

export const Route = createFileRoute("/roles")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Job Roles — See the job shadows you can book | Job Shadow" },
      { name: "description", content: "Browse every job role you can shadow, from Accountant to Veterinarian, across business, education, health, design, engineering, ICT and more." },
      { property: "og:title", content: "Job Roles — Job Shadow" },
      { property: "og:description", content: "Already have an idea of your dream career? See the job shadows you can book." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Roles,
});

function Roles() {
  const [openFields, setOpenFields] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const placements = useQuery({
    queryKey: ["placements"],
    queryFn: async () => ((await supabase.rpc("list_placements")).data ?? []) as { career: string }[],
  });
  const noAvailabilityMessage = useQuery({
    queryKey: ["no-availability-message"],
    queryFn: async () => (await supabase.rpc("get_no_availability_message")).data,
  });
  const mentorCounts = useMemo(() => {
    const m = new Map<string, number>();
    (placements.data ?? []).forEach((p) => {
      const key = p.career.trim().toLowerCase();
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return m;
  }, [placements.data]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? ROLES.filter((r) => r.title.toLowerCase().includes(q) || r.field.toLowerCase().includes(q)) : ROLES;
  }, [search]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof ROLES>();
    filteredRoles.forEach((r) => m.set(r.field, [...(m.get(r.field) ?? []), r]));
    return [...m.entries()].map(([f, roles]) => [f, [...roles].sort((a, b) => a.title.localeCompare(b.title))] as const);
  }, [filteredRoles]);

  const isFieldOpen = (f: string) => (search.trim() ? true : openFields.has(f));
  const toggleField = (f: string) =>
    setOpenFields((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });

  return (
    <SiteLayout>
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" />
          <span className="font-display text-2xl uppercase">Job Roles</span>
        </div>
      </div>

      {!placements.isLoading && mentorCounts.size === 0 && noAvailabilityMessage.data && (
        <div className="bg-accent px-5 py-4 text-center text-sm font-semibold text-accent-foreground">
          {noAvailabilityMessage.data}
        </div>
      )}

      <section className="bg-teal px-5 pb-10 pt-12 text-center text-teal-foreground">
        <h2 className="font-display text-2xl md:text-3xl">Already have an idea of your dream career?</h2>
        <p className="font-display text-2xl md:text-3xl">See some of the job shadows you can book below!</p>
        <p className="mx-auto mt-5 max-w-2xl text-sm">If the role that you are looking for is not listed, please email <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold">{CONTACT_EMAIL}</a> so we can help you.</p>
        <a href="#roles-list" className="mt-6 inline-block rounded-2xl bg-cta px-7 py-3 text-sm font-bold uppercase tracking-wide text-cta-foreground transition hover:brightness-110">Browse Roles</a>
        <div className="mx-auto mt-6 max-w-2xl text-sm">
          <p>Need to easily identify your <strong>most suited career orientation</strong>, <strong>tertiary qualification</strong> and <strong>school subject requirements</strong> for this ideal career?</p>
          <p className="mt-3">Why not <strong>book a job shadow</strong> and get a <strong>10% discount on an online Career Guidance Tool</strong>.</p>
          <p className="mt-3">This is an online self-evaluation process which is <strong>easily accessible</strong>, identifies your interests and skills to <strong>best match your personality type</strong>, with <strong>immediate feedback</strong> via a report card to your inbox the moment you are done!</p>
          <p className="mt-3"><a href={`mailto:${CONTACT_EMAIL}?subject=Career%20Guidance%20Tool`} className="font-bold underline">Click here</a> to receive a promo code to access the <strong>Career Guidance Tool.</strong></p>
        </div>
      </section>

      <div id="roles-list" className="bg-primary px-5 py-6">
        <div className="relative mx-auto max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/60" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for a role or category…"
            className="w-full rounded-full border border-primary-foreground/30 bg-primary-foreground/10 py-2.5 pl-10 pr-4 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-primary-foreground/60"
          />
        </div>
        <p className="mx-auto mt-3 max-w-xl text-center text-xs text-primary-foreground/70">
          Tap the bell on a role with no host to be notified when one becomes available.
        </p>
      </div>

      {grouped.length === 0 && (
        <p className="bg-primary px-5 pb-10 text-center text-sm text-primary-foreground/70">No roles match “{search}”.</p>
      )}

      {grouped.map(([f, roles], fi) => {
        const fieldOpen = isFieldOpen(f);
        return (
          <div key={f}>
            <button
              onClick={() => toggleField(f)}
              aria-expanded={fieldOpen}
              className={`flex w-full items-center justify-between gap-3 px-5 py-5 text-left ${BAND_COLORS[fi % BAND_COLORS.length]}`}
            >
              <h2 className="font-display text-2xl uppercase">{f}</h2>
              <ChevronDown className={`h-6 w-6 shrink-0 transition ${fieldOpen ? "rotate-180" : ""}`} />
            </button>
            {fieldOpen && (
              <div className="bg-muted text-foreground">
                <div className="hidden items-center justify-between gap-6 border-b border-border px-5 py-2 sm:flex">
                  <span />
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">Host</span>
                </div>
                <div className="divide-y divide-border">
                  {roles.map((r) => {
                    const count = mentorCounts.get(r.title.trim().toLowerCase()) ?? 0;
                    return (
                      <div key={r.slug} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div className="flex-1">
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            {r.title}{r.video && <PlayCircle className="h-4 w-4" aria-label="Has video" />}
                          </p>
                          {r.summary.split("\n").map((p, i) => <p key={i} className="mt-1 text-sm text-muted-foreground">{p}</p>)}
                          {r.video && <div className="mt-3 max-w-xl"><YouTube id={r.video} title={r.title} /></div>}
                          {count > 0 && (
                            <Link to="/auth" className="mt-3 inline-block rounded-full bg-cta px-5 py-2 text-xs font-semibold uppercase tracking-wider text-cta-foreground">Book this Job Shadow</Link>
                          )}
                        </div>
                        {count > 0 ? (
                          <span className="shrink-0 self-start rounded-full bg-cta px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-cta-foreground">
                            {count} mentor{count === 1 ? "" : "s"} available
                          </span>
                        ) : (
                          <div className="flex shrink-0 items-center gap-2 self-start">
                            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                              None available
                            </span>
                            <NotifyBell career={r.title} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </SiteLayout>
  );
}

function NotifyBell({ career }: { career: string }) {
  const [state, setState] = useState<"idle" | "ask" | "busy" | "done">("idle");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function subscribe(addr: string) {
    setState("busy"); setErr(null);
    const { error } = await supabase.from("role_notify_subscriptions").insert({ career, email: addr.trim().toLowerCase() });
    if (error) { setErr("Please enter a valid email address."); setState("ask"); return; }
    setState("done");
  }
  async function click() {
    if (state === "done") return;
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) return subscribe(data.user.email);
    setState("ask");
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={click} aria-label={`Notify me when a host is available for ${career}`} title="Notify me when a host is available"
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${state === "done" ? "bg-cta text-cta-foreground" : "bg-card text-muted-foreground hover:bg-cta hover:text-cta-foreground"}`}>
        <Bell className="h-4 w-4" />
      </button>
      {state === "ask" && (
        <form onSubmit={(e) => { e.preventDefault(); void subscribe(email); }} className="flex items-center gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="w-44 rounded-full border border-border bg-card px-3 py-1 text-xs outline-none" />
          <button className="rounded-full bg-cta px-3 py-1 text-xs font-bold text-cta-foreground">Notify me</button>
        </form>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}
      {state === "done" && <p role="status" className="max-w-[14rem] text-right text-xs font-semibold">You will be notified when a host becomes available.</p>}
    </div>
  );
}
