import { Briefcase, UserRound } from "lucide-react";
import { getCareerGuidance } from "@/lib/career-guidance";
import { CareerSkills } from "./CareerSkills";
import { RichText } from "./RichText";

export function CareerGuidance({ name, description, saved = {} }: { name: string; description: string; saved?: Parameters<typeof getCareerGuidance>[2] }) {
  const guidance = getCareerGuidance(name, description, saved);
  return <div className="space-y-5 py-3 text-foreground">
    <section><h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Role Overview</h3><RichText text={guidance.overview} className="block text-sm leading-relaxed" /></section>
    {guidance.idealFor && <section className="flex gap-3 rounded-lg border border-accent/50 bg-accent/10 p-4"><UserRound className="mt-0.5 h-4 w-4 shrink-0" /><div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide">Ideal for:</h3><p className="text-sm leading-relaxed">{guidance.idealFor}</p></div></section>}
    {guidance.specialisations.length > 0 && <section><h3 className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Briefcase className="h-3.5 w-3.5" />Specialisations &amp; Roles ({guidance.specialisations.length})</h3><ul className="flex flex-wrap gap-2">{guidance.specialisations.map((role) => <li key={role} className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">{role}</li>)}</ul></section>}
    <CareerSkills {...guidance.skills} />
    {guidance.subjects.length > 0 && <section className="rounded-lg border border-border p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide">Suggested Subjects</h3><ul className="flex flex-wrap gap-2">{guidance.subjects.map((subject) => <li key={subject} className="rounded-full border border-border bg-ivory px-2.5 py-1 text-xs">{subject}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">Check the entry requirements for your chosen course and institution.</p></section>}
  </div>;
}
