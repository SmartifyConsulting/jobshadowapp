import { cn } from "@/lib/utils";

/** Original full-colour square artwork extracted from the supplied CI guide. */
export function BrandLogo({ className, loading }: { className?: string; loading?: "lazy" }) {
  return (
    <img
      src="/assets/jobshadow-logo-square.svg"
      alt="Job Shadow"
      width={184}
      height={184}
      loading={loading}
      className={cn("aspect-square shrink-0 object-contain", className)}
    />
  );
}
