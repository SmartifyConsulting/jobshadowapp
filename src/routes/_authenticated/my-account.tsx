import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/my-account")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (userId) {
      const [{ data: isAdmin }, { data: isParent }, { data: isMentor }, { data: isHrAdmin }, { data: isSchool }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "parent" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "mentor" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "hr_admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "school" }),
      ]);
      if (isAdmin) throw redirect({ to: "/admin" });
      if (isHrAdmin) throw redirect({ to: "/company-report" });
      if (isMentor) throw redirect({ to: "/mentor" });
      if (isSchool) throw redirect({ to: "/school" });
      if (isParent) throw redirect({ to: "/parent" });
    }
    throw redirect({ to: "/profile", search: { tab: "bookings", entry: "workflow" } });
  },
});
