import type { ReactNode } from "react";
import type { getCareerGuidance } from "@/lib/career-guidance";
import { RichText } from "./RichText";

function Frame({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <fieldset
      className={
        "min-w-0 rounded border p-3 " +
        (compact
          ? title === "Career Overview"
            ? "border-teal/50 bg-teal/10 xl:row-span-2"
            : title === "Skills Required"
              ? "border-cta/50 bg-cta/10"
              : "border-accent/60 bg-accent/15"
          : "border-charcoal/25")
      }
      aria-label={title}
    >
      <legend className="px-1 text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Items({ title, values }: { title: string; values: string[] }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-xs font-bold">{title}</h3>
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
  compact = false,
}: {
  guidance: ReturnType<typeof getCareerGuidance>;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "grid items-start gap-3 text-foreground [&_h3]:mb-1 [&_p]:leading-5 [&_ul]:gap-1 [&_li]:px-2 [&_li]:py-0.5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
          : "space-y-3 py-3 text-foreground"
      }
    >
      <Frame compact={compact} title="Career Overview">
        <div className="space-y-3">
          <section>
            <h3 className="mb-2 text-xs font-bold">Role Description</h3>
            <RichText text={guidance.overview} className="block text-sm leading-relaxed" />
          </section>
          <Items
            title={`Specialisations & Roles (${guidance.specialisations.length})`}
            values={guidance.specialisations}
          />
          <section>
            <h3 className="mb-2 text-xs font-bold">Ideal For</h3>
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
            <h3 className="mb-2 text-xs font-bold">Future of This Career</h3>
            <p className="text-sm leading-relaxed">{guidance.futureOutlook || "Not added yet."}</p>
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold">
              AI Exposure:
              <span>
                {guidance.aiExposureLevel
                  ? guidance.aiExposureLevel[0]!.toUpperCase() + guidance.aiExposureLevel.slice(1)
                  : "Not added yet."}
              </span>
            </h3>
            {guidance.aiExposureNote && (
              <p className="mt-1 text-sm leading-relaxed">{guidance.aiExposureNote}</p>
            )}
          </section>
        </div>
      </Frame>
    </div>
  );
}
