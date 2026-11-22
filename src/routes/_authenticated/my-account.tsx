import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/my-account")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (userId) {
      const [{ data: isAdmin }, { data: isParent }, { data: isMentor }, { data: isHrAdmin }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "parent" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "mentor" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "hr_admin" }),
      ]);
      if (isAdmin) throw redirect({ to: "/admin" });
      if (isParent) throw redirect({ to: "/parent" });
      if (isMentor) throw redirect({ to: "/mentor" });
      if (isHrAdmin) throw redirect({ to: "/company-report" });
    }
    throw redirect({ to: "/profile", search: { tab: "bookings", entry: "workflow" } });
  },
});
