import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { PersonalOnboarding, ScholarSignupDate } from "@/components/account/PersonalOnboarding";
import { IndemnityDraftPreview } from "@/components/account/IndemnityDraftPreview";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({
    meta: [{ title: "Parent Portal | JobShadow" }, { name: "robots", content: "noindex" }],
  }),
  component: ParentPortal,
});

type Booking = { booking_id: string; career: string; company: string; shadow_date: string; status: string; guardian_signature_status: "pending" | "signed" };
type Child = { scholar_user_id: string; full_name: string; school: string; career_interests: string; pending_bookings: Booking[] };

function ParentPortal() {
  const children = useQuery({
    queryKey: ["parent-children"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_parent_children");
      if (error) throw new Error(error.message);
      return (data ?? []) as Child[];
    },
  });

  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">Parent Portal</h1>
        <p className="mx-auto mt-2 max-w-7xl text-sm">Your linked scholar's bookings and profile. Bookings below need your digital signature before they're confirmed.</p>
      </div>
      <section className="bg-muted/40 px-5 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {children.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {children.data?.length === 0 && <p className="text-sm text-muted-foreground">No scholar profile is linked to your email yet. Ask your scholar to add you as their parent/guardian email in their profile.</p>}
          {children.data?.map((c) => (
            <div key={c.scholar_user_id} className="rounded-xl border border-primary bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">{c.full_name}</h2>
              <ScholarSignupDate scholarId={c.scholar_user_id} />
              <div className="mt-4"><PersonalOnboarding key={c.scholar_user_id} scholarId={c.scholar_user_id} parent /></div>
              <div className="mt-4"><IndemnityDraftPreview /></div>
              <div className="mt-4 space-y-2">
                {c.pending_bookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
                {c.pending_bookings.map((b) => (
                  <div key={b.booking_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium">{b.career} at {b.company}</p>
                      <p className="text-xs text-muted-foreground">{b.shadow_date} · {b.status}</p>
                    </div>
                    {b.guardian_signature_status === "pending" ? (
                      <Link to="/indemnity/$bookingId" params={{ bookingId: b.booking_id }} className="rounded-full bg-cta px-4 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground">Sign now</Link>
                    ) : (
                      <span className="rounded-full bg-teal px-4 py-2 text-xs font-bold uppercase tracking-wide text-teal-foreground">Signed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
