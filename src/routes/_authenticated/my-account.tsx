import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isParentSwitchPersona } from "@/lib/dev-personas";

export const Route = createFileRoute("/_authenticated/my-account")({
  validateSearch: (s: Record<string, unknown>): { view?: "profile" | undefined } => ({
    view: s["view"] === "profile" ? "profile" : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (userId) {
      const [
        { data: isAdmin },
        { data: isParent },
        { data: isMentor },
        { data: isHrAdmin },
        { data: isSchool },
      ] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "parent" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "mentor" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "hr_admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "school" }),
      ]);
      if (isAdmin)
        throw redirect({
          to: "/admin",
          search: search.view === "profile" ? { section: "profile" } : {},
        });
      if (isParent && isParentSwitchPersona(userId, u.user?.email))
        throw redirect({ to: "/parent" });
      if (isHrAdmin)
        throw redirect({
          to: "/company-report",
          search: search.view === "profile" ? { section: "profile" } : {},
        });
      if (isMentor)
        throw redirect({
          to: "/mentor",
          search: search.view === "profile" ? { section: "profile" } : {},
        });
      if (isSchool)
        throw redirect({
          to: "/school",
          search: search.view === "profile" ? { section: "profile" } : {},
        });
      if (isParent) throw redirect({ to: "/parent" });
    }
    throw redirect({
      to: "/profile",
      search:
        search.view === "profile" ? { tab: "profile" } : { tab: "bookings", entry: "workflow" },
    });
  },
});
