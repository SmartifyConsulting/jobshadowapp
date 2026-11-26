import { useState, type ReactNode } from "react";
import { Calendar, FileEdit, Users, CheckCircle2, Handshake, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { JourneyStepper } from "@/components/JourneyStepper";

export function MentorHostingGuide({
  initialStep = "availability",
  preferences,
  bookings,
  complete = [],
}: {
  initialStep?: string;
  preferences: ReactNode;
  bookings: ReactNode;
  complete?: boolean[];
}) {
  const [step, setStep] = useState(initialStep);
  const steps = [
    { id: "availability", title: "Set Availability", icon: Calendar },
    { id: "forms", title: "Complete Forms (Indemnity & NDA)", icon: FileEdit },
    { id: "requests", title: "Receive Booking Requests", icon: Users },
    { id: "confirm", title: "Confirm a Booking", icon: CheckCircle2 },
    { id: "experience", title: "Do the Job Shadow", icon: Handshake },
    { id: "feedback", title: "Get Feedback & Build Your Profile", icon: Bell },
  ];
  return (
    <div className="space-y-4">
      <JourneyStepper
        title="Step 2: Hosting & Feedback"
        titleClassName="text-lg font-bold"
        steps={steps.map((item, index) => ({ ...item, complete: !!complete[index] }))}
        active={step}
        onChange={setStep}
      />
      <div className={step === "availability" ? "space-y-4" : "hidden"}>{preferences}</div>
      {step === "forms" && (
        <section className="rounded border border-border p-4 space-y-2">
          <h2 className="text-sm font-bold">Complete Forms (Indemnity &amp; NDA)</h2>
          <p className="text-sm">
            Contact Job Shadow to arrange the mentoring forms and confirm which documents are
            required.
          </p>
          <Link to="/contact" className="text-sm font-bold underline">
            Contact Job Shadow
          </Link>
        </section>
      )}
      <div
        className={["requests", "confirm", "experience"].includes(step) ? "space-y-4" : "hidden"}
      >
        {bookings}
      </div>
      {step === "feedback" && (
        <section className="rounded border border-border p-4 space-y-2">
          <h2 className="text-sm font-bold">Get Feedback &amp; Build Your Profile</h2>
          <p className="text-sm">
            Review feedback from completed job shadows with Job Shadow and keep your profile up to
            date.
          </p>
          <Link to="/contact" className="text-sm font-bold underline">
            Contact Job Shadow About Feedback
          </Link>
        </section>
      )}
    </div>
  );
}
