import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, IdCard, CalendarCheck } from "lucide-react";
import { AccountPanel } from "@/components/account/AccountSections";
import { ImageCropModal } from "@/components/ImageCropModal";

type Tab = "profile" | "account" | "bookings";
export const Route = createFileRoute("/_authenticated/profile")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => ({ tab: ["profile", "account", "bookings"].includes(s["tab"] as string) ? (s["tab"] as Tab) : undefined }),
  head: () => ({
    meta: [
      { title: "Profile | JobShadow" },
      { name: "description", content: "Your JobShadow profile, scholar details and bookings." },
      { property: "og:title", content: "Profile | JobShadow" },
      { property: "og:description", content: "Your JobShadow profile, scholar details and bookings." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileSettings,
});

function useUser() {
  return useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
}

function ProfileSettings() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { data: user } = useUser();
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const [first, setFirst] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const splitName = (profile.data?.display_name ?? "").trim().split(/\s+/);
  const firstName = first ?? profile.data?.first_name ?? (splitName.length > 1 ? splitName.slice(0, -1).join(" ") : splitName[0] ?? "");
  const lastName = last ?? profile.data?.last_name ?? (splitName.length > 1 ? splitName[splitName.length - 1] ?? "" : "");
  const displayName = `${firstName} ${lastName}`.trim();
  const avatarUrl = profile.data?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.data.avatar_path).data.publicUrl : null;

  async function uploadAvatar(blob: Blob) {
    if (!user) return;
    setBusy(true);
    setErr(null);
    const path = `${user.id}/${Date.now()}-avatar.jpg`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) {
      setBusy(false);
      return setErr(upErr.message);
    }
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, avatar_path: path, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setErr(error.message);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    qc.invalidateQueries({ queryKey: ["site-session"] });
  }

  async function saveName() {
    if (!user) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    if (!firstName.trim() || !lastName.trim()) { setBusy(false); return setErr("Please enter your first name and last name."); }
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, first_name: firstName.trim(), last_name: lastName.trim(), display_name: displayName, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    qc.invalidateQueries({ queryKey: ["site-session"] });
  }

  return (
    <SiteLayout>
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl space-y-4 px-5 py-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-xs text-muted-foreground">Manage your details, scholar account and bookings.</p>
          </div>
          <Tabs value={tab ?? "profile"} onValueChange={(v) => navigate({ search: { tab: v as Tab }, replace: true })} className="w-full">
            <TabsList className="flex w-full flex-wrap justify-start rounded-lg bg-primary/90">
              <TabsTrigger value="profile" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-primary-foreground text-xs gap-1.5"><UserCircle className="h-3.5 w-3.5" />Profile</TabsTrigger>
              <TabsTrigger value="account" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-primary-foreground text-xs gap-1.5"><IdCard className="h-3.5 w-3.5" />My Account</TabsTrigger>
              <TabsTrigger value="bookings" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-primary-foreground text-xs gap-1.5"><CalendarCheck className="h-3.5 w-3.5" />My Bookings</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-4">
              <div className="rounded-xl border border-primary bg-card p-4 shadow-sm space-y-6">
                <div className="flex items-center gap-3"><UserCircle className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Profile</h2></div>

        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full bg-muted text-2xl font-semibold uppercase text-muted-foreground">
              {(displayName || user?.email || "?").slice(0, 1)}
            </div>
          )}
          <div>
            <label className="inline-block cursor-pointer rounded-full bg-cta px-5 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground">
              {busy ? "Uploading…" : "Change photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }}
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">Any image file, up to 5MB. You'll be able to crop and zoom before saving.</p>
          </div>
        </div>
        {cropFile && (
          <ImageCropModal
            file={cropFile}
            onCancel={() => setCropFile(null)}
            onSave={(blob) => { setCropFile(null); void uploadAvatar(blob); }}
          />
        )}

        <div className="w-full">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              First Name
              <input value={firstName} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" className="mt-1 w-full border-b border-foreground/30 bg-transparent px-1 py-2 text-sm outline-none focus:border-foreground" />
            </label>
            <label className="block text-sm font-semibold">
              Last Name
              <input value={lastName} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" className="mt-1 w-full border-b border-foreground/30 bg-transparent px-1 py-2 text-sm outline-none focus:border-foreground" />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Shown as: {displayName || "—"}</p>
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <button onClick={saveName} disabled={busy} className="mt-4 rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50">
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      
              </div>
            </TabsContent>
            <TabsContent value="account" className="mt-4">
              <div className="rounded-xl border border-primary bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-3"><IdCard className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">My Account</h2></div>
                <AccountPanel />
              </div>
            </TabsContent>
            <TabsContent value="bookings" className="mt-4 space-y-4">
              <div className="rounded-xl border border-primary bg-teal p-4 text-teal-foreground shadow-sm">
                <AccountPanel withBookings />
              </div>

            </TabsContent>
          </Tabs>
        </div>
      </section>
    </SiteLayout>
  );
}
