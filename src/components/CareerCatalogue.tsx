import { hasPlacementTimes } from "@/lib/mentor-availability";
import { CareerDetailDialog } from "@/components/CareerDetailDialog";
import { getCareerDescription } from "@/lib/career-descriptions";

import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayCircle, ChevronDown, Search, Heart } from "lucide-react";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT_EMAIL, ROLES } from "@/lib/data";
import { guessCareerField, guessCareerDivision } from "@/lib/career-field";
import { notify } from "@/lib/dialogs";

const CATEGORY_BANDS = [
  "bg-cta text-cta-foreground",
  "bg-accent text-accent-foreground",
  "bg-teal text-teal-foreground",
  "bg-primary text-primary-foreground",
] as const;

export function CareerCatalogue({
  embedded = false,
  selected = "",
  onSelect,
}: {
  embedded?: boolean;
  selected?: string;
  onSelect?: ((career: string) => void) | undefined;
}) {
  const Layout = embedded ? Fragment : SiteLayout;
  const qc = useQueryClient();
  const { data: session } = useSiteSession();
  const [openFields, setOpenFields] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [viewingSlug, setViewingSlug] = useState<string | null>(null);
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const favourites = useQuery({
    queryKey: ["career-favourites", session?.user?.id],
    enabled: !!session?.user,
    queryFn: async () => {
      if (!session?.user) return new Set<string>();
      const result = await supabase
        .from("career_favourites")
        .select("career_slug")
        .eq("user_id", session.user.id);
      if (result.error) throw result.error;
      return new Set((result.data ?? []).map((row) => row.career_slug));
    },
  });

  async function toggleFavourite(slug: string) {
    if (!session?.user) return notify("Please sign in to save favourite careers.", "error");
    const isFav = favourites.data?.has(slug);
    const { error } = isFav
      ? await supabase
          .from("career_favourites")
          .delete()
          .eq("user_id", session.user.id)
          .eq("career_slug", slug)
      : await supabase
          .from("career_favourites")
          .insert({ user_id: session.user.id, career_slug: slug });
    if (error) return notify(error.message, "error");
    qc.invalidateQueries({ queryKey: ["career-favourites", session.user.id] });
  }

  const availability = useQuery({
    queryKey: ["public-career-availability"],
    queryFn: async () => {
      const r = await supabase.rpc("get_public_career_availability");
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const savedContent = useQuery({
    queryKey: ["public-career-content"],
    queryFn: async () => {
      const result = await supabase.rpc("get_public_career_guidance");
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const careerKey = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const descriptionFor = (title: string, fallback: string) =>
    getCareerDescription(
      title,
      savedContent.data?.find((row) => careerKey(row.name) === careerKey(title))?.description,
    ) || fallback;

  // Careers an admin adds directly (via the admin Careers screen) that aren't part of the curated
  // role library yet - surfaced here so every admin-captured career is actually visible publicly.
  const adminCareers = useQuery({
    queryKey: ["public-careers-catalog"],
    queryFn: async () => {
      const result = await supabase.rpc("list_public_careers");
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const allRoles = useMemo(() => {
    const known = new Set(ROLES.map((r) => careerKey(r.title)));
    const extra = (adminCareers.data ?? [])
      .filter((c) => !known.has(careerKey(c.name)))
      .map((c) => ({
        slug: "other-careers--" + careerKey(c.name),
        title: c.name,
        field: c.field?.trim() || guessCareerField(c.name, c.description),
        summary:
          c.description ||
          "Ask us for more detail on this career and the job shadow experience we can arrange.",
        idealFor: "",
        video: null,
      }));
    return [...ROLES, ...extra].map((r) => ({
      ...r,
      division: guessCareerDivision(r.title, r.field, r.summary),
    }));
  }, [adminCareers.data]);
  const [location, setLocation] = useState("");
  const placements = useQuery({
    queryKey: ["placements"],
    queryFn: async () => {
      const result = await supabase.rpc("list_placements");
      if (result.error) throw result.error;
      return (result.data ?? []).filter(hasPlacementTimes);
    },
  });
  const locations = useMemo(
    () =>
      [
        ...new Set((placements.data ?? []).map((p) => p.location).filter((l): l is string => !!l)),
      ].sort(),
    [placements.data],
  );
  const careersAtLocation = useMemo(
    () =>
      new Set(
        (placements.data ?? [])
          .filter((p) => p.location === location)
          .map((p) => p.career.trim().toLowerCase()),
      ),
    [placements.data, location],
  );
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
    let list = q
      ? allRoles.filter(
          (r) => r.title.toLowerCase().includes(q) || r.field.toLowerCase().includes(q),
        )
      : allRoles;
    if (favouritesOnly) list = list.filter((r) => favourites.data?.has(r.slug));
    if (location) list = list.filter((r) => careersAtLocation.has(r.title.trim().toLowerCase()));
    return list;
  }, [search, favouritesOnly, favourites.data, location, careersAtLocation, allRoles]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof allRoles>();
    filteredRoles.forEach((r) => m.set(r.field, [...(m.get(r.field) ?? []), r]));
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map(([f, roles]) => {
        const byDivision = new Map<string, typeof allRoles>();
        roles.forEach((r) =>
          byDivision.set(r.division, [...(byDivision.get(r.division) ?? []), r]),
        );
        const divisions = [...byDivision.entries()]
          .map(
            ([d, items]) => [d, [...items].sort((a, b) => a.title.localeCompare(b.title))] as const,
          )
          .sort((a, b) => a[0].localeCompare(b[0]));
        return [f, divisions] as const;
      });
  }, [filteredRoles]);

  const isFieldOpen = (f: string) => (search.trim() ? true : openFields.has(f));
  const toggleField = (f: string) =>
    setOpenFields((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });

  const [openDivisions, setOpenDivisions] = useState<Set<string>>(new Set());
  const isDivisionOpen = (key: string) => (search.trim() ? true : openDivisions.has(key));
  const toggleDivision = (key: string) =>
    setOpenDivisions((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <Layout>
      {!embedded && (
        <>
          <div className="bg-primary text-primary-foreground">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
              <ChevronDown className="h-6 w-6" />
              <h1 className="screen-heading font-display text-2xl uppercase">Careers</h1>
            </div>
          </div>

          <section className="bg-teal px-5 pb-4 pt-12 text-center text-teal-foreground">
            <h2 className="font-display text-2xl text-white md:text-3xl">
              Already have an idea of your dream career?
            </h2>
            <p className="font-display text-2xl text-white md:text-3xl">
              See some of the job shadows you can book below!
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-sm">
              If the career that you are looking for is not listed, please email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold">
                {CONTACT_EMAIL}
              </a>{" "}
              so we can help you.
            </p>
            <a
              href="#roles-list"
              className="mt-6 inline-block rounded-2xl bg-cta px-7 py-3 text-sm font-bold uppercase tracking-wide text-cta-foreground transition hover:brightness-110"
            >
              Browse Careers
            </a>
          </section>
        </>
      )}
      <div id="roles-list" className="bg-teal px-5 pb-5 pt-2 text-teal-foreground">
        <div className="relative mx-auto max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-foreground/60" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search careers"
            placeholder="Search for a career or category…"
            className="w-full rounded-full border border-teal-foreground/30 bg-background/60 py-2.5 pl-10 pr-4 text-sm text-teal-foreground placeholder:text-teal-foreground/60 outline-none focus:border-teal-foreground/60"
          />
        </div>
        {locations.length > 0 && (
          <div className="mx-auto mt-3 max-w-xl">
            <select
              aria-label="Filter careers by location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-full border border-teal-foreground/30 bg-background/60 py-2 px-4 text-sm text-teal-foreground outline-none focus:border-teal-foreground/60 [&>option]:text-foreground"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="mx-auto mt-3 max-w-xl text-center text-xs text-teal-foreground/70">
          Tap the notification icon on a career with no host to be notified when one becomes
          available.
        </p>
      </div>

      <div className="bg-ivory py-1">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          {!placements.isLoading && mentorCounts.size === 0 && noAvailabilityMessage.data && (
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              {noAvailabilityMessage.data} Counts show available mentors out of each career’s
              target.
            </p>
          )}
          {session?.user && (
            <div className="ml-auto shrink-0">
              <button
                type="button"
                onClick={() => setFavouritesOnly((v) => !v)}
                aria-pressed={favouritesOnly}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${favouritesOnly ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"}`}
              >
                <Heart className={`h-3.5 w-3.5 ${favouritesOnly ? "fill-current" : ""}`} /> My
                Favourites
              </button>
            </div>
          )}
        </div>
        {grouped.length === 0 && (
          <p className="px-5 py-4 text-center text-sm text-muted-foreground">
            No careers match “{search}”.
          </p>
        )}

        {grouped.map(([f, divisions], index) => {
          const fieldOpen = isFieldOpen(f);
          return (
            <div
              key={f}
              className="mx-auto w-full max-w-6xl overflow-hidden border-x-[4px] border-b-[4px] border-ivory bg-ivory"
            >
              <button
                data-list-font="black"
                onClick={() => toggleField(f)}
                aria-expanded={fieldOpen}
                className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-1.5 text-left ${CATEGORY_BANDS[index % CATEGORY_BANDS.length]}`}
              >
                <h2 className="font-display text-lg normal-case">{f}</h2>
                <ChevronDown
                  className={`h-6 w-6 shrink-0 transition ${fieldOpen ? "rotate-180" : ""}`}
                />
              </button>
              {fieldOpen &&
                divisions.map(([division, roles]) => {
                  const divisionKey = f + " — " + division;
                  const divisionOpen = isDivisionOpen(divisionKey);
                  return (
                    <div key={division} className="bg-ivory">
                      <button
                        data-list-font="black"
                        onClick={() => toggleDivision(divisionKey)}
                        aria-expanded={divisionOpen}
                        className="flex min-h-9 w-full items-center justify-between gap-3 border-y border-warm-divider bg-muted/30 px-4 py-1.5 text-left"
                      >
                        <h3 className="text-xs font-bold normal-case tracking-wide text-muted-foreground">
                          {division} ({roles.length})
                        </h3>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${divisionOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {divisionOpen && (
                        <div className="divide-y divide-warm-divider">
                          {roles.map((r) => {
                            const description = descriptionFor(r.title, r.summary);
                            const count = mentorCounts.get(r.title.trim().toLowerCase()) ?? 0;
                            const reported = availability.data?.find(
                              (row) => careerKey(row.name) === careerKey(r.title),
                            );
                            return (
                              <div
                                key={r.slug}
                                className="px-4 py-1.5 transition-colors odd:bg-ivory even:bg-pale-lime/40 hover:bg-pale-lime"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <button
                                    type="button"
                                    data-list-font="black"
                                    onClick={() => setViewingSlug(r.slug)}
                                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left outline-none transition hover:bg-pale-lime focus-visible:ring-2 focus-visible:ring-primary"
                                  >
                                    <span className="min-w-0">
                                      <span className="flex items-center gap-2 text-sm font-semibold leading-tight text-charcoal">
                                        {r.title}
                                        {r.video && (
                                          <PlayCircle className="h-4 w-4" aria-label="Has video" />
                                        )}
                                      </span>
                                    </span>
                                  </button>
                                  <div className="flex max-w-full flex-wrap items-center gap-2 self-start sm:self-center">
                                    {onSelect && (
                                      <button
                                        type="button"
                                        aria-label={`Select ${r.title}`}
                                        aria-pressed={selected === r.title}
                                        onClick={() => onSelect(r.title)}
                                        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                                      >
                                        {selected === r.title ? "Selected" : "Choose"}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setViewingSlug(r.slug)}
                                      className="rounded-full border border-warm-divider bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-charcoal transition hover:border-primary hover:text-primary"
                                    >
                                      View
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleFavourite(r.slug)}
                                      aria-pressed={favourites.data?.has(r.slug) ?? false}
                                      aria-label={
                                        favourites.data?.has(r.slug)
                                          ? `Remove ${r.title} from favourites`
                                          : `Save ${r.title} to favourites`
                                      }
                                      className={`rounded-full p-1 text-primary transition hover:bg-primary/10 ${favourites.data?.has(r.slug) ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                                    >
                                      <Heart
                                        className={`h-4 w-4 text-primary ${favourites.data?.has(r.slug) ? "fill-primary" : "fill-none"}`}
                                      />
                                    </button>
                                    <span
                                      className={
                                        "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide " +
                                        (count > 0
                                          ? "bg-cta text-cta-foreground"
                                          : "bg-muted text-foreground")
                                      }
                                    >
                                      {availability.isError
                                        ? "Availability unavailable"
                                        : availability.isPending
                                          ? "Checking availability…"
                                          : `${reported?.mentor_available_count ?? count} of ${reported?.mentor_target_count ?? Math.max(count, 1)} mentors available`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
      {(() => {
        const viewing = allRoles.find((r) => r.slug === viewingSlug);
        if (!viewing) return null;
        const description = descriptionFor(viewing.title, viewing.summary);
        const count = mentorCounts.get(viewing.title.trim().toLowerCase()) ?? 0;
        const reported = availability.data?.find(
          (row) => careerKey(row.name) === careerKey(viewing.title),
        );
        const availabilityLabel = availability.isError
          ? "Availability unavailable"
          : availability.isPending
            ? "Checking availability…"
            : `${reported?.mentor_available_count ?? count} of ${reported?.mentor_target_count ?? Math.max(count, 1)} mentors available`;
        return (
          <CareerDetailDialog
            open={!!viewingSlug}
            onOpenChange={(open) => !open && setViewingSlug(null)}
            title={viewing.title}
            category={viewing.division}
            description={description}
            saved={{
              ...(adminCareers.data?.find(
                (row) => careerKey(row.name) === careerKey(viewing.title),
              ) ?? {}),
              ...(savedContent.data?.find(
                (row) => careerKey(row.name) === careerKey(viewing.title),
              ) ?? {}),
            }}
            video={viewing.video}
            availabilityLabel={availabilityLabel}
            isFavourite={favourites.data?.has(viewing.slug) ?? false}
            onToggleFavourite={() => toggleFavourite(viewing.slug)}
          />
        );
      })()}
    </Layout>
  );
}
