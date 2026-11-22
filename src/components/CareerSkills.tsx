import type { CareerSkills as Skills } from "@/lib/career-skills";

export function CareerSkills({ school, workplace }: Skills) {
  if (!school.length && !workplace.length) return null;
  return <section className="mt-4 space-y-2" aria-label="Skills Required">
    <h3 className="text-sm font-bold">Skills Required</h3>
    <p className="text-xs text-muted-foreground">Useful foundations and skills to develop through study and work; these are not admission requirements.</p>
    {[["School foundations", school], ["Workplace skills", workplace]].map(([label, values]) => (values as string[]).length > 0 && <div key={label as string}>
      <p className="mb-1 text-xs font-semibold">{label}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label={label as string}>{(values as string[]).map((skill) => <li key={skill} className="rounded-full border border-charcoal/15 bg-ivory px-2.5 py-1 text-xs text-charcoal">{skill}</li>)}</ul>
    </div>)}
  </section>;
}
