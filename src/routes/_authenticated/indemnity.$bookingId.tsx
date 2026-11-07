import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/indemnity/$bookingId")({
  head: () => ({
    meta: [{ title: "Indemnity Form | JobShadow" }, { name: "robots", content: "noindex" }],
  }),
  component: IndemnityForm,
});

function IndemnityForm() {
  const { bookingId } = Route.useParams();

  const data = useQuery({
    queryKey: ["indemnity", bookingId],
    queryFn: async () => {
      const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      if (!booking) return null;
      const [{ data: profile }, { data: companyRows }] = await Promise.all([
        supabase.from("scholar_profiles").select("*").eq("user_id", booking.user_id).maybeSingle(),
        supabase.rpc("get_booking_company_details", { _booking: bookingId }),
      ]);
      return { booking, profile, company: companyRows?.[0] ?? null };
    },
  });

  if (data.isLoading) return <p className="p-8">Loading…</p>;
  if (!data.data?.booking) return <p className="p-8">Booking not found.</p>;
  const { booking, profile, company } = data.data;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 text-sm leading-relaxed text-foreground print:px-0">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print mb-6 flex justify-end">
        <button onClick={() => window.print()} className="rounded bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground">Print / Save as PDF</button>
      </div>
      <h1 className="font-display text-2xl font-bold">Job Shadow Indemnity &amp; Consent Form</h1>
      <p className="mt-1 text-muted-foreground">Please print, read, sign and have your parent/guardian sign, then upload the scanned/photographed form in My Bookings.</p>

      <h2 className="mt-6 font-semibold">Placement details</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
        <div><dt className="font-semibold">Scholar</dt><dd>{profile?.full_name ?? "—"}</dd></div>
        <div><dt className="font-semibold">School</dt><dd>{profile?.school ?? "—"}</dd></div>
        <div><dt className="font-semibold">Career / Role</dt><dd>{booking.career}</dd></div>
        <div><dt className="font-semibold">Shadow date</dt><dd>{booking.shadow_date}</dd></div>
        <div><dt className="font-semibold">Location</dt><dd>{company?.address || booking.location || "—"}</dd></div>
        <div><dt className="font-semibold">Arrival / Collection</dt><dd>{company?.arrival_time || "TBC"} / {company?.collection_time || "TBC"}</dd></div>
      </dl>

      <h2 className="mt-6 font-semibold">Acknowledgement of risk and indemnity</h2>
      <p className="mt-2">
        I, the undersigned parent/legal guardian of the above-named scholar, consent to their participation in the Job
        Shadow placement described above. I understand that the scholar will spend time at a host company's premises
        under the supervision of a mentor, and that reasonable precautions will be taken for their safety, but that
        job shadowing, like any workplace activity, carries some inherent risk.
      </p>
      <p className="mt-2">
        I hereby release and indemnify Job Shadow, the host company, and their respective employees and
        representatives, against any claim for loss, injury, illness or damage arising from the scholar's
        participation in this placement, except to the extent caused by their gross negligence or wilful misconduct.
        I confirm that the scholar has no medical condition that I have not disclosed to Job Shadow which could
        affect their participation, and that I have provided accurate contact and emergency information.
      </p>
      <p className="mt-2">
        I understand that photographs or video may be taken during the placement for Job Shadow's records and may be
        used for promotional purposes unless I notify Job Shadow in writing that I do not consent to this.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-8">
        <div>
          <p className="border-b border-foreground/50 pb-8" />
          <p className="mt-1 text-xs">Parent / Guardian signature</p>
        </div>
        <div>
          <p className="border-b border-foreground/50 pb-8" />
          <p className="mt-1 text-xs">Date</p>
        </div>
        <div>
          <p className="border-b border-foreground/50 pb-8" />
          <p className="mt-1 text-xs">Parent / Guardian name (print)</p>
        </div>
        <div>
          <p className="border-b border-foreground/50 pb-8" />
          <p className="mt-1 text-xs">Contact number</p>
        </div>
      </div>
    </div>
  );
}
