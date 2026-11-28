import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { ScreenHeading } from "@/components/ScreenHeading";
import { AccountPersonalDetails, useOwnIdentity } from "@/components/account/AccountProfile";
import { ProfileSummaryCard } from "@/components/account/ProfileSummaryCard";
import { ScholarSignupDate } from "@/components/account/PersonalOnboarding";
import { ParentDashboard, type ParentChild } from "@/components/account/ParentDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({ meta: [{ title: "Parent Profile | Job Shadow" }, { name: "robots", content: "noindex" }] }),
  component: ParentPortal,
});

function ParentPortal() {
  const identity = useOwnIdentity();
  const user = identity.user.data;
  const [tab, setTab] = useState("profile");
  const children = useQuery({
    queryKey: ["parent-children", user?.id], enabled: !!user,
    queryFn: async () => {
      const current = await supabase.auth.getUser();
      if (current.error || !current.data.user || current.data.user.id !== user!.id) throw new Error("Sign in to view your linked scholars.");
      const { data, error } = await supabase.rpc("get_parent_children");
      if (error) throw new Error(error.message);
      return ((data ?? []) as ParentChild[]).filter(child => child.scholar_user_id !== current.data.user!.id);
    },
  });
  const parent = identity.profile.data;
  const name = [parent?.first_name, parent?.last_name].filter(Boolean).join(" ") || parent?.display_name || "My Profile";
  const avatar = parent?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(parent.avatar_path).data.publicUrl : null;
  return <SiteLayout><ScreenHeading title="Profile" /><section className="flex-1 bg-[#F9DB01] px-5 py-8"><div className="mx-auto max-w-7xl space-y-4">
    {identity.pending ? <p role="status">Loading your profile…</p> : !user || identity.user.error || identity.profile.error ? <p role="alert">Your profile could not be loaded. Please sign in again.</p> : <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex w-full justify-start rounded-full bg-primary"><TabsTrigger value="profile" className="font-display text-sm font-black">Profile</TabsTrigger><TabsTrigger value="dashboard" className="font-display text-sm font-black">Dashboard</TabsTrigger></TabsList>
      <TabsContent value="profile" className="space-y-5">
        <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5"><ProfileSummaryCard name={name} avatarUrl={avatar} subtitle={user.email} framed={false} onPhoto={() => document.getElementById("parent-profile-photo")?.click()} /><AccountPersonalDetails hidePhoto photoInputId="parent-profile-photo" rowLayout /></div>
        <section aria-label="Linked Children" className="space-y-3"><h2 className="font-bold text-xl">My Children</h2>
          {children.data?.map(child => <article key={child.scholar_user_id} className="space-y-2 rounded-xl border bg-card p-4"><h3 className="font-bold text-lg text-teal">{child.full_name}</h3><ScholarSignupDate scholarId={child.scholar_user_id} /><p className="text-sm">School: {child.school || "Not recorded"}</p><button className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => setTab("dashboard")}>View Forms and History</button></article>)}
        </section>
      </TabsContent>
      <TabsContent value="dashboard"><ParentDashboard childrenList={children.data ?? []} user={user} /></TabsContent>
    </Tabs>}
    {children.isPending && user && <p role="status">Loading your linked scholars…</p>}
    {children.isError && <p role="alert">Your linked scholars could not be loaded. Please refresh.</p>}
    {children.data?.length === 0 && <p className="text-sm">No scholar is linked to your account yet.</p>}
  </div></section></SiteLayout>;
}
