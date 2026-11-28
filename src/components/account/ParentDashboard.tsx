import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { loadPersonalOnboarding, loadParentSignatureHistory, type ParentSignatureHistory } from "@/lib/personal-onboarding.functions";
import { loadTestIndemnity } from "@/lib/test-indemnity.functions";
import { PersonalOnboarding } from "./PersonalOnboarding";
import { IndemnityDraftPreview } from "./IndemnityDraftPreview";
import { LegalFormBody } from "@/components/LegalFormBody";
import { isSwitchPersona } from "@/lib/dev-personas";

export type ParentBooking = { booking_id: string; career: string; company: string; shadow_date: string; status: string; guardian_signature_status: "pending" | "signed" };
export type ParentChild = { scholar_user_id: string; full_name: string; school: string; career_interests: string; pending_bookings: ParentBooking[] };
function date(value: string) { return new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }); }
function HistoryDocument({ receipt }: { receipt: ParentSignatureHistory }) {
  if (receipt.document_key === "form_a") return <LegalFormBody body={receipt.document_body} />;
  try {
    const document = JSON.parse(receipt.document_body) as { sections?: { heading: string; body: string }[]; parent_declaration?: string };
    return <div className="space-y-3">{document.sections?.map(section => <section key={section.heading}><h5 className="font-bold">{section.heading}</h5><p className="text-sm leading-relaxed">{section.body}</p></section>)}<p className="text-sm">{document.parent_declaration}</p></div>;
  } catch { return <p className="whitespace-pre-wrap text-sm">{receipt.document_body}</p>; }
}
function BookingCard({ booking, signed }: { booking: ParentBooking; signed: boolean }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-[#FFFDF5] p-3 text-sm"><div><p className="font-bold">{booking.career} — {booking.company}</p><p>{booking.shadow_date}</p></div><Link to="/indemnity/$bookingId" params={{ bookingId: booking.booking_id }} className="rounded bg-primary px-4 py-2 font-semibold text-primary-foreground">{signed ? "View Signed Form" : "Sign Indemnity Form"}</Link></div>;
}
function ChildDashboard({ child, parentId, testProfiles }: { child: ParentChild; parentId: string; testProfiles: boolean }) {
  const load = useServerFn(loadPersonalOnboarding);
  const loadTests = useServerFn(loadTestIndemnity);
  const loadHistory = useServerFn(loadParentSignatureHistory);
  const personal = useQuery({ queryKey: ["personal-onboarding", child.scholar_user_id], queryFn: () => load({ data: { scholarId: child.scholar_user_id } }), refetchInterval: 30_000 });
  const test = useQuery({ queryKey: ["test-indemnity-signatures", child.scholar_user_id], enabled: testProfiles, queryFn: () => loadTests({ data: { scholarId: child.scholar_user_id } }), refetchInterval: 30_000 });
  const history = useQuery({ queryKey: ["parent-signature-history", child.scholar_user_id, parentId], queryFn: () => loadHistory({ data: { scholarId: child.scholar_user_id } }), refetchInterval: 30_000 });
  const pendingBookings = child.pending_bookings.filter(booking => booking.guardian_signature_status !== "signed" && booking.status !== "cancelled");
  const signedBookings = child.pending_bookings.filter(booking => booking.guardian_signature_status === "signed");
  const needsConsent = personal.data && !personal.data.parentSigned;
  const needsTestIndemnity = testProfiles && test.isSuccess && !test.data.receipts.some(receipt => receipt.signer_role === "parent" && receipt.signer_user_id === parentId);
  return <section aria-label={`${child.full_name} dashboard`} className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
    <h2 className="font-bold text-xl text-teal">{child.full_name}</h2>
    <section aria-label="Forms to Sign" className="space-y-4"><h3 className="font-bold text-lg">Forms to Sign</h3>
      {personal.isPending && <p role="status">Loading forms…</p>}
      {(personal.isError || (testProfiles && test.isError)) && <p role="alert">Some forms could not be loaded. Please refresh.</p>}
      {needsConsent && <PersonalOnboarding key={child.scholar_user_id} scholarId={child.scholar_user_id} parent />}
      {needsTestIndemnity && <IndemnityDraftPreview scholarId={child.scholar_user_id} />}
      {pendingBookings.map(booking => <BookingCard key={booking.booking_id} booking={booking} signed={false} />)}
      {personal.isSuccess && (!testProfiles || test.isSuccess) && !needsConsent && !needsTestIndemnity && pendingBookings.length === 0 && <p className="text-sm">You have no forms waiting for your signature.</p>}
    </section>
    <section aria-label="Signature History" className="space-y-3 border-t border-border pt-4"><h3 className="font-bold text-lg">History</h3>
      {history.isPending && <p role="status">Loading signing history…</p>}
      {history.isError && <p role="alert">Your signing history could not be loaded. Please refresh.</p>}
      {history.data?.map(receipt => <details key={`${receipt.document_key}-${receipt.document_version}`} className="rounded-lg border bg-[#FFFDF5] p-4"><summary className="cursor-pointer text-sm font-semibold">{receipt.document_key === "form_a" ? "Personal Information & Identity Verification Consent" : "Indemnity Form"} · Signed {date(receipt.signed_at)}{receipt.is_test ? " · Test" : ""}</summary><div className="mt-4 space-y-4"><HistoryDocument receipt={receipt} /><p className="guardian-signature-font text-3xl">{receipt.signature_name}</p><p className="text-xs">Date &amp; Time: {date(receipt.signed_at)} · IP Address: {receipt.ip_address ?? "Unavailable"}</p></div></details>)}
      {signedBookings.map(booking => <BookingCard key={booking.booking_id} booking={booking} signed />)}
      {history.isSuccess && !history.data.length && !signedBookings.length && <p className="text-sm">Your signed forms will appear here.</p>}
    </section>
  </section>;
}
export function ParentDashboard({ childrenList, user }: { childrenList: ParentChild[]; user: { id: string; email?: string | undefined } }) {
  return <div className="space-y-5">{childrenList.map(child => <ChildDashboard key={child.scholar_user_id} child={child} parentId={user.id} testProfiles={isSwitchPersona(user.id, user.email)} />)}</div>;
}
