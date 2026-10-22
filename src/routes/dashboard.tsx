import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
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

const INDEMNITY_KEY = "jobshadow.indemnity";
type IndemnityFile = { name: string; dataUrl: string };

function useIndemnityFiles() {
  const [files, setFiles] = useState<Record<string, IndemnityFile>>({});
  useEffect(() => {
    try { setFiles(JSON.parse(localStorage.getItem(INDEMNITY_KEY) || "{}")); } catch { /* ignore */ }
  }, []);
  function save(id: string, file: IndemnityFile) {
    const next = { ...files, [id]: file };
    setFiles(next);
    localStorage.setItem(INDEMNITY_KEY, JSON.stringify(next));
  }
  return { files, save };
}

function Dashboard() {
  const apps = useApplications();
  const sectorFor = (role: string) => ROLES.find((r) => r.title === role)?.field ?? "—";
  const { files: indemnity, save: saveIndemnity } = useIndemnityFiles();
  const [open, setOpen] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function pickFile(id: string) {
    fileInputs.current[id]?.click();
  }

  function onFile(id: string, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveIndemnity(id, { name: file.name, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function download(id: string) {
    const f = indemnity[id];
    if (!f) return;
    const a = document.createElement("a");
    a.href = f.dataUrl;
    a.download = f.name;
    a.click();
  }

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
              <Fragment key={a.id}>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4">{a.id}</td>
                  <td className="py-3 pr-4">{a.host ?? "Job Shadow Pty Ltd"}</td>
                  <td className="py-3 pr-4">{a.shadow.role}</td>
                  <td className="py-3 pr-4">{sectorFor(a.shadow.role)}</td>
                  <td className="py-3 pr-4">{a.date ?? "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setOpen(open === a.id ? null : a.id)} className="bg-cta/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground">View</button>
                      <input ref={(el) => { fileInputs.current[a.id] = el; }} type="file" accept="image/*,application/pdf,.doc,.docx" className="hidden" onChange={(e) => onFile(a.id, e.target.files?.[0])} />
                      <button onClick={() => pickFile(a.id)} className="bg-cta px-4 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground">Upload Indemnity</button>
                      <button onClick={() => download(a.id)} disabled={!indemnity[a.id]} className="bg-cta px-4 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50">Download Indemnity</button>
                    </div>
                  </td>
                </tr>
                {open === a.id && (
                  <tr className="border-b border-border bg-muted/40">
                    <td colSpan={6} className="px-4 py-4">
                      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                        <div><dt className="text-xs font-bold uppercase text-muted-foreground">Scholar</dt><dd>{a.scholar.fullName} · {a.scholar.grade} · {a.scholar.school}</dd></div>
                        <div><dt className="text-xs font-bold uppercase text-muted-foreground">Format</dt><dd>{a.shadow.format}</dd></div>
                        <div><dt className="text-xs font-bold uppercase text-muted-foreground">Status</dt><dd>{a.status}</dd></div>
                        <div><dt className="text-xs font-bold uppercase text-muted-foreground">Guardian</dt><dd>{a.guardian.name} · {a.guardian.phone}</dd></div>
                        <div><dt className="text-xs font-bold uppercase text-muted-foreground">Indemnity file</dt><dd>{indemnity[a.id]?.name ?? "Not uploaded"}</dd></div>
                        <div className="sm:col-span-3"><dt className="text-xs font-bold uppercase text-muted-foreground">Motivation</dt><dd>{a.motivation.why}</dd></div>
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>
    </SiteLayout>
  );
}
