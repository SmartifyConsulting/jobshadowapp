import { publicSeo } from "@/lib/seo";
import { ShareStoryForm, SendToFriendForm } from "@/components/SharingPage";
import { PartnerApplicationForm } from "@/components/PartnerApplicationForm";
import { CONTACT_AUDIENCES } from "@/lib/audiences";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Facebook, Instagram } from "lucide-react";
import { z } from "zod";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { CONTACT_EMAIL } from "@/lib/data";
import { PARTNER_BLOCKS, PARTNER_HERO } from "@/lib/content";

type ContactType = "host" | "school" | "mentor" | undefined;
type ContactView = "story" | "friend" | undefined;

export const Route = createFileRoute("/contact")({
  validateSearch: (s: Record<string, unknown>): { type?: ContactType; view?: ContactView } => ({
    type:
      s["type"] === "host" || s["type"] === "school" || s["type"] === "mentor"
        ? s["type"]
        : undefined,
    view: s["view"] === "story" || s["view"] === "friend" ? s["view"] : undefined,
  }),
  head: () => ({
    links: publicSeo("/contact").links,
    meta: [
      ...publicSeo("/contact").meta,
      { title: "Contact & Share | Job Shadow" },
      {
        name: "description",
        content:
          "Contact Job Shadow, become a mentor or partner, share an experience or introduce a friend to job shadowing.",
      },
      { property: "og:title", content: "Contact JobShadow" },
      {
        property: "og:description",
        content: "Get in touch, share a job shadowing experience or send Job Shadow to a friend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contact,
});

const FORM_COPY: Record<
  NonNullable<ContactType>,
  { heading: string; orgLabel: string; subject: string }
> = {
  host: { heading: "Become A Host", orgLabel: "Company name", subject: "New host application" },
  school: {
    heading: "Partner Your School",
    orgLabel: "School name",
    subject: "New school partnership application",
  },
  mentor: { heading: "Become A Mentor", orgLabel: "Your name", subject: "New mentor application" },
};

const BLOCKS = {
  school: {
    color: "bg-teal text-teal-foreground",
    text: (
      <>
        If you are a school and want to include job shadow as{" "}
        <strong>part of your life orientation program</strong>
      </>
    ),
  },
  host: {
    color: "bg-accent text-accent-foreground",
    text: (
      <>
        if you are a company who would like to be <strong>a part of our hosting</strong> program
      </>
    ),
  },
  mentor: {
    color: "bg-cta text-cta-foreground",
    text: (
      <>
        if you are an individual professional who would like to <strong>mentor a scholar</strong>{" "}
        for a day
      </>
    ),
  },
};

function Contact() {
  const { type, view } = Route.useSearch();
  const copy = type ? FORM_COPY[type] : null;

  const [f, setF] = useState({
    reachingOutAs: "",
    org: "",
    contact: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  useEffect(() => {
    setErrors({});
    setSent(false);
  }, [type, view]);
  const { data: session } = useSiteSession();
  const signedInEmail = session?.user?.email ?? null;

  const schema = z.object({
    reachingOutAs: copy
      ? z.string().optional()
      : z.enum(CONTACT_AUDIENCES, {
          errorMap: () => ({ message: "Please select who you are reaching out as" }),
        }),
    org: copy
      ? z.string().trim().min(1, `Please enter the ${copy.orgLabel.toLowerCase()}`).max(150)
      : z.string().trim().min(1, "Please enter your name").max(150),
    contact: copy
      ? z.string().trim().min(1, "Please enter a contact person").max(150)
      : z.string().optional(),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone: copy
      ? z.string().trim().min(1, "Please enter a phone number").max(50)
      : z.string().optional(),
    message: copy
      ? z.string().trim().max(2000).optional()
      : z.string().trim().min(1, "Please add a message").max(2000),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(signedInEmail ? { ...f, email: signedInEmail } : f);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    const subject = copy
      ? `${copy.subject} — ${r.data.org}`
      : `Message from ${r.data.org} via jobshadow.co.za`;
    const bodyLines = copy
      ? [
          `Type: ${copy.heading}`,
          `${copy.orgLabel}: ${r.data.org}`,
          `Contact person: ${r.data.contact}`,
          `Email: ${r.data.email}`,
          `Phone: ${r.data.phone}`,
          "",
          r.data.message || "(no additional message)",
        ]
      : [
          `I am reaching out as a: ${r.data.reachingOutAs}`,
          "",
          r.data.message,
          "",
          `— ${r.data.org} (${r.data.email})`,
        ];
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    setSent(true);
  };

  const input =
    "mt-1 w-full border-b border-current/40 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-current/70 focus:border-primary-foreground";
  const err = (k: string) =>
    errors[k] && <span className="mt-1 block text-xs text-accent">{errors[k]}</span>;

  return (
    <SiteLayout>
      <section className="flex-1 bg-primary px-5 py-14 text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-2">
          <div>
            <h1 className="whitespace-pre-line font-display text-3xl uppercase leading-tight md:text-4xl">
              {PARTNER_HERO.title.replace(". ", ".\n")}
            </h1>
            <p className="mt-4 text-sm text-primary-foreground/80">{PARTNER_HERO.sub}</p>
          </div>
          <div className="md:text-right">
            <p className="font-display text-lg text-primary-foreground">
              If You Just Want To Say Hi
            </p>
            <p className="mt-2 font-display text-2xl uppercase text-primary-foreground">
              Please Contact Us
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 md:justify-end">
              <a
                href={"mailto:" + CONTACT_EMAIL}
                className="text-sm font-semibold text-cta hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              <a
                href="https://www.facebook.com/JobShadowBookings"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground text-primary"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/jobshadowbookings"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground text-primary"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-accent md:justify-end">
              <Link
                to="/contact"
                search={{ view: "friend" }}
                hash="contact-form"
                className="hover:underline"
              >
                Send To A Friend
              </Link>
              <Link to="/contact" search={{}} hash="contact-form" className="hover:underline">
                Send Us A Message
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-foreground/10 bg-accent p-3 text-accent-foreground sm:p-4">
              <h2 className="font-display text-xl">Scholars</h2>
              <p className="mt-2 text-sm leading-snug">
                Explore careers and experience a working day with a mentor.
              </p>
              <ul className="mt-2 space-y-1">
                {[
                  "Discover careers that interest you",
                  "Complete your profile and request a visit",
                  "Share what you learned",
                ].map((point) => (
                  <li key={point} className="flex gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={
                    session?.user ? "/profile?tab=bookings&step=profile" : "/auth?go=studentProfile"
                  }
                  className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground"
                >
                  Book a Job Shadow
                </a>
                <Link
                  to="/contact"
                  search={{ view: "story" }}
                  resetScroll={false}
                  className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground"
                >
                  Share Your Experience
                </Link>
              </div>
            </div>
            {PARTNER_BLOCKS.map((b) => (
              <div
                key={b.type}
                className={
                  "rounded-xl border border-foreground/10 p-3 sm:p-4 " + BLOCKS[b.type].color
                }
              >
                <h2 className="font-display text-xl">{b.title}</h2>
                <p className="mt-2 text-sm leading-snug">{BLOCKS[b.type].text}</p>
                <ul className="mt-2 space-y-1">
                  {b.points.map((p) => (
                    <li key={p} className="flex gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 shrink-0 text-current" />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to="/contact"
                    search={{ type: b.type }}
                    className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground"
                  >
                    {b.cta}
                  </Link>
                  {b.type === "mentor" && (
                    <a
                      href="/how-to?guide=company#company-benefits"
                      className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground"
                    >
                      Why Companies Participate
                    </a>
                  )}
                  {(b.type === "mentor" || b.type === "school") && (
                    <Link
                      to="/contact"
                      search={{ view: "story" }}
                      resetScroll={false}
                      className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground"
                    >
                      Share Your Experience
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            id="contact-form"
            role="region"
            aria-labelledby="contact-form-title"
            className="scroll-mt-36 rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-6"
          >
            <h2
              id="contact-form-title"
              aria-live="polite"
              className="font-display text-2xl uppercase"
            >
              {view === "story"
                ? "Share Your Experience"
                : view === "friend"
                  ? "Send To A Friend"
                  : (copy?.heading ?? "Send Us A Message")}
            </h2>

            {view === "story" ? (
              <ShareStoryForm />
            ) : view === "friend" ? (
              <SendToFriendForm />
            ) : type === "host" || type === "mentor" ? (
              <PartnerApplicationForm
                key={type}
                type={type}
                userId={session?.user?.id ?? null}
                email={signedInEmail}
              />
            ) : sent ? (
              <p className="mt-6 text-sm">
                Your email app should now be open with your application ready to send.
              </p>
            ) : (
              <form onSubmit={submit} className="mt-6 grid gap-4">
                {!copy && (
                  <label>
                    <span className="text-xs uppercase tracking-wide opacity-80">
                      I am reaching out as a:
                    </span>
                    <select
                      required
                      className={input}
                      value={f.reachingOutAs}
                      onChange={(e) => setF({ ...f, reachingOutAs: e.target.value })}
                    >
                      <option value="" disabled className="bg-background text-foreground">
                        Please select
                      </option>
                      {CONTACT_AUDIENCES.map((audience) => (
                        <option
                          key={audience}
                          value={audience}
                          className="bg-background text-foreground"
                        >
                          {audience}
                        </option>
                      ))}
                    </select>
                    {err("reachingOutAs")}
                  </label>
                )}
                <label>
                  <span className="text-xs uppercase tracking-wide opacity-80">
                    {copy?.orgLabel ?? "Your name"}
                  </span>
                  <input
                    className={input}
                    value={f.org}
                    onChange={(e) => setF({ ...f, org: e.target.value })}
                  />
                  {err("org")}
                </label>
                {copy && (
                  <label>
                    <span className="text-xs uppercase tracking-wide opacity-80">
                      Contact person
                    </span>
                    <input
                      className={input}
                      value={f.contact}
                      onChange={(e) => setF({ ...f, contact: e.target.value })}
                    />
                    {err("contact")}
                  </label>
                )}
                <label>
                  <span className="text-xs uppercase tracking-wide opacity-80">Email</span>
                  <input
                    className={input}
                    type="email"
                    value={signedInEmail ?? f.email}
                    readOnly={!!signedInEmail}
                    onChange={(e) => setF({ ...f, email: e.target.value })}
                  />
                  {err("email")}
                </label>
                {copy && (
                  <label>
                    <span className="text-xs uppercase tracking-wide opacity-80">Phone</span>
                    <input
                      className={input}
                      value={f.phone}
                      onChange={(e) => setF({ ...f, phone: e.target.value })}
                    />
                    {err("phone")}
                  </label>
                )}
                <label>
                  <span className="text-xs uppercase tracking-wide opacity-80">
                    {copy ? "Anything else we should know? (optional)" : "Message"}
                  </span>
                  <textarea
                    rows={copy ? 3 : 5}
                    className={input}
                    value={f.message}
                    onChange={(e) => setF({ ...f, message: e.target.value })}
                  />
                  {err("message")}
                </label>
                <button className="mt-2 rounded-full bg-cta px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-cta-foreground">
                  {copy ? "Submit Application" : "Send"}
                </button>
                {copy && (
                  <Link to="/contact" className="text-xs underline opacity-80">
                    Just want to send a general message instead?
                  </Link>
                )}
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
