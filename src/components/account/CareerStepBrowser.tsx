import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ROLES } from "@/lib/data";
import { getCareerDescription } from "@/lib/career-descriptions";
import { careerKey } from "@/lib/career-skills";
import { guessCareerField, guessCareerDivision } from "@/lib/career-field";
import { CareerGuidance } from "@/components/CareerGuidance";
import { supabase } from "@/integrations/supabase/client";
import { YouTube } from "@/components/YouTube";
import { CareerCatalogue } from "@/components/CareerCatalogue";
export function CareerStepBrowser({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (career: string) => void;
}) {
  const [open, setOpen] = useState(false);
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
          field: career.field?.trim() || guessCareerField(career.name, career.description),
          idealFor: "",
          video: null,
          slug: "other-" + careerKey(career.name),
        });
        known.add(careerKey(career.name));
      }
    return list
      .map((role) => ({
        ...role,
        division: guessCareerDivision(role.title, role.field, role.summary),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [catalogue.data]);
  const selectedRole = roles.find((role) => role.title === selected);
  const contentFor = (title: string) => ({
    ...catalogue.data?.find((row) => careerKey(row.name) === careerKey(title)),
    ...saved.data?.find((row) => careerKey(row.name) === careerKey(title)),
  });
  // Grouped by Sector, then Division within it - e.g. "Business & Finance — C-Suite".
  const optionGroups = [
    ...new Map(
      roles.map((role) => [role.field + " — " + role.division, [] as typeof roles]),
    ).keys(),
  ]
    .sort()
    .map(
      (label) =>
        [
          label,
          roles
            .filter((role) => role.field + " — " + role.division === label)
            .sort((a, b) => a.title.localeCompare(b.title)),
        ] as const,
    );
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
          {optionGroups.map(([label, items]) => (
            <optgroup key={label} label={label}>
              {items.map((role) => (
                <option key={role.slug} value={role.title}>
                  {role.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {selectedRole && (
        <section aria-label="Selected career details" className="space-y-2">
          <h3 className="text-sm font-semibold">{selectedRole.title}</h3>
          <CareerGuidance
            framed
            compact
            name={selectedRole.title}
            description={
              getCareerDescription(
                selectedRole.title,
                contentFor(selectedRole.title).description,
              ) || selectedRole.summary
            }
            saved={contentFor(selectedRole.title)}
          />
          {selectedRole.video && <YouTube id={selectedRole.video} title={selectedRole.title} />}
        </section>
      )}
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
        <section
          id="wizard-career-descriptions"
          aria-label="Browse career catalogue"
          className="overflow-hidden rounded border border-border"
        >
          <CareerCatalogue embedded selected={selected} onSelect={onSelect} />
        </section>
      )}
    </div>
  );
}
