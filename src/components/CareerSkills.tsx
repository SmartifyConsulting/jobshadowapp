import type { CareerSkills as Skills } from "@/lib/career-skills";

export function CareerSkills({ school, workplace }: Skills) {
  if (!school.length && !workplace.length) return null;
  return <section className="overflow-hidden rounded-lg border border-border" aria-label="Skills Required">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"><h3 className="text-sm font-bold">Skills Required</h3><p className="text-xs text-muted-foreground">Useful foundations and skills to develop; not admission requirements.</p></header>
    <div className="grid gap-4 bg-muted/10 p-4 sm:grid-cols-2">
    {[["School foundations", school], ["Workplace skills", workplace]].map(([label, values]) => (values as string[]).length > 0 && <div key={label as string} className="rounded-lg border border-border bg-background p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide">{label}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label={label as string}>{(values as string[]).map((skill) => <li key={skill} className="rounded-full border border-charcoal/15 bg-ivory px-2.5 py-1 text-xs text-charcoal">{skill}</li>)}</ul>
    </div>)}</div>
  </section>;
}
