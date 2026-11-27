import { publicSeo } from "@/lib/seo";
import { HEADER_LOGO_URL } from "@/components/BrandLogo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { RegisterForm } from "@/components/RegisterForm";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import arrow from "@/assets/yellow-arrow.png.asset.json";
import headline from "@/assets/hero-headline.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    links: publicSeo("/").links,
    meta: [
      ...publicSeo("/").meta,
      { title: "Job Shadow South Africa | Career Exploration for Scholars" },
      { name: "description", content: "Job Shadow facilitates job shadowing for South African high school students: a day with a mentor, or a one-hour digital interview, before committing to study." },
      { property: "og:title", content: "Job Shadow — Be sure about the career and life you choose" },
      { property: "og:description", content: "Job shadowing for high school students, before committing to tertiary study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Job Shadow — Be sure about the career and life you choose" },
      { name: "twitter:description", content: "Job shadowing for high school students, before committing to tertiary study." },
      { property: "og:image", content: "https://jobshadow.co.za/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: "https://jobshadow.co.za/og-image.jpg" },
    ],
  }),
  component: Home,
});

const ORG_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://jobshadow.co.za/#organization",
  name: "Job Shadow",
  legalName: "Job Shadow (Pty) Ltd",
  url: "https://jobshadow.co.za",
  logo: "https://jobshadow.co.za" + HEADER_LOGO_URL,
  email: "info@jobshadow.co.za",
  description: "Job Shadow facilitates job shadowing for South African high school students.",
  areaServed: "ZA",
  sameAs: ["https://www.facebook.com/JobShadowBookings", "https://www.instagram.com/jobshadowbookings"],
});

function InlineSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMsg(/email.*not.*confirmed/i.test(error.message) ? "Please confirm your email first — check your inbox." : "Email or password is incorrect.");
    navigate({ to: "/my-account" });
  }

  const input = "w-full rounded-full border border-primary-foreground/40 bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-primary-foreground/70";

  return (
    <form onSubmit={submit} className="col-span-2 mt-2 grid gap-2 text-left">
      <input id="home-signin-email" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      <PasswordInput required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      {msg && <p aria-live="polite" className="text-xs font-semibold text-accent">{msg}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="submit" disabled={busy} className="rounded-none bg-cta px-5 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50">
          {busy ? "Signing in…" : "Sign In"}
        </button>
        <Link to="/forgot-password" className="text-xs font-semibold underline">Forgot password?</Link>
      </div>
    </form>
  );
}

function Home() {
  const navigate = useNavigate();
  const { data: session } = useSiteSession();
  const signedIn = !!session?.user;
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  function focusSignIn() {
    if (signedIn) { void navigate({ to: "/profile", search: { tab: "bookings", step: "profile" } }); return; }
    setShowSignIn(true);
    setShowSignUp(false);
    requestAnimationFrame(() => {
      document.getElementById("home-signin-frame")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("home-signin-email")?.focus();
    });
  }

  return (
    <SiteLayout className="home-reference" headerLogo={<img src="/assets/jobshadow-logo-shadow-yellow.png" alt="JobShadow" className="h-[82px] w-auto object-contain lg:h-[95px]" />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": "https://jobshadow.co.za/#website",
        name: "Job Shadow",
        url: "https://jobshadow.co.za/",
        inLanguage: "en-ZA",
        publisher: { "@id": "https://jobshadow.co.za/#organization" },
      }) }} />
      <section
        className="relative overflow-hidden text-primary-foreground"
      >
        <img src={arrow.url} alt="" aria-hidden width={326} height={1080} className="pointer-events-none absolute top-8 right-[1%] hidden h-[calc(100%-1rem)] w-auto md:block" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-36 pt-16 text-center sm:pt-20 md:pt-24">
          <h1 className="sr-only">Be sure about the career and life you choose with Job Shadow.</h1>
          <img src={headline.url} alt="" width={1263} height={338} className="mt-[2cm] w-full max-w-4xl" />
          <button
            type="button"
            onClick={focusSignIn}
            className="mt-12 rounded-2xl bg-cta px-9 py-4 text-lg font-semibold uppercase tracking-[0.2em] text-cta-foreground shadow-warm transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Book Job Shadow
          </button>

          {!signedIn && <div id="home-signin-frame" className="mt-10 w-full max-w-md rounded-2xl border border-primary-foreground/30 bg-black/15 p-5 backdrop-blur-sm">
            <div className="flex overflow-hidden rounded-full border border-primary-foreground/40">
              <button
                type="button"
                onClick={() => { setShowSignUp((v) => !v); setShowSignIn(false); }}
                aria-pressed={showSignUp}
                className={`flex-1 px-4 py-2 text-sm font-semibold uppercase tracking-wide transition ${showSignUp ? "bg-cta text-cta-foreground shadow-warm" : "hover:bg-primary-foreground/10"}`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => { setShowSignIn((v) => !v); setShowSignUp(false); }}
                aria-pressed={showSignIn}
                className={`flex-1 px-4 py-2 text-sm font-semibold uppercase tracking-wide transition ${showSignIn ? "bg-cta text-cta-foreground shadow-warm" : "hover:bg-primary-foreground/10"}`}
              >
                Sign In
              </button>
            </div>
            {showSignUp && (
              <div className="mt-4">
                <RegisterForm compact />
              </div>
            )}
            {showSignIn && <div className="mt-4"><InlineSignIn /></div>}
          </div>}
          <div className="mx-auto mt-6 max-w-2xl space-y-3 text-sm leading-relaxed">
            <p>
              Need to easily identify your <strong>most suited career orientation</strong>,{" "}
              <strong>tertiary qualification</strong> and{" "}
              <strong>school subject requirements</strong> for this ideal career?
            </p>
            <p className="mt-3">
              Why not <strong>book a job shadow</strong> and get a{" "}
              <strong>10% discount on an online Career Guidance Tool</strong>.
            </p>
            <p className="mt-3">
              This is an online self-evaluation process which is{" "}
              <strong>easily accessible</strong>, identifies your interests and skills to{" "}
              <strong>best match your personality type</strong>, with{" "}
              <strong>immediate feedback</strong> via a report card to your inbox the moment you
              are done!
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
