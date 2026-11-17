import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { RegisterForm } from "@/components/RegisterForm";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import arrow from "@/assets/yellow-arrow.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Job Shadow — Be sure about the career and life you choose" },
      { name: "description", content: "Job Shadow facilitates job shadowing for South African high school students: a day with a mentor, or a one-hour digital interview, before committing to study." },
      { property: "og:title", content: "Job Shadow — Be sure about the career and life you choose" },
      { property: "og:description", content: "Job shadowing for high school students, before committing to tertiary study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const ORG_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Job Shadow",
  url: "https://jobshadow.co.za",
  logo: "https://jobshadow.co.za/assets/jobshadow-logo-shadow.png",
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
    const { data: u } = await supabase.auth.getUser();
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: u.user!.id, _role: "admin" });
    navigate({ to: isAdmin ? "/admin" : "/my-account" });
  }

  const input = "w-full rounded-full border border-primary-foreground/40 bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-primary-foreground/70";

  return (
    <form onSubmit={submit} className="col-span-2 mt-2 grid gap-2 text-left">
      <input id="home-signin-email" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      <PasswordInput required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      {msg && <p aria-live="polite" className="text-xs font-semibold text-accent">{msg}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="submit" disabled={busy} className="rounded-full bg-cta px-5 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50">
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
    if (signedIn) { void navigate({ to: "/profile", search: { tab: "bookings" } }); return; }
    setShowSignIn(true);
    setShowSignUp(false);
    requestAnimationFrame(() => {
      document.getElementById("home-signin-frame")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("home-signin-email")?.focus();
    });
  }

  return (
    <SiteLayout className="home-reference">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_JSON_LD }} />
      <section
        className="relative overflow-hidden text-primary-foreground"
      >
        <img src={arrow.url} alt="" aria-hidden width={326} height={1080} className="pointer-events-none absolute top-8 right-[4%] hidden h-[calc(100%-4rem)] w-auto md:block" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-32 pt-16 text-center sm:pt-20 md:pt-24">
          <h1 className="max-w-3xl font-display text-[clamp(2.5rem,5.5vw,5rem)] uppercase leading-[1.05]">
            Be sure about the career and life you choose
            <span className="mt-4 block text-[0.8em] text-accent">with Job Shadow.</span>
          </h1>
          <button
            type="button"
            onClick={focusSignIn}
            className="mt-12 rounded-2xl bg-cta px-9 py-4 text-lg font-semibold uppercase tracking-[0.2em] text-cta-foreground shadow-warm transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Book Job Shadow
          </button>

          {!signedIn && <div id="home-signin-frame" className="mt-10 grid w-full max-w-md grid-cols-2 gap-4 rounded-2xl border border-primary-foreground/30 bg-black/15 p-5 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">New here?</p>
              <button
                type="button"
                onClick={() => { setShowSignUp((v) => !v); setShowSignIn(false); }}
                aria-pressed={showSignUp}
                className={`w-full rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition ${showSignUp ? "border-cta bg-cta text-cta-foreground shadow-warm" : "border-primary-foreground/40 hover:bg-primary-foreground/10"}`}
              >
                Sign Up
              </button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Returning?</p>
              <button
                type="button"
                onClick={() => { setShowSignIn((v) => !v); setShowSignUp(false); }}
                aria-pressed={showSignIn}
                className={`w-full rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition ${showSignIn ? "border-cta bg-cta text-cta-foreground shadow-warm" : "border-primary-foreground/40 hover:bg-primary-foreground/10"}`}
              >
                Sign In
              </button>
            </div>
            {showSignUp && (
              <div className="col-span-2 mt-2">
                <RegisterForm compact />
              </div>
            )}
            {showSignIn && <InlineSignIn />}
          </div>}
        </div>
      </section>
    </SiteLayout>
  );
}
