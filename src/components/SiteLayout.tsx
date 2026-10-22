import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/roles", label: "Explore careers" },
  { to: "/partners", label: "For schools & hosts" },
  { to: "/contact", label: "Contact" },
  { to: "/dashboard", label: "My applications" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">J</span>
            JobShadow
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-sm font-semibold text-foreground" }}>
                {n.label}
              </Link>
            ))}
            <Link to="/apply" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm transition hover:-translate-y-0.5">
              Apply now
            </Link>
          </nav>
          <button className="md:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="flex flex-col gap-3 border-t border-border px-5 py-4 md:hidden">
            {NAV.map((n) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>{n.label}</Link>)}
            <Link to="/apply" onClick={() => setOpen(false)} className="rounded-full bg-primary px-5 py-2 text-center font-semibold text-primary-foreground">Apply now</Link>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-secondary text-secondary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
          <div>
            <p className="font-display text-xl font-semibold">JobShadow</p>
            <p className="mt-2 text-sm opacity-80">Helping South African scholars see a career up close — before they choose what to study.</p>
          </div>
          <div className="text-sm opacity-90">
            <p className="font-semibold">Explore</p>
            <ul className="mt-2 space-y-1">
              <li><Link to="/roles">Job roles</Link></li>
              <li><Link to="/apply">Apply to shadow</Link></li>
              <li><Link to="/partners">Partner with us</Link></li>
            </ul>
          </div>
          <div className="text-sm opacity-90">
            <p className="font-semibold">Get in touch</p>
            <p className="mt-2">hello@jobshadow.co.za</p>
            <p>Johannesburg · Cape Town · Durban</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
