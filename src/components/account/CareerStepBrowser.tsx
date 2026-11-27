import { useMemo, useRef, useState } from "react";
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
  const browseButton = useRef<HTMLButtonElement>(null);
  function closeCatalogue() {
    setOpen(false);
    requestAnimationFrame(() => {
      browseButton.current?.focus({ preventScroll: true });
      browseButton.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
  const [path, setPath] = useState<{ forCareer: string; sector: string; division: string } | null>(
    null,
  );
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
  const selectedRole =
    roles.find(
      (role) =>
        role.title === selected &&
        (!path ||
          path.forCareer !== selected ||
          (role.field === path.sector && role.division === path.division)),
    ) ?? roles.find((role) => role.title === selected);
  const sector = path?.forCareer === selected ? path.sector : (selectedRole?.field ?? "");
  const division = path?.forCareer === selected ? path.division : (selectedRole?.division ?? "");
  const sectors = [...new Set(roles.map((role) => role.field))].sort((a, b) => a.localeCompare(b));
  const divisions = [
    ...new Set(roles.filter((role) => role.field === sector).map((role) => role.division)),
  ].sort((a, b) => a.localeCompare(b));
  const careerOptions = [
    ...new Map(
      roles
        .filter((role) => role.field === sector && role.division === division)
        .map((role) => [careerKey(role.title), role]),
    ).values(),
  ];
  const selectClass =
    "mt-1 block w-full rounded border border-input bg-background p-2 disabled:opacity-50";
  const contentFor = (title: string) => ({
    ...catalogue.data?.find((row) => careerKey(row.name) === careerKey(title)),
    ...saved.data?.find((row) => careerKey(row.name) === careerKey(title)),
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          Sector
          <select
            value={sector}
            className={selectClass}
            onChange={(e) => {
              setPath({ forCareer: "", sector: e.target.value, division: "" });
              if (selected) onSelect("");
            }}
          >
            <option value="">Choose a sector</option>
            {sectors.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Career Category
          <select
            value={division}
            disabled={!sector}
            className={selectClass}
            onChange={(e) => {
              setPath({ forCareer: "", sector, division: e.target.value });
              if (selected) onSelect("");
            }}
          >
            <option value="">Choose a category</option>
            {divisions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-bold">Career</span>
          <select
            value={selected}
            disabled={!sector || !division}
            className={selectClass}
            onChange={(e) => {
              setPath({ forCareer: e.target.value, sector, division });
              onSelect(e.target.value);
            }}
          >
            <option value="">Choose a career</option>
            {careerOptions.map((role) => (
              <option key={role.slug} value={role.title}>
                {role.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selectedRole && (
        <section aria-label="Selected career details" className="space-y-2">
          <h3 className="text-sm font-bold">{selectedRole.title}</h3>
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
        ref={browseButton}
        onClick={() => (open ? closeCatalogue() : setOpen(true))}
      >
        {open ? "Collapse Careers" : "Browse All Careers"}
      </button>
      {open && (
        <section
          id="wizard-career-descriptions"
          aria-label="Browse career catalogue"
          className="overflow-hidden rounded border border-border"
        >
          <CareerCatalogue embedded selected={selected} onSelect={onSelect} />
          <div className="flex justify-end border-t border-border p-3">
            <button
              type="button"
              onClick={closeCatalogue}
              className="rounded border border-input bg-background px-4 py-2 text-sm font-semibold"
            >
              Collapse Careers
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
