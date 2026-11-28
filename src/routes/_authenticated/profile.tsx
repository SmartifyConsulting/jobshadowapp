import { ProfilePreview } from "@/components/account/ProfilePreview";
import { ScreenHeading } from "@/components/ScreenHeading";
import { ProfileSummaryCard } from "@/components/account/ProfileSummaryCard";
import { AccountProfile, useOwnIdentity } from "@/components/account/AccountProfile";
import { PortalLoading } from "@/components/PortalLoading";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, CalendarCheck } from "lucide-react";
import { AccountPanel, SCHOLAR_DETAIL_TABS } from "@/components/account/AccountSections";
import { ImageCropModal } from "@/components/ImageCropModal";
import { displayTime } from "@/lib/time-entry";

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending_approval: "Scheduled",
  awaiting_payment: "Scheduled",
  indemnity_required: "Scheduled",
  confirmed: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};
function bookingStatusLabel(booking: { status: string; shadow_date: string }) {
  if (booking.status === "completed") return "Completed";
  if (booking.status === "cancelled") return "Cancelled";
  if (booking.shadow_date === new Date().toISOString().slice(0, 10)) return "In Progress";
  return BOOKING_STATUS_LABEL[booking.status] ?? booking.status;
}
function MyBookingsList({ userId }: { userId: string }) {
  const bookings = useQuery({
    queryKey: ["my-bookings-list", userId],
    queryFn: async () => {
      const result = await supabase
        .from("bookings")
        .select("id,career,company,company_id,shadow_date,arrival_time,collection_time,status")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .order("shadow_date", { ascending: false });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const companyIds = [...new Set((bookings.data ?? []).map((b) => b.company_id))];
  const mentors = useQuery({
    queryKey: ["my-bookings-mentors", companyIds],
    enabled: companyIds.length > 0,
    queryFn: async () => {
      const result = await supabase
        .from("companies")
        .select("id,mentor_name,company")
        .in("id", companyIds);
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const mentorFor = (companyId: number) => mentors.data?.find((c) => c.id === companyId);
  return (
    <div className="space-y-3 p-4">
      <h2 className="font-display text-2xl text-teal-foreground">My Bookings</h2>
      {bookings.isPending && <p role="status">Loading your bookings…</p>}
      {bookings.isError && (
        <p role="alert" className="text-sm text-destructive">
          Your bookings could not be loaded.
        </p>
      )}
      {bookings.data?.length === 0 && (
        <p className="text-sm">
          No bookings yet. Head to Explore Careers to request your first job shadow.
        </p>
      )}
      {bookings.data?.map((b) => {
        const mentor = mentorFor(b.company_id);
        return (
          <div key={b.id} className="rounded-lg border border-border bg-card p-4 text-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{b.career || "Career not set"}</p>
                <p className="text-sm text-muted-foreground">
                  With {mentor?.mentor_name || mentor?.company || b.company || "your mentor"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {b.shadow_date}
                  {b.arrival_time &&
                    b.collection_time &&
                    ` · ${displayTime(b.arrival_time)} – ${displayTime(b.collection_time)}`}
                </p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {bookingStatusLabel(b)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Tab = "profile" | "bookings";
export const Route = createFileRoute("/_authenticated/profile")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: Tab | undefined; entry?: "workflow" | undefined; step?: string | undefined } => ({
    tab: ["profile", "account", "bookings"].includes(s["tab"] as string)
      ? s["tab"] === "account"
        ? "profile"
        : (s["tab"] as Tab)
      : undefined,
    step: [
      "profile",
      "careers",
      "request",
      "payment",
      "forms",
      "identity",
      "confirmation",
      "experience",
      "feedback",
    ].includes(String(s["step"]))
      ? String(s["step"])
      : undefined,
    entry: s["entry"] === "workflow" ? "workflow" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Profile | JobShadow" },
      { name: "description", content: "Your JobShadow profile, scholar details and bookings." },
      { property: "og:title", content: "Profile | JobShadow" },
      {
        property: "og:description",
        content: "Your JobShadow profile, scholar details and bookings.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileSettings,
});

function useUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
}

function ProfileSettings() {
  return <ScholarProfileContent search={Route.useSearch()} />;
}
export function ScholarProfileContent({
  search,
  embedded = false,
}: {
  search: { tab?: Tab | undefined; entry?: "workflow" | undefined; step?: string | undefined };
  embedded?: boolean;
}) {
  const { tab, entry, step } = search;
  const inWorkflow = entry === "workflow";
  const navigate = useNavigate();
  const Layout = embedded ? Fragment : SiteLayout;
  const qc = useQueryClient();
  const ownIdentity = useOwnIdentity();
  const user = ownIdentity.user.data;
  const profile = ownIdentity.profile;
  const session = useSiteSession();
  const scholar = useQuery({
    queryKey: ["scholar-profile", user?.id],
    enabled: !!user && !session.data?.isAdmin,
    staleTime: 15_000,
    queryFn: async () => {
      const result = await supabase
        .from("scholar_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const splitName = (profile.data?.display_name ?? "").trim().split(/\s+/);
  const firstName =
    scholar.data?.first_name ??
    profile.data?.first_name ??
    (splitName.length > 1 ? splitName.slice(0, -1).join(" ") : (splitName[0] ?? ""));
  const lastName =
    scholar.data?.last_name ??
    profile.data?.last_name ??
    (splitName.length > 1 ? (splitName[splitName.length - 1] ?? "") : "");
  const displayName = `${firstName} ${lastName}`.trim();
  const avatarUrl = profile.data?.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.data.avatar_path).data.publicUrl
    : null;

  async function uploadAvatar(blob: Blob) {
    if (!user) return;
    setBusy(true);
    setErr(null);
    const path = `${user.id}/${Date.now()}-avatar.jpg`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) {
      setBusy(false);
      return setErr(upErr.message);
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, avatar_path: path, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setErr(error.message);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    qc.invalidateQueries({ queryKey: ["site-session"] });
  }

  if (
    ownIdentity.pending ||
    session.isPending ||
    (!!user && !session.data?.isAdmin && scholar.isPending)
  )
    return <PortalLoading label="Loading your profile…" portal={false} />;
  const scholarView =
    !session.data?.isAdmin &&
    (!!scholar.data || session.data?.roles.includes("user") || inWorkflow || tab === "bookings");
  if (!scholarView)
    return (
      <Layout>
        <AccountProfile admin={!!session.data?.isAdmin} />
      </Layout>
    );
  const previewSections = [
    { title: "Account", fields: [{ label: "Email Address", value: user?.email }] },
    ...SCHOLAR_DETAIL_TABS.map((section) => ({
      title: section.label,
      fields: section.rows.map(([label, key]) => ({
        label: label.replace(/\b\w/g, (c) => c.toUpperCase()),
        value: (scholar.data as Record<string, unknown> | null)?.[key],
      })),
    })),
  ];
  const profileContent = (
    <div
      className={
        inWorkflow || tab === "bookings"
          ? "space-y-4"
          : "rounded-xl border border-border bg-card p-4 space-y-4 sm:p-5"
      }
    >
      <ProfileSummaryCard
        name={displayName || "My Profile"}
        avatarUrl={avatarUrl}
        subtitle={user?.email}
        framed={false}
        onPhoto={() => document.getElementById("scholar-profile-photo")?.click()}
      />
      <div className="space-y-4">
        <input
          id="scholar-profile-photo"
          type="file"
          accept="image/*"
          aria-label="Change profile photo"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setCropFile(file);
            e.target.value = "";
          }}
        />
        {cropFile && (
          <ImageCropModal
            file={cropFile}
            onCancel={() => setCropFile(null)}
            onSave={(blob) => {
              setCropFile(null);
              void uploadAvatar(blob);
            }}
          />
        )}

        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}
        <div>
          <AccountPanel
            profileActions={
              <ProfilePreview
                name={displayName || "My Profile"}
                avatarUrl={avatarUrl}
                sections={previewSections}
              />
            }
          />
        </div>
      </div>
    </div>
  );
  return (
    <Layout>
      <div
        className={
          !inWorkflow && tab !== "bookings"
            ? "profile-screen flex flex-1 flex-col"
            : "flex flex-1 flex-col"
        }
      >
        {!inWorkflow && <ScreenHeading title="Profile" />}
        <section
          className={inWorkflow || tab === "bookings" ? "flex-1 bg-teal" : "flex-1 bg-[#F9DB01]"}
        >
          <div
            className={
              inWorkflow || tab === "bookings"
                ? "mx-auto w-full max-w-7xl space-y-4 px-4 py-4 sm:px-5"
                : "mx-auto max-w-7xl space-y-4 px-5 py-8"
            }
          >
            {!inWorkflow && (
              <div>
                <p className="text-xs text-muted-foreground">
                  Manage your details, scholar account and bookings.
                </p>
              </div>
            )}
            <Tabs
              value={inWorkflow ? "bookings" : (tab ?? "profile")}
              onValueChange={(v) =>
                navigate({ to: "/profile", search: { tab: v as Tab }, replace: true })
              }
              className="w-full"
            >
              {!inWorkflow && (
                <TabsList className="flex w-full flex-wrap justify-start rounded-full bg-primary/90">
                  <TabsTrigger
                    value="profile"
                    className="data-[state=active]:bg-card data-[state=active]:text-foreground text-primary-foreground font-display font-black text-sm gap-1.5"
                  >
                    <UserCircle className="h-3.5 w-3.5" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger
                    value="bookings"
                    className="data-[state=active]:bg-card data-[state=active]:text-foreground text-primary-foreground font-display font-black text-sm gap-1.5"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    My Bookings
                  </TabsTrigger>
                </TabsList>
              )}
              <TabsContent value="profile" className="mt-4 space-y-4">
                {profileContent}
              </TabsContent>
              <TabsContent value="bookings" className={inWorkflow ? "mt-0" : "mt-4 space-y-4"}>
                <div className="w-full bg-teal text-teal-foreground">
                  {inWorkflow || step ? (
                    <AccountPanel withBookings initialStep={step} profileContent={profileContent} />
                  ) : (
                    user && <MyBookingsList userId={user.id} />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </Layout>
  );
}
