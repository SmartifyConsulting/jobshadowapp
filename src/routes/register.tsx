import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { RegisterForm } from "@/components/RegisterForm";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Sign-Up / Register | JobShadow" },
      { name: "description", content: "Create your JobShadow account." },
      { property: "og:title", content: "Sign-Up / Register | JobShadow" },
      { property: "og:description", content: "Create your JobShadow account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <SiteLayout>
      <section className="flex justify-center bg-teal px-4 py-8">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-lg">
          <div className="bg-primary px-6 py-5 text-primary-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" /> Step 1 of 3 • Create account
            </span>
            <h1 className="mt-2 font-display text-2xl uppercase">Sign-Up / Register</h1>
            <p className="mt-1 text-sm text-primary-foreground/90">Complete all the steps starting with signing in. You are moments away from getting a job shadow!</p>
          </div>
          <div className="px-6 py-5 text-foreground">
            <RegisterForm />
            <div className="mt-4 border-t border-border pt-4 text-center text-sm">
              <p>Already have an account? <Link to="/auth" className="font-semibold text-accent underline">Log in</Link></p>
              <p className="mt-1">Parent or guardian? <Link to="/parent-signup" className="font-semibold underline">Set your password here</Link></p>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
