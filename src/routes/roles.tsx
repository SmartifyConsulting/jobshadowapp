import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayCircle, ChevronDown, Search, BellRing, Plus, Minus, Heart } from "lucide-react";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT_EMAIL, ROLES } from "@/lib/data";
import { notify } from "@/lib/dialogs";

export const Route = createFileRoute("/roles")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Careers — See the job shadows you can book | Job Shadow" },
      { name: "description", content: "Browse every career you can shadow, from Accountant to Veterinarian, across business, education, health, design, engineering, ICT and more." },
      { property: "og:title", content: "Careers — Job Shadow" },
      { property: "og:description", content: "Already have an idea of your dream career? See the job shadows you can book." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Roles,
});

function Roles() {
  const qc = useQueryClient();
  const { data: session } = useSiteSession();
  const [openFields, setOpenFields] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [openRoles, setOpenRoles] = useState<Set<string>>(new Set());
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const toggleRole = (slug: string) => setOpenRoles((prev) => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  const favourites = useQuery({
    queryKey: ["career-favourites", session?.user?.id],
    enabled: !!session?.user,
    queryFn: async () => new Set(((await supabase.from("career_favourites").select("career_slug")).data ?? []).map((r) => r.career_slug)),
  });

  async function toggleFavourite(slug: string) {
    if (!session?.user) return notify("Please sign in to save favourite careers.", "error");
    const isFav = favourites.data?.has(slug);
    const { error } = isFav
      ? await supabase.from("career_favourites").delete().eq("user_id", session.user.id).eq("career_slug", slug)
      : await supabase.from("career_favourites").insert({ user_id: session.user.id, career_slug: slug });
    if (error) return notify(error.message, "error");
    qc.invalidateQueries({ queryKey: ["career-favourites", session.user.id] });
  }

  const [location, setLocation] = useState("");
  const placements = useQuery({
    queryKey: ["placements"],
    queryFn: async () => ((await supabase.rpc("list_placements")).data ?? []) as { career: string; location: string | null }[],
  });
  const locations = useMemo(() => [...new Set((placements.data ?? []).map((p) => p.location).filter((l): l is string => !!l))].sort(), [placements.data]);
  const careersAtLocation = useMemo(() => new Set((placements.data ?? []).filter((p) => p.location === location).map((p) => p.career.trim().toLowerCase())), [placements.data, location]);
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
    let list = q ? ROLES.filter((r) => r.title.toLowerCase().includes(q) || r.field.toLowerCase().includes(q)) : ROLES;
    if (favouritesOnly) list = list.filter((r) => favourites.data?.has(r.slug));
    if (location) list = list.filter((r) => careersAtLocation.has(r.title.trim().toLowerCase()));
    return list;
  }, [search, favouritesOnly, favourites.data, location, careersAtLocation]);

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
          <h1 className="font-display text-2xl uppercase">Careers</h1>
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
        <p className="mx-auto mt-5 max-w-2xl text-sm">If the career that you are looking for is not listed, please email <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold">{CONTACT_EMAIL}</a> so we can help you.</p>
        <a href="#roles-list" className="mt-6 inline-block rounded-2xl bg-cta px-7 py-3 text-sm font-bold uppercase tracking-wide text-cta-foreground transition hover:brightness-110">Browse Careers</a>
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
            placeholder="Search for a career or category…"
            className="w-full rounded-full border border-primary-foreground/30 bg-primary-foreground/10 py-2.5 pl-10 pr-4 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-primary-foreground/60"
          />
        </div>
        {locations.length > 0 && (
          <div className="mx-auto mt-3 max-w-xl">
            <select
              value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-full border border-primary-foreground/30 bg-primary-foreground/10 py-2 px-4 text-sm text-primary-foreground outline-none focus:border-primary-foreground/60 [&>option]:text-foreground"
            >
              <option value="">All locations</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}
        <p className="mx-auto mt-3 max-w-xl text-center text-xs text-primary-foreground/70">
          Tap the notification icon on a career with no host to be notified when one becomes available.
        </p>
        {session?.user && (
          <div className="mt-3 flex justify-center">
            <button
              type="button" onClick={() => setFavouritesOnly((v) => !v)} aria-pressed={favouritesOnly}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${favouritesOnly ? "border-cta bg-cta text-cta-foreground" : "border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"}`}
            >
              <Heart className={`h-3.5 w-3.5 ${favouritesOnly ? "fill-current" : ""}`} /> My Favourites
            </button>
          </div>
        )}
      </div>

      <div className="bg-primary pb-10 pt-2">
      {grouped.length === 0 && (
        <p className="px-5 pb-10 text-center text-sm text-primary-foreground/70">No careers match “{search}”.</p>
      )}

      {grouped.map(([f, roles]) => {
        const fieldOpen = isFieldOpen(f);
        return (
          <div key={f} className="mx-auto mt-4 w-full max-w-6xl overflow-hidden rounded-lg border-[4px] border-ivory bg-ivory">
            <button
              onClick={() => toggleField(f)}
              aria-expanded={fieldOpen}
              className="flex min-h-14 w-full items-center justify-between gap-3 bg-ivory px-5 py-4 text-left text-foreground"
            >
              <h2 className="font-display text-2xl uppercase">{f}</h2>
              <ChevronDown className={`h-6 w-6 shrink-0 transition ${fieldOpen ? "rotate-180" : ""}`} />
            </button>
            {fieldOpen && (
              <div className="bg-ivory">
                <div className="divide-y divide-warm-divider">
                  {roles.map((r) => {
                    const count = mentorCounts.get(r.title.trim().toLowerCase()) ?? 0;
                    const open = openRoles.has(r.slug);
                    return (
                      <div key={r.slug} className="px-4 py-3 transition-colors hover:bg-pale-lime">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                          <button type="button" onClick={() => toggleRole(r.slug)} aria-expanded={open} className="flex flex-1 items-center gap-3 text-left">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-warm-divider bg-card text-charcoal">{open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
                            <span className="flex items-center gap-2 text-sm font-semibold text-charcoal">{r.title}{r.video && <PlayCircle className="h-4 w-4" aria-label="Has video" />}</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                            <button
                              type="button" onClick={() => toggleFavourite(r.slug)}
                              aria-pressed={favourites.data?.has(r.slug) ?? false}
                              aria-label={favourites.data?.has(r.slug) ? `Remove ${r.title} from favourites` : `Save ${r.title} to favourites`}
                              className="text-charcoal/60 transition hover:text-cta"
                            >
                              <Heart className={`h-4 w-4 ${favourites.data?.has(r.slug) ? "fill-cta text-cta" : ""}`} />
                            </button>
                            {count > 0 ? (
                              <span className="rounded-full bg-cta px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-cta-foreground">
                                {count} mentor{count === 1 ? "" : "s"} available
                              </span>
                            ) : (
                              <>
                                <span className="rounded-full bg-warm-divider px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-soft-grey">None available</span>
                                <NotifyBell career={r.title} />
                              </>
                            )}
                          </div>
                        </div>
                        {open && (
                          <div className="mt-2 pl-9">
                            {r.summary.split("\n").map((p, i) => <p key={i} className="mt-1 text-sm text-soft-grey">{p}</p>)}
                            {r.video && <div className="mt-3 max-w-xl"><YouTube id={r.video} title={r.title} /></div>}
                            {count > 0 && (
                              <Link to="/auth" className="mt-3 inline-block rounded-full bg-cta px-5 py-2 text-xs font-semibold uppercase tracking-wider text-cta-foreground">Book this Job Shadow</Link>
                            )}
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
      </div>
      <div className="h-10" />
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
    if (error && error.code !== "23505") { console.error("notify subscribe failed", error); setErr("Please enter a valid email address."); setState("ask"); return; }
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
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${state === "done" ? "bg-cta text-cta-foreground" : "bg-card text-soft-grey border border-warm-divider hover:bg-cta hover:text-cta-foreground"}`}>
        <BellRing className="h-4 w-4" />
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
