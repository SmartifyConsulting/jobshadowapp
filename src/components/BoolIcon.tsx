import { CheckCircle2, XCircle } from "lucide-react";

/** Renders a boolean as a scannable icon (green check / muted red x) instead of "Yes"/"No" text,
 * for dense admin tables and report views. */
export function BoolIcon({ value, trueLabel = "Yes", falseLabel = "No" }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return value ? (
    <CheckCircle2 className="inline-block h-4 w-4 text-green-600" aria-label={trueLabel} />
  ) : (
    <XCircle className="inline-block h-4 w-4 text-muted-foreground/50" aria-label={falseLabel} />
  );
}
