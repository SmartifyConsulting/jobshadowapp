import { AccountProfile, useOwnIdentity } from "@/components/account/AccountProfile";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/SiteLayout";
import { PortalLoading } from "@/components/PortalLoading";
import { NotificationInbox } from "@/components/NotificationInbox";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/_authenticated/school")({
  validateSearch: (s: Record<string, unknown>): { section?: string | undefined } => ({
    section: ["overview", "profile", "messages"].includes(String(s["section"]))
      ? String(s["section"])
      : undefined,
  }),
  beforeLoad: async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw redirect({ to: "/auth" });
    const role = await supabase.rpc("has_role", { _user_id: user.id, _role: "school" });
    if (!role.data) throw redirect({ to: "/my-account" });
  },
  head: () => ({
    meta: [{ title: "School Admin | JobShadow" }, { name: "robots", content: "noindex" }],
  }),
  component: SchoolAdmin,
});
function SchoolAdmin() {
  const section = Route.useSearch().section;
  const [active, setActive] = useState(section ?? "overview");
  useEffect(() => {
    if (section) setActive(section);
  }, [section]);
  const { user, profile } = useOwnIdentity();
  if (user.isPending || (user.data && profile.isPending)) return <PortalLoading />;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader portal />
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <aside className="shrink-0 bg-cta p-3 text-cta-foreground md:w-60">
          <p className="px-3 py-3 text-xs font-bold uppercase tracking-widest">School Admin</p>
          <nav
            aria-label="School navigation"
            className="sticky top-32 max-h-[calc(100dvh-8rem)] space-y-1 overflow-y-auto"
          >
            {[
              ["overview", "Overview"],
              ["profile", "Profile"],
              ["messages", "Messages"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`block w-full rounded px-3 py-2.5 text-left text-sm ${active === key ? "bg-primary/10" : "hover:bg-primary/5"}`}
                aria-pressed={active === key}
                onClick={() => setActive(key!)}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 bg-ivory p-6">
          {active !== "profile" && (
            <h1 className="font-display text-2xl">
              {active === "messages"
                ? "Messages"
                : active === "profile"
                  ? "School Contact"
                  : "School Overview"}
            </h1>
          )}
          {active === "profile" ? (
            <AccountProfile />
          ) : active === "messages" ? (
            <div className="mt-4">{user.data && <NotificationInbox userId={user.data.id} />}</div>
          ) : (
            <div className="mt-4 space-y-3">
              <p>
                {profile.data?.display_name ||
                  [profile.data?.first_name, profile.data?.last_name].filter(Boolean).join(" ") ||
                  "School contact"}
              </p>
              <p className="text-sm">{user.data?.email}</p>
              {active === "profile" ? (
                <Link
                  to="/profile"
                  search={{ tab: "profile" }}
                  className="inline-block text-sm text-primary underline"
                >
                  Edit contact details
                </Link>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your school account is ready. Contact JobShadow to arrange scholar bookings for
                    your school.
                  </p>
                  <Link
                    to="/contact"
                    className="inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
                  >
                    Contact JobShadow
                  </Link>
                </>
              )}
            </div>
          )}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
