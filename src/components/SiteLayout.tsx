import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Facebook, Instagram, ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/real-stories", label: "Real stories" },
  { to: "/how-to", label: "How To" },
  { to: "/send-to-a-friend", label: "Send to a Friend" },
  { to: "/roles", label: "Job Roles" },
  { to: "/contact", label: "Contact Us" },
] as const;

const GUEST_NAV = [
  { to: "/register", label: "Register" },
  { to: "/auth", label: "Log in" },
] as const;

const ADMIN_NAV = [
  { to: "/admin", label: "Companies" },
  { to: "/admin", label: "Vouchers" },
  { to: "/admin", label: "Applications" },
] as const;

function useSession() {
  return useQuery({
    queryKey: ["site-session"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { user: null, isAdmin: false };
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
      return { user: u.user, isAdmin: (data?.length ?? 0) > 0 };
    },
  });
}

const SOCIAL = [
  { href: "https://www.facebook.com/JobShadowBookings", icon: Facebook, label: "Facebook" },
  { href: "https://www.instagram.com/jobshadowbookings", icon: Instagram, label: "Instagram" },
];

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const isAdmin = session?.isAdmin ?? false;
  const displayName = (user?.user_metadata?.["name"] as string | undefined) || user?.email || "Account";

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-brand-deep text-primary-foreground shadow-warm">
        <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-6 px-5 xl:justify-between">
          <Link to="/" aria-label="JobShadow home" className="shrink-0 xl:order-2">
            <BrandLogo className="h-24 w-24 xl:h-28 xl:w-28" />
          </Link>
          <nav className="hidden items-center gap-4 xl:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="border-b-4 border-transparent py-2 text-sm font-semibold transition hover:border-accent"
                activeProps={{ className: "border-cta" }}
              >
                {n.label}
              </Link>
            ))}
            {isAdmin && ADMIN_NAV.map((n) => (
              <Link key={n.label} to={n.to} className="border-b-4 border-transparent py-2 text-sm font-semibold transition hover:border-accent">{n.label}</Link>
            ))}
            {!user && GUEST_NAV.map((n) => (
              <Link key={n.to} to={n.to} className="border-b-4 border-transparent py-2 text-sm font-semibold transition hover:border-accent" activeProps={{ className: "border-cta" }}>{n.label}</Link>
            ))}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-semibold">
                  <span className="max-w-48 truncate">{displayName}</span> <ChevronDown className="h-4 w-4 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link to="/my-account">My Account</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/my-account">My Bookings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/mentor">Mentor Portal</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="ml-2 flex gap-2">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground text-primary transition hover:bg-accent">
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </nav>
          <button className="absolute right-5 rounded p-2 xl:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="flex flex-col gap-3 border-t border-primary-foreground/20 px-5 py-4 font-semibold xl:hidden">
            {NAV.map((n) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>{n.label}</Link>)}
            {isAdmin && ADMIN_NAV.map((n) => <Link key={n.label} to={n.to} onClick={() => setOpen(false)}>{n.label}</Link>)}
            {!user && GUEST_NAV.map((n) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>{n.label}</Link>)}
            {user && (
              <>
                <Link to="/my-account" onClick={() => setOpen(false)}>My Account</Link>
                <Link to="/my-account" onClick={() => setOpen(false)}>My Bookings</Link>
                <Link to="/mentor" onClick={() => setOpen(false)}>Mentor Portal</Link>
                <button className="text-left" onClick={() => { setOpen(false); void logout(); }}>Logout</button>
              </>
            )}
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-brand-deep text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="max-w-sm font-display text-2xl leading-snug">Be sure about the career and life you choose with Job Shadow.</p>
            <a href="mailto:info@jobshadow.co.za" className="mt-2 inline-block text-sm font-bold text-accent hover:underline">info@jobshadow.co.za</a>
            <div className="mt-4 flex gap-2">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground text-primary hover:bg-accent">
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div className="text-sm">
            <p className="font-display text-lg text-accent">Explore</p>
            <ul className="mt-2 space-y-1 opacity-90">
              <li><Link to="/roles">Job Roles</Link></li>
              <li><Link to="/auth">Book a Job Shadow</Link></li>
              <li><Link to="/how-to">How To</Link></li>
              <li><Link to="/send-to-a-friend">Send to a Friend</Link></li>
              <li><Link to="/real-stories">Real stories</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-display text-lg text-accent">Get involved</p>
            <ul className="mt-2 space-y-1 opacity-90">
              <li><Link to="/contact">Sponsor a learner</Link></li>
              <li><Link to="/contact">Hosting contact</Link></li>
              <li><Link to="/contact">School contact</Link></li>
              <li><Link to="/partners">Partner with us</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3">
            <p className="text-xs opacity-80">© JobShadow {new Date().getFullYear()}</p>
            <BrandLogo loading="lazy" className="h-24 w-24" />
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PageHero({ title, sub }: { title: string; sub?: string }) {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-brand-deep [clip-path:polygon(4%_0,100%_30%,100%_100%,6%_100%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-14">
        <h1 className="font-display text-5xl uppercase md:text-6xl">{title}</h1>
        {sub && <p className="mt-3 max-w-2xl text-lg opacity-90">{sub}</p>}
      </div>
    </section>
  );
}
