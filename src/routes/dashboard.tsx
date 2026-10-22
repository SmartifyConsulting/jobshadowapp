import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { useApplications } from "@/lib/applications";
import { ROLES } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Bookings — JobShadow" },
      { name: "description", content: "Track your job shadow applications from submission to completion." },
      { property: "og:title", content: "Your Bookings — JobShadow" },
      { property: "og:description", content: "Track your job shadow application status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const apps = useApplications();
  const sectorFor = (role: string) => ROLES.find((r) => r.title === role)?.field ?? "—";

  return (
    <SiteLayout>
      <section className="bg-primary px-5 py-6 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Your Bookings</h1>
          <Link to="/apply" className="bg-cta px-5 py-3 text-sm font-bold uppercase tracking-wide text-cta-foreground">Book a Job Shadow</Link>
        </div>
      </section>
      <section className="overflow-x-auto bg-background px-5 py-6">
        <table className="mx-auto w-full max-w-7xl min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Application ID</th>
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Career</th>
              <th className="py-2 pr-4">Sector</th>
              <th className="py-2 pr-4">Dates</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-b border-border">
                <td className="py-3 pr-4">{a.id}</td>
                <td className="py-3 pr-4">{a.host ?? "Job Shadow Pty Ltd"}</td>
                <td className="py-3 pr-4">{a.shadow.role}</td>
                <td className="py-3 pr-4">{sectorFor(a.shadow.role)}</td>
                <td className="py-3 pr-4">{a.date ?? "—"}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="bg-cta/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground">View</button>
                    <button className="bg-cta px-4 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground">Upload Indemnity</button>
                    <button className="bg-cta px-4 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground">Download Indemnity</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </SiteLayout>
  );
}
