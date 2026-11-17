import { cn } from "@/lib/utils";

/** Supplied transparent wordmark and its red geometric shadow. */
export function BrandLogo({ className, loading }: { className?: string; loading?: "lazy" }) {
  return (
    <img
      src="/assets/jobshadow-logo-shadow.png"
      alt="Job Shadow"
      width={631}
      height={342}
      loading={loading}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

/** Shared header artwork on public pages and portals, including Home. */
export function HeaderLogo({ className = "" }: { className?: string }) {
  return <BrandLogo className={className} />;
}
