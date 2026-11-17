import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile Settings | JobShadow" },
      { name: "description", content: "Manage your JobShadow profile photo and display name." },
      { property: "og:title", content: "Profile Settings | JobShadow" },
      { property: "og:description", content: "Manage your JobShadow profile photo and display name." },
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
  const qc = useQueryClient();
  const { data: user } = useUser();
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const displayName = name ?? profile.data?.display_name ?? "";
  const avatarUrl = profile.data?.avatar_path ? supabase.storage.from("avatars").getPublicUrl(profile.data.avatar_path).data.publicUrl : null;

  async function uploadAvatar(file: File) {
    if (!user) return;
    setBusy(true);
    setErr(null);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
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
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, display_name: displayName.trim() || null, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    qc.invalidateQueries({ queryKey: ["site-session"] });
  }

  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-5xl text-xl font-bold md:text-2xl">Profile Settings</h1>
      </div>
      <section className="mx-auto max-w-5xl space-y-8 px-5 py-8">
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
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={busy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); }}
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">PNG, JPG or WebP, up to 5MB.</p>
          </div>
        </div>

        <div className="max-w-sm">
          <label className="block text-sm font-semibold">
            Display name
            <input
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              placeholder={user?.email ?? ""}
              className="mt-1 w-full border-b border-foreground/30 bg-transparent px-1 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <button onClick={saveName} disabled={busy} className="mt-4 rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50">
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </section>
    </SiteLayout>
  );
}
