import { RoleNavigation, portalNavigationKind } from "@/components/RoleNavigation";
import { NotificationInbox } from "@/components/NotificationInbox";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu, X, Facebook, Instagram } from "lucide-react";
import { HeaderLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { switchDevPersona } from "@/lib/dev-account-switch.functions";
import { DEV_PERSONAS, isSwitchPersona } from "@/lib/dev-personas";

export const SITE_NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/real-stories", label: "Stories" },
  { to: "/how-to", label: "How To" },
  { to: "/roles", label: "Careers" },
  { to: "/send-to-a-friend", label: "Share" },
  { to: "/contact", label: "Contact" },
] as const;

export function useSiteSession() {
  return useSession();
}

function useSession() {
  return useQuery({
    queryKey: ["site-session"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user)
        return {
          user: null,
          isAdmin: false,
          roles: [] as string[],
          avatarUrl: null as string | null,
          displayName: null as string | null,
        };
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_path, display_name")
        .eq("user_id", u.user.id)
        .maybeSingle();
      const avatarUrl = profile?.avatar_path
        ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
        : null;
      const roleNames = (roles ?? []).map((r) => r.role);
      return {
        user: u.user,
        isAdmin: roleNames.includes("admin"),
        roles: roleNames,
        avatarUrl,
        displayName: profile?.display_name ?? null,
      };
    },
  });
}

const SOCIAL = [
  { href: "https://www.facebook.com/JobShadowBookings", icon: Facebook, label: "Facebook" },
  { href: "https://www.instagram.com/jobshadowbookings", icon: Instagram, label: "Instagram" },
];

function DevAccountSwitcher() {
  const bootstrap = useServerFn(switchDevPersona);
  const qc = useQueryClient();
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  async function switchTo(email: string) {
    setSwitching(email);
    setSwitchError(null);
    try {
      const session = await bootstrap({ data: { email } });
      const { error } = await supabase.auth.setSession(session);
      if (error) throw error;
      qc.clear();
      window.location.href = "/";
    } catch {
      setSwitchError("Could not switch profiles. Please try again.");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Switch profile
      </DropdownMenuLabel>
      {switchError && (
        <p role="alert" className="max-w-xs px-2 py-1 text-xs text-destructive">
          {switchError}
        </p>
      )}
      {DEV_PERSONAS.map((p) => (
        <DropdownMenuItem
          key={p.email}
          disabled={switching !== null}
          onClick={() => void switchTo(p.email)}
        >
          {switching === p.email ? "Switching…" : p.label}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function WalletBadge({ userId }: { userId: string }) {
  const { data: balance } = useQuery({
    queryKey: ["wallet-balance", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_wallet_balance");
      if (error) throw error;
      return data ?? 0;
    },
  });
  if (!balance) return null;
  return (
    <span
      title="Wallet balance from approved refunds - applied automatically to your next booking"
      className="flex items-center gap-1 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold"
    >
      R{Number(balance).toFixed(2)}
    </span>
  );
}

function AccountMenu({
  displayName,
  avatarUrl,
  isAdmin,
  roles,
  email,
  userId,
  logout,
}: {
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  roles: string[];
  email: string | null;
  userId: string;
  logout: () => void;
}) {
  const canSwitchProfiles = isSwitchPersona(userId, email);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="rounded-full transition hover:ring-2 hover:ring-primary-foreground/40"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground/20 text-xs uppercase">
            {displayName.slice(0, 1)}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="max-w-xs break-words">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/my-account">Profile</Link>
        </DropdownMenuItem>
        {(isAdmin || roles.some((role) => ["mentor", "hr_admin", "school"].includes(role))) && (
          <DropdownMenuItem asChild>
            <Link to="/my-account">Admin</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
        {canSwitchProfiles && <DevAccountSwitcher />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteAccountMenu() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  if (!session?.user) return null;
  const name =
    session.displayName ||
    (session.user.user_metadata?.["name"] as string | undefined) ||
    session.user.email ||
    "Account";
  return (
    <AccountMenu
      userId={session!.user!.id}
      displayName={name}
      avatarUrl={session.avatarUrl}
      isAdmin={session.isAdmin}
      roles={session.roles}
      email={session.user.email ?? null}
      logout={() => {
        void supabase.auth.signOut().then(() => navigate({ to: "/" }));
      }}
    />
  );
}

/** The full public-site header (logo, nav, social icons, account menu) — shared verbatim by
 * SiteLayout and the Admin/Mentor Portal shells, so those "look and feel" the same as every
 * other screen instead of reimplementing a slimmer version that drifts out of sync. */
export function SiteHeader({
  headerLogo,
  fullWidth,
}: {
  headerLogo?: ReactNode;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const isAdmin = session?.isAdmin ?? false;
  const roles = session?.roles ?? [];
  const displayName =
    session?.displayName ||
    (user?.user_metadata?.["name"] as string | undefined) ||
    user?.email ||
    "Account";
  const avatarUrl = session?.avatarUrl ?? null;

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 bg-brand-deep text-primary-foreground shadow-warm">
      <div
        className={`relative flex items-center justify-center gap-6 px-5 lg:justify-between ${fullWidth ? "" : "mx-auto max-w-7xl"}`}
      >
        <Link
          to="/"
          aria-label="JobShadow home"
          className={`flex shrink-0 items-end ${headerLogo ? "h-24 lg:h-28" : "h-28 lg:h-32"}`}
        >
          {headerLogo ?? <HeaderLogo className="h-24 w-auto lg:h-28" />}
        </Link>
        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-[19.36px] lg:ml-auto lg:flex">
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
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground text-primary transition hover:bg-accent"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
            {user && <NotificationInbox userId={user.id} />}
          </div>
          {user && roles.includes("user") && <WalletBadge userId={user.id} />}
          {user && (
            <AccountMenu
              userId={user.id}
              displayName={displayName}
              avatarUrl={avatarUrl}
              isAdmin={isAdmin}
              roles={roles}
              email={user.email ?? null}
              logout={logout}
            />
          )}
        </nav>
        <div className="absolute right-5 flex items-center gap-3 lg:hidden">
          {user && <NotificationInbox userId={user.id} />}
          {user && roles.includes("user") && <WalletBadge userId={user.id} />}
          {user && (
            <AccountMenu
              userId={user.id}
              displayName={displayName}
              avatarUrl={avatarUrl}
              isAdmin={isAdmin}
              roles={roles}
              email={user.email ?? null}
              logout={logout}
            />
          )}
          <button
            className="rounded p-2"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-3 border-t border-primary-foreground/20 px-5 py-4 font-semibold lg:hidden">
          {SITE_NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteLayout({
  children,
  headerLogo,
  className = "",
}: {
  children: ReactNode;
  headerLogo?: ReactNode;
  className?: string;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.isAdmin ?? false;
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hasRoleNavigation = !!portalNavigationKind(session?.roles ?? [], pathname);

  return (
    <div
      className={`flex min-h-screen flex-col ${className} ${hasRoleNavigation ? "has-role-navigation" : ""}`}
    >
      <SiteHeader headerLogo={headerLogo} />
      <div className="flex min-w-0 flex-1">
        <RoleNavigation roles={session?.roles ?? []} pathname={pathname} />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
      <SiteFooter />
      <SupportChatWidget viewerRole={isAdmin ? "admin" : session?.roles?.[0]} />
    </div>
  );
}

/** The site footer, shared verbatim with SiteHeader by Admin/Mentor Portal. */
export function SiteFooter() {
  const { data: session } = useSession();
  return (
    <footer className="bg-brand-deep text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="max-w-sm font-display text-lg leading-snug">
            Be sure about the career and life you choose with Job Shadow.
          </p>
          <a
            href="mailto:info@jobshadow.co.za"
            className="mt-1 inline-block text-sm font-bold text-accent hover:underline"
          >
            info@jobshadow.co.za
          </a>
          <div className="mt-2 flex gap-2">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground text-primary hover:bg-accent"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div className="text-sm">
          <p className="font-display text-base text-accent">Explore</p>
          <ul className="mt-1 space-y-0.5 opacity-90">
            <li>
              <Link to="/roles">Sectors and Careers</Link>
            </li>
            <li>
              {session?.user ? (
                <Link to="/profile" search={{ tab: "bookings", step: "profile" }}>
                  Book a Job Shadow
                </Link>
              ) : (
                <Link to="/auth" search={{ go: "studentProfile" }}>
                  Book a Job Shadow
                </Link>
              )}
            </li>
            <li>
              <Link to="/how-to">How To</Link>
            </li>
            <li>
              <Link to="/send-to-a-friend">Share</Link>
            </li>
            <li>
              <Link to="/real-stories">Real Stories</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-display text-base text-accent">Get involved</p>
          <ul className="mt-1 space-y-0.5 opacity-90">
            <li>
              <Link to="/contact">Hosting contact</Link>
            </li>
            <li>
              <Link to="/contact">School contact</Link>
            </li>
            <li>
              <Link to="/partners">Partner with us</Link>
            </li>
          </ul>
        </div>
      </div>
      <div>
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-2">
          <p className="text-xs opacity-80">© JobShadow {new Date().getFullYear()}</p>
          <Link
            to="/legal"
            className="text-xs underline opacity-80 hover:opacity-100 sm:absolute sm:left-1/2 sm:-translate-x-1/2"
          >
            Legal, Privacy &amp; Consent
          </Link>
        </div>
      </div>
    </footer>
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
