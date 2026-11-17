import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Facebook, Instagram } from "lucide-react";
import { BrandLogo, HeaderLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SupportChatWidget } from "@/components/SupportChatWidget";

export const SITE_NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/real-stories", label: "Real Stories" },
  { to: "/how-to", label: "How To" },
  { to: "/send-to-a-friend", label: "Send to a Friend" },
  { to: "/roles", label: "Careers" },
  { to: "/contact", label: "Contact Us" },
] as const;

export function useSiteSession() {
  return useSession();
}

function useSession() {
  return useQuery({
    queryKey: ["site-session"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { user: null, isAdmin: false, roles: [] as string[], avatarUrl: null as string | null, displayName: null as string | null };
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const { data: profile } = await supabase.from("profiles").select("avatar_path, display_name").eq("user_id", u.user.id).maybeSingle();
      const avatarUrl = profile?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;
      const roleNames = (roles ?? []).map((r) => r.role);
      return { user: u.user, isAdmin: roleNames.includes("admin"), roles: roleNames, avatarUrl, displayName: profile?.display_name ?? null };
    },
  });
}

const SOCIAL = [
  { href: "https://www.facebook.com/JobShadowBookings", icon: Facebook, label: "Facebook" },
  { href: "https://www.instagram.com/jobshadowbookings", icon: Instagram, label: "Instagram" },
];

function AccountMenu({ displayName, avatarUrl, isAdmin, logout }: { displayName: string; avatarUrl: string | null; isAdmin: boolean; logout: () => void }) {
  return <DropdownMenu>
    <DropdownMenuTrigger aria-label="Open account menu" className="rounded-full transition hover:ring-2 hover:ring-primary-foreground/40">
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground/20 text-xs uppercase">{displayName.slice(0, 1)}</span>}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
      <DropdownMenuLabel className="max-w-xs break-words">{displayName}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
      {isAdmin && <DropdownMenuItem asChild><Link to="/admin">Admin Portal</Link></DropdownMenuItem>}
      <DropdownMenuItem asChild><Link to="/mentor">Host Portal</Link></DropdownMenuItem>
      <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

export function SiteAccountMenu() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  if (!session?.user) return null;
  const name = session.displayName || (session.user.user_metadata?.["name"] as string | undefined) || session.user.email || "Account";
  return <AccountMenu displayName={name} avatarUrl={session.avatarUrl} isAdmin={session.isAdmin} logout={() => { void supabase.auth.signOut().then(() => navigate({ to: "/" })); }} />;
}

/** The full public-site header (logo, nav, social icons, account menu) — shared verbatim by
 * SiteLayout and the Admin/Host Portal shells, so those "look and feel" the same as every
 * other screen instead of reimplementing a slimmer version that drifts out of sync. */
export function SiteHeader({ headerLogo }: { headerLogo?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const isAdmin = session?.isAdmin ?? false;
  const displayName = session?.displayName || (user?.user_metadata?.["name"] as string | undefined) || user?.email || "Account";
  const avatarUrl = session?.avatarUrl ?? null;

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 bg-brand-deep text-primary-foreground shadow-warm">
      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-6 px-5 lg:justify-between">
        <Link to="/" aria-label="JobShadow home" className={`flex shrink-0 items-end ${headerLogo ? "h-24 lg:h-28" : "h-28 lg:h-32"}`}>
          {headerLogo ?? <HeaderLogo className="h-24 w-auto lg:h-28" />}
        </Link>
        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-4 lg:ml-auto lg:flex">
          {SITE_NAV.map((n) => (
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
          <div className="ml-2 flex gap-2">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground text-primary transition hover:bg-accent">
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          {user && <AccountMenu displayName={displayName} avatarUrl={avatarUrl} isAdmin={isAdmin} logout={logout} />}
        </nav>
        <div className="absolute right-5 flex items-center gap-3 lg:hidden">{user && <AccountMenu displayName={displayName} avatarUrl={avatarUrl} isAdmin={isAdmin} logout={logout} />}<button className="rounded p-2" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
      </div>
      {open && (
        <nav className="flex flex-col gap-3 border-t border-primary-foreground/20 px-5 py-4 font-semibold lg:hidden">
          {SITE_NAV.map((n) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>{n.label}</Link>)}
        </nav>
      )}
    </header>
  );
}

export function SiteLayout({ children, headerLogo, className = "" }: { children: ReactNode; headerLogo?: ReactNode; className?: string }) {
  const { data: session } = useSession();
  const isAdmin = session?.isAdmin ?? false;

  return (
    <div className={`flex min-h-screen flex-col ${className}`}>
      <SiteHeader headerLogo={headerLogo} />
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="bg-brand-deep text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="max-w-sm font-display text-lg leading-snug">Be sure about the career and life you choose with Job Shadow.</p>
            <a href="mailto:info@jobshadow.co.za" className="mt-1 inline-block text-sm font-bold text-accent hover:underline">info@jobshadow.co.za</a>
            <div className="mt-2 flex gap-2">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground text-primary hover:bg-accent">
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <Link to="/share-experience" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">Share your experience with us</Link>
          </div>
          <div className="text-sm">
            <p className="font-display text-base text-accent">Explore</p>
            <ul className="mt-1 space-y-0.5 opacity-90">
              <li><Link to="/roles">Careers</Link></li>
              <li><Link to="/auth">Book a Job Shadow</Link></li>
              <li><Link to="/how-to">How To</Link></li>
              <li><Link to="/send-to-a-friend">Send to a Friend</Link></li>
              <li><Link to="/real-stories">Real Stories</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-display text-base text-accent">Get involved</p>
            <ul className="mt-1 space-y-0.5 opacity-90">
              <li><Link to="/contact">Sponsor a learner</Link></li>
              <li><Link to="/contact">Hosting contact</Link></li>
              <li><Link to="/contact">School contact</Link></li>
              <li><Link to="/partners">Partner with us</Link></li>
            </ul>
          </div>
        </div>
        <div>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-2">
            <p className="text-xs opacity-80">© JobShadow {new Date().getFullYear()}</p>
            <BrandLogo loading="lazy" className="h-12 w-12" />
          </div>
        </div>
      </footer>
      <SupportChatWidget viewerRole={isAdmin ? "admin" : session?.roles?.[0]} />
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
