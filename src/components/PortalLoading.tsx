import { SiteHeader, SiteFooter } from "./SiteLayout";

/** Keep navigation and initial portal content from appearing in separate stages. */
export function PortalLoading({
  label = "Loading your portal…",
  fullWidth = false,
  portal = true,
}: {
  label?: string;
  fullWidth?: boolean;
  portal?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <SiteHeader fullWidth={fullWidth} portal={portal} />
      <main aria-busy="true" className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-5 py-8">
        <p role="status" className="text-sm text-muted-foreground">
          {label}
        </p>
        <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
          <div className="h-8 w-56 rounded bg-charcoal/10" />
          <div className="h-10 rounded bg-charcoal/10" />
          <div className="h-64 rounded border border-border bg-charcoal/5" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
