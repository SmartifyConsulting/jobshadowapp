import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ROLES } from "@/lib/data";
import { getCareerDescription } from "@/lib/career-descriptions";
import { careerKey } from "@/lib/career-skills";
import { CareerGuidance } from "@/components/CareerGuidance";
import { supabase } from "@/integrations/supabase/client";
import { YouTube } from "@/components/YouTube";
export function CareerStepBrowser({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (career: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const saved = useQuery({
    queryKey: ["public-career-content"],
    queryFn: async () => {
      const r = await supabase.rpc("get_public_career_guidance");
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const catalogue = useQuery({
    queryKey: ["public-careers-catalog"],
    queryFn: async () => {
      const r = await supabase.rpc("list_public_careers");
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const roles = useMemo(() => {
    const list = ROLES.map((role) => ({ ...role }));
    const known = new Set(list.map((role) => careerKey(role.title)));
    for (const career of catalogue.data ?? [])
      if (!known.has(careerKey(career.name))) {
        list.push({
          title: career.name,
          summary: career.description || "",
          field: "Other Careers",
          idealFor: "",
          video: null,
          slug: "other-" + careerKey(career.name),
        });
        known.add(careerKey(career.name));
      }
    return list.sort((a, b) => a.title.localeCompare(b.title));
  }, [catalogue.data]);
  const groups = new Map<string, typeof roles>();
  for (const role of roles.filter((role) =>
    (role.title + " " + role.field).toLowerCase().includes(search.toLowerCase()),
  )) {
    groups.set(role.field, [...(groups.get(role.field) ?? []), role]);
  }
  return (
    <div className="space-y-4">
      <label className="block text-sm">
        Career
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="mt-1 block w-full rounded border border-input bg-background p-2"
        >
          <option value="">Choose a career</option>
          {roles.map((role) => (
            <option key={role.slug} value={role.title}>
              {role.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="text-sm text-primary underline"
        aria-expanded={open}
        aria-controls="wizard-career-descriptions"
        onClick={() => setOpen((value) => !value)}
      >
        Browse all career descriptions
      </button>
      {open && (
        <div id="wizard-career-descriptions" className="space-y-3">
          <label className="block text-sm">
            Search careers
            <input
              className="mt-1 w-full border border-input bg-background px-3 py-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Career or sector"
            />
          </label>
          {saved.error && (
            <p role="status" className="text-xs text-muted-foreground">
              Saved updates could not be loaded; catalogue descriptions are shown below.
            </p>
          )}
          {[...groups].map(([field, items]) => (
            <section key={field} className="overflow-hidden rounded border border-border">
              <h3 className="border-b border-border bg-muted/30 px-3 py-2 font-display">{field}</h3>
              {items.map((role) => {
                const content = saved.data?.find(
                  (record) => careerKey(record.name) === careerKey(role.title),
                );
                return (
                  <div key={role.slug} className="border-b border-border/50 p-3 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        id={"choose-" + role.slug}
                        name="wizard-career"
                        aria-label={`Select ${role.title}`}
                        checked={selected === role.title}
                        onChange={() => onSelect(role.title)}
                        className="mt-1"
                      />
                      <details className="min-w-0 flex-1">
                        <summary className="cursor-pointer text-sm font-semibold">
                          {role.title}
                        </summary>
                        <CareerGuidance
                          name={role.title}
                          description={
                            getCareerDescription(role.title, content?.description) || role.summary
                          }
                          saved={content ?? {}}
                        />
                        {role.video && <YouTube id={role.video} title={role.title} />}
                        <button
                          type="button"
                          className="my-2 rounded bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                          onClick={() => onSelect(role.title)}
                        >
                          {selected === role.title ? "Selected" : "Choose this career"}
                        </button>
                      </details>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
          {!groups.size && <p className="text-sm">No careers match your search.</p>}
        </div>
      )}
    </div>
  );
}
