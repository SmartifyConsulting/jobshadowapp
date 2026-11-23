import type { ReactNode } from "react";
import type { getCareerGuidance } from "@/lib/career-guidance";
import { RichText } from "./RichText";

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded border border-charcoal/25 p-3" aria-label={title}>
      <legend className="px-1 text-sm font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

function Items({ title, values }: { title: string; values: string[] }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-xs font-medium">{title}</h3>
      {values.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li
              key={value}
              className="rounded-full border border-border bg-ivory px-2.5 py-1 text-xs"
            >
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Not added yet.</p>
      )}
    </section>
  );
}

/** The expanded Admin list uses the same three groups as the career editor. */
export function AdminCareerGuidance({
  guidance,
}: {
  guidance: ReturnType<typeof getCareerGuidance>;
}) {
  return (
    <div className="space-y-3 py-3 text-foreground">
      <Frame title="Career Overview">
        <div className="space-y-3">
          <section>
            <h3 className="mb-2 text-xs font-medium">Role Description</h3>
            <RichText text={guidance.overview} className="block text-sm leading-relaxed" />
          </section>
          <Items
            title={`Specialisations & Roles (${guidance.specialisations.length})`}
            values={guidance.specialisations}
          />
          <section>
            <h3 className="mb-2 text-xs font-medium">Ideal For</h3>
            <p className="text-sm leading-relaxed">{guidance.idealFor || "Not added yet."}</p>
          </section>
        </div>
      </Frame>
      <Frame title="Skills Required">
        <div className="grid gap-4 sm:grid-cols-3">
          <Items title="School Foundations" values={guidance.skills.school} />
          <Items title="Workplace Skills" values={guidance.skills.workplace} />
          <Items title="Interpersonal Skills" values={guidance.interpersonalSkills} />
        </div>
      </Frame>
      <Frame title="Career Preparation">
        <div className="grid gap-4 sm:grid-cols-2">
          <Items title="Suggested Subjects" values={guidance.subjects} />
          <Items title="Recommended Training" values={guidance.recommendedCourses} />
          <section>
            <h3 className="mb-2 text-xs font-medium">Future of This Career</h3>
            <p className="text-sm leading-relaxed">{guidance.futureOutlook || "Not added yet."}</p>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-medium">AI Exposure</h3>
            <p className="text-sm leading-relaxed">
              {guidance.aiExposureLevel
                ? guidance.aiExposureLevel[0]!.toUpperCase() + guidance.aiExposureLevel.slice(1)
                : "Not added yet."}
            </p>
            {guidance.aiExposureNote && (
              <p className="mt-1 text-sm leading-relaxed">{guidance.aiExposureNote}</p>
            )}
          </section>
        </div>
      </Frame>
    </div>
  );
}
