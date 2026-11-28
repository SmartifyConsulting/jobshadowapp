import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
export type JourneyStep = {
  id: string;
  title: string;
  icon: LucideIcon;
  complete?: boolean;
  locked?: boolean;
  unframed?: boolean;
};
export function JourneyStepper({
  title,
  steps,
  active,
  onChange,
  titleClassName,
  children,
}: {
  title: string;
  steps: JourneyStep[];
  active: string;
  onChange: (step: string) => void;
  titleClassName?: string;
  children?: ReactNode;
}) {
  const panelId = useId();
  const [closedStep, setClosedStep] = useState<string | null>(null);
  const previous = useRef<{ active: string; complete: Record<string, boolean> } | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = { active, complete: Object.fromEntries(steps.map(step => [step.id, !!step.complete])) };
    const index = steps.findIndex(step => step.id === active);
    const current = steps[index];
    if (children === undefined || before?.active !== active || !current?.complete || before.complete[active] !== false) return;
    const following = steps.slice(index + 1);
    const next = following.find(step => !step.locked && !step.complete) ?? following.find(step => !step.locked);
    if (next) { setClosedStep(null); onChange(next.id); }
    else setClosedStep(active);
  }, [active, steps, onChange, children]);
  if (children !== undefined)
    return (
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-teal px-4 py-3 text-white">
          <h1
            className={
              titleClassName ? titleClassName + " text-white" : "font-display text-2xl text-white"
            }
          >
            {title}
          </h1>
        </div>
        <div className="workflow-steps workflow-accordion" aria-label={title + " steps"}>
          {steps.map((step, index) => {
            const selected = active === step.id;
            const expanded = selected && closedStep !== step.id;
            return (
              <div key={step.id}>
                <h2>
                  <button
                    id={panelId + "-" + step.id + "-heading"}
                    type="button"
                    disabled={step.locked}
                    aria-expanded={expanded}
                    aria-controls={panelId + "-" + step.id}
                    aria-current={selected ? "step" : undefined}
                    onClick={() => {
                      setClosedStep(selected && expanded ? step.id : null);
                      if (!selected) onChange(step.id);
                    }}
                    className="workflow-step flex min-h-12 w-full items-center gap-4 px-4 py-2 text-left sm:gap-8 sm:px-6"
                  >
                    <span className="workflow-step-indicator grid h-8 w-8 shrink-0 place-items-center rounded-full">
                      {step.complete ? (
                        <Check className="h-5 w-5" aria-label="Completed" />
                      ) : (
                        <ChevronDown
                          className={
                            "h-5 w-5 transition-transform " + (expanded ? "rotate-180" : "")
                          }
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className="font-display text-lg leading-tight sm:text-2xl">
                      Step {index + 1}: {step.title}
                    </span>
                  </button>
                </h2>
                {
                  <div
                    id={panelId + "-" + step.id}
                    role="region"
                    aria-labelledby={panelId + "-" + step.id + "-heading"}
                    hidden={!expanded}
                    className={step.unframed ? "mx-4 my-3 min-w-0 text-foreground sm:mx-6" : "workflow-step-panel mx-4 my-3 min-w-0 rounded-xl border border-border p-4 text-foreground sm:mx-6 sm:p-5"}
                  >
                    {selected ? children : null}
                  </div>
                }
              </div>
            );
          })}
        </div>
      </div>
    );
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className={titleClassName ?? "font-display text-2xl"}>{title}</h1>
      </div>
      <nav aria-label={title + " steps"} className="workflow-steps flex gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            disabled={step.locked}
            aria-current={active === step.id ? "step" : undefined}
            onClick={() => onChange(step.id)}
            className={
              "workflow-step flex min-w-[8.5rem] min-h-24 flex-1 flex-col items-center gap-2 rounded-lg border px-3 py-3 text-center disabled:opacity-40 " +
              (active === step.id
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-ivory text-foreground")
            }
          >
            <span className="flex items-center gap-2">
              <span className="workflow-step-indicator grid h-5 w-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
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
