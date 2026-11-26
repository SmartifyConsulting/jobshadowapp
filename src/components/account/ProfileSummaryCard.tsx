import { ProfilePreview, type ProfilePreviewSection } from "./ProfilePreview";
import type { ReactNode } from "react";
import { Camera, UserRound } from "lucide-react";

/** Shared layout for the signed-in user's profile; retains the app's existing theme. */
export function ProfileSummaryCard({
  name,
  avatarUrl,
  subtitle,
  onPhoto,
  children,
  aside,
  previewSections,
  layout = "default",
  label = "Profile summary",
}: {
  name: string;
  avatarUrl?: string | null;
  subtitle?: ReactNode;
  onPhoto?: () => void;
  children?: ReactNode;
  aside?: ReactNode;
  previewSections?: ProfilePreviewSection[];
  layout?: "default" | "mentor";
  label?: string;
}) {
  const photo = (
    <>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Profile photo"
          width={80}
          height={80}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <UserRound className="h-9 w-9" aria-hidden />
      )}
      {onPhoto && (
        <Camera
          aria-hidden
          className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-background p-1"
        />
      )}
    </>
  );
  const avatarClass =
    "relative grid h-20 w-20 shrink-0 place-items-center rounded-full border border-input bg-muted";
  return (
    <header aria-label={label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div
        className={
          layout === "mentor"
            ? "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:gap-5 xl:grid-cols-[auto_minmax(0,1fr)_auto]"
            : "flex flex-wrap items-center gap-4 sm:gap-5"
        }
      >
        {onPhoto ? (
          <button
            type="button"
            aria-label="Edit profile photo"
            onClick={onPhoto}
            className={avatarClass}
          >
            {photo}
          </button>
        ) : (
          <div className={avatarClass}>{photo}</div>
        )}
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="break-words text-2xl font-bold text-teal">{name}</h2>
          {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {aside && (
          <div
            className={
              layout === "mentor"
                ? "col-span-2 min-w-0 xl:col-span-1 xl:max-w-md"
                : "w-full min-w-0 lg:ml-auto lg:w-auto lg:max-w-[60%]"
            }
          >
            {aside}
          </div>
        )}
      </div>
      {layout === "mentor" ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          {children && <div className="min-w-0 flex-1">{children}</div>}
          {previewSections && (
            <ProfilePreview name={name} avatarUrl={avatarUrl ?? null} sections={previewSections} />
          )}
        </div>
      ) : (
        <>
          {previewSections && (
            <div className="mt-3 flex justify-end">
              <ProfilePreview
                name={name}
                avatarUrl={avatarUrl ?? null}
                sections={previewSections}
              />
            </div>
          )}
          {children && <div className="mt-4 min-w-0 border-t border-border pt-3">{children}</div>}
        </>
      )}
    </header>
  );
}
