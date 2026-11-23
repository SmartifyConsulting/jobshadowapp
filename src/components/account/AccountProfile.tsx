import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImageCropModal } from "@/components/ImageCropModal";
import { PersonNameFields, joinPersonName } from "@/components/PersonNameFields";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserRound, Camera } from "lucide-react";

export function useOwnIdentity(enabled = true) {
  const user = useQuery({
    queryKey: ["me"],
    enabled,
    queryFn: async () => {
      const result = await supabase.auth.getUser();
      if (result.error) throw result.error;
      return result.data.user;
    },
  });
  const profile = useQuery({
    queryKey: ["profile", user.data?.id],
    enabled: enabled && !!user.data,
    staleTime: 15_000,
    queryFn: async () => {
      const result = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.data!.id)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  return { user, profile, pending: user.isPending || (!!user.data && profile.isPending) };
}

/** Uses the existing own-account update and avatar storage paths. No role or permission edits. */
export function AccountPersonalDetails() {
  const { user, profile, pending } = useOwnIdentity();
  const qc = useQueryClient();
  const [names, setNames] = useState<{ first: string; last: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const legacy = (profile.data?.display_name ?? "").trim().split(/\s+/);
  const first = names?.first ?? profile.data?.first_name ?? legacy[0] ?? "";
  const last = names?.last ?? profile.data?.last_name ?? legacy.slice(1).join(" ");
  const avatar = profile.data?.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.data.avatar_path).data.publicUrl
    : null;
  async function save(avatarBlob?: Blob) {
    if (!user.data || busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      let path = profile.data?.avatar_path ?? null;
      if (avatarBlob) {
        path = `${user.data.id}/${Date.now()}-avatar.jpg`;
        const uploaded = await supabase.storage
          .from("avatars")
          .upload(path, avatarBlob, { upsert: true, contentType: "image/jpeg" });
        if (uploaded.error) throw uploaded.error;
      }
      const result = await supabase.from("profiles").upsert({
        user_id: user.data.id,
        first_name: first.trim(),
        last_name: last.trim(),
        display_name: joinPersonName(first, last),
        ...(avatarBlob ? { avatar_path: path } : {}),
        updated_at: new Date().toISOString(),
      });
      if (result.error) throw result.error;
      setSaved(true);
      await qc.invalidateQueries({ queryKey: ["profile", user.data.id] });
      void qc.invalidateQueries({ queryKey: ["site-session"] });
      void qc.invalidateQueries({ queryKey: ["school-account", user.data.id] });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your details could not be saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (pending) return <p role="status">Loading your details…</p>;
  if (user.error || profile.error || !user.data)
    return <p role="alert">Your details could not be loaded. Please refresh before editing.</p>;
  return (
    <div className="space-y-4">
      <label
        className="relative grid h-20 w-20 cursor-pointer place-items-center rounded-full border border-input bg-muted"
        style={{ width: 80, height: 80 }}
      >
        <span className="absolute inset-0 grid place-items-center overflow-hidden rounded-full">
          {avatar ? (
            <img
              src={avatar}
              alt="Profile photo"
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-9 w-9" />
          )}
        </span>
        <Camera className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-background p-1" />
        <input
          type="file"
          accept="image/*"
          aria-label="Change profile photo"
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            e.target.value = "";
            if (selected) setFile(selected);
          }}
        />
      </label>
      <PersonNameFields
        id="own-account-name"
        label="Name"
        firstName={first}
        lastName={last}
        originalName={profile.data?.display_name ?? ""}
        disabled={busy}
        onChange={(first, last) => {
          setNames({ first, last });
          setSaved(false);
        }}
      />
      <div className="text-sm">
        <span className="block text-xs text-muted-foreground">Email Address</span>
        {user.data.email ?? "Not recorded"}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Saving…" : saved ? "Saved" : "Save Personal Details"}
      </button>
      {file && (
        <ImageCropModal
          file={file}
          onCancel={() => setFile(null)}
          onSave={(blob) => {
            setFile(null);
            void save(blob);
          }}
        />
      )}
    </div>
  );
}

export function AccountProfile() {
  const { user } = useOwnIdentity();
  return (
    <section className="space-y-4 bg-ivory p-4 text-foreground">
      <h1 className="font-display text-2xl">My Profile</h1>
      <Tabs defaultValue="personal">
        <TabsList
          className="flex h-auto w-full flex-wrap justify-start"
          aria-label="Profile details"
        >
          <TabsTrigger value="personal">Personal Details</TabsTrigger>
          <TabsTrigger value="secondary">Secondary Information</TabsTrigger>
        </TabsList>
        <TabsContent forceMount value="personal" className="mt-4 data-[state=inactive]:hidden">
          <AccountPersonalDetails />
        </TabsContent>
        <TabsContent value="secondary" className="mt-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Email Address</dt>
              <dd>{user.data?.email ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Account Created</dt>
              <dd>
                {user.data?.created_at
                  ? new Date(user.data.created_at).toLocaleDateString()
                  : "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last Sign-In</dt>
              <dd>
                {user.data?.last_sign_in_at
                  ? new Date(user.data.last_sign_in_at).toLocaleString()
                  : "Unknown"}
              </dd>
            </div>
          </dl>
        </TabsContent>
      </Tabs>
    </section>
  );
}
