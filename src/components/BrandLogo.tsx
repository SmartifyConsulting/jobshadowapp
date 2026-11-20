import logoRedShadow from "@/assets/jobshadow-logo-red-shadow.png.asset.json";
import { cn } from "@/lib/utils";
export const HEADER_LOGO_URL = logoRedShadow.url;

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

/** Red-shadow wordmark used top-left on every page except the home page. */
export function HeaderLogo({ className }: { className?: string }) {
  return <img src={HEADER_LOGO_URL} alt="Job Shadow" width={1320} height={680} className={cn("shrink-0 object-contain", className)} />;
}
