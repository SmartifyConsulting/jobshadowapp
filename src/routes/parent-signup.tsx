import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/parent-signup")({
  head: () => ({ meta: [{ title: "Parent / Guardian Access | JobShadow" }, { name: "robots", content: "noindex" }] }),
  component: ParentSignupPage,
});
function ParentSignupPage() {
  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">Parent / Guardian Access</h1>
      </div>
      <section className="bg-cta px-5 py-8 text-cta-foreground">
        <div className="mx-auto max-w-7xl space-y-4">
          <p>Parent/guardian access requires a private invitation linked to the scholar. An email address alone cannot activate access.</p>
          <p>If you already have a Parent/Guardian account, sign in to review and sign your child's forms.</p>
          <div className="flex flex-wrap gap-5">
            <Link to="/auth" className="bg-teal px-6 py-2.5 text-sm font-bold text-teal-foreground">Sign In</Link>
            <Link to="/contact" className="text-sm font-bold underline">Contact Job Shadow</Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
