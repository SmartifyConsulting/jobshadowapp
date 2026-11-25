import { Check, type LucideIcon } from "lucide-react";
export type JourneyStep = {
  id: string;
  title: string;
  icon: LucideIcon;
  complete?: boolean;
  locked?: boolean;
};
export function JourneyStepper({
  title,
  steps,
  active,
  onChange,
}: {
  title: string;
  steps: JourneyStep[];
  active: string;
  onChange: (step: string) => void;
}) {
  const position = steps.findIndex((step) => step.id === active);
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl">{title}</h1>
        <p className="text-xs text-muted-foreground">
          Step {position + 1} of {steps.length}
        </p>
      </div>
      <nav aria-label={title + " steps"} className="flex gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            disabled={step.locked}
            aria-current={active === step.id ? "step" : undefined}
            onClick={() => onChange(step.id)}
            className={
              "flex min-w-[8.5rem] min-h-24 flex-1 flex-col items-center gap-2 rounded-lg border px-3 py-3 text-center disabled:opacity-40 " +
              (active === step.id
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-ivory text-foreground")
            }
          >
            <span className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {step.complete ? (
                  <Check className="h-3.5 w-3.5" aria-label="Completed" />
                ) : (
                  index + 1
                )}
              </span>
              <step.icon className="h-5 w-5" />
            </span>
            <span className="font-display text-base leading-tight">{step.title}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
