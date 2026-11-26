import type { ReactNode } from "react";
import { Eye, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ProfilePreviewSection = {
  title: string;
  fields: { label: string; value: unknown }[];
};
function display(value: unknown): ReactNode {
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return typeof value === "string" && value.trim()
    ? value
    : typeof value === "number"
      ? String(value)
      : "Not recorded";
}
export function ProfilePreview({
  name,
  avatarUrl,
  sections,
}: {
  name: string;
  avatarUrl?: string | null;
  sections: ProfilePreviewSection[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded border border-border bg-ivory px-3 py-1.5 text-sm font-medium"
        >
          <Eye className="h-4 w-4" aria-hidden />
          Preview Profile
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90dvh] overflow-y-auto bg-ivory">
        <DialogHeader>
          <DialogTitle>Profile Preview</DialogTitle>
          <DialogDescription>A private, read-only view of your profile details.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile photo"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <UserRound className="h-12 w-12" aria-hidden />
          )}
          <h2 className="text-2xl font-bold text-teal">{name}</h2>
        </div>
        {sections.map((section, index) => (
          <section key={index} className="rounded border border-border p-4">
            <h3 className="mb-3 text-sm font-bold">{section.title}</h3>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {section.fields.map((field, i) => (
                <div key={i} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{field.label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {display(field.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}
