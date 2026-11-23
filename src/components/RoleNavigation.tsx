import {
  ClipboardList,
  Users,
  Briefcase,
  CalendarDays,
  MessageSquare,
  Settings,
  UserCircle,
  FileText,
  Archive,
  Scale,
} from "lucide-react";
export const ADMIN_NAV = [
  { key: "users", label: "Users", icon: Users },
  { key: "careers", label: "Sectors and Careers", icon: Briefcase },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "settings", label: "Booking Settings", icon: Settings },
  { key: "emails", label: "Email Archive", icon: Archive },
  { key: "legal", label: "Legal Content", icon: Scale },
];
const MENTOR_NAV = [
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "shadows", label: "Job Shadows", icon: Briefcase },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "profile", label: "Profile", icon: UserCircle },
  { key: "settings", label: "Settings", icon: Settings },
];
export function RoleNavigation({ roles, pathname }: { roles: string[]; pathname: string }) {
  const kind = roles.includes("admin")
    ? "admin"
    : roles.includes("hr_admin")
      ? "company"
      : roles.includes("mentor")
        ? "mentor"
        : roles.includes("school")
          ? "school"
          : null;
  if (!kind || ["/admin", "/mentor", "/school", "/company-report"].includes(pathname)) return null;
  const items =
    kind === "admin"
      ? ADMIN_NAV.map((item) => ({ ...item, href: `/admin?section=${item.key}` }))
      : kind === "mentor"
        ? MENTOR_NAV.map((item) => ({ ...item, href: `/mentor?section=${item.key}` }))
        : kind === "company"
          ? [
              {
                key: "mentors",
                label: "Mentors",
                icon: Users,
                href: "/company-report?section=mentors",
              },
              {
                key: "csi",
                label: "CSI",
                icon: ClipboardList,
                href: "/company-report?section=csi",
              },
              { key: "profile", label: "Profile", icon: UserCircle, href: "/profile?tab=profile" },
            ]
          : [
              {
                key: "overview",
                label: "Overview",
                icon: ClipboardList,
                href: "/school?section=overview",
              },
              {
                key: "profile",
                label: "Profile",
                icon: UserCircle,
                href: "/school?section=profile",
              },
              {
                key: "messages",
                label: "Messages",
                icon: MessageSquare,
                href: "/school?section=messages",
              },
            ];
  return (
    <aside
      className={`w-44 shrink-0 shadow-warm sm:w-52 lg:w-60 ${kind === "admin" ? "bg-accent text-accent-foreground" : "bg-cta text-cta-foreground"}`}
    >
      <div className="sticky top-0 max-h-screen overflow-y-auto">
        <p className="px-5 pb-3 pt-6 text-xs font-bold uppercase tracking-widest">
          {kind === "admin"
            ? "Admin"
            : kind === "mentor"
              ? "Mentor"
              : kind === "company"
                ? "Company"
                : "School"}
        </p>
        <nav aria-label={`${kind} navigation`} className="space-y-1 px-3 pb-6">
          {items.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="flex items-center gap-3 rounded border-l-2 border-transparent px-3 py-2.5 text-sm font-medium hover:bg-primary/5"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
