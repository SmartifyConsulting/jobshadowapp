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
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">Sign-Up / Register</h1>
        <p className="mx-auto mt-2 max-w-7xl text-sm">Complete all the steps starting with signing in. You are moments away from getting a job shadow!</p>
        <p className="mx-auto mt-3 max-w-7xl text-sm font-bold">NOTE: no more than one scholar per registration.</p>
      </div>
      <section className="bg-teal px-5 py-8 text-teal-foreground">
        <div className="mx-auto max-w-7xl">
          <RegisterForm />
          <Link to="/auth" className="mt-4 block text-sm underline">Already have an account? Log in</Link>
        </div>
      </section>
    </SiteLayout>
  );
}
