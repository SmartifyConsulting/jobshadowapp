import { Heart, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CareerGuidance } from "./CareerGuidance";
import { getCareerGuidance } from "@/lib/career-guidance";
import { YouTube } from "./YouTube";

function guidanceToText(title: string, guidance: ReturnType<typeof getCareerGuidance>) {
  const lines = [title.toUpperCase(), "", "ROLE DESCRIPTION", guidance.overview, ""];
  if (guidance.specialisations.length)
    lines.push("SPECIALISATIONS & ROLES", guidance.specialisations.join(", "), "");
  if (guidance.idealFor) lines.push("IDEAL FOR", guidance.idealFor, "");
  if (guidance.skills.school.length)
    lines.push("SCHOOL FOUNDATIONS", guidance.skills.school.join(", "), "");
  if (guidance.skills.workplace.length)
    lines.push("WORKPLACE SKILLS", guidance.skills.workplace.join(", "), "");
  if (guidance.interpersonalSkills.length)
    lines.push("INTERPERSONAL SKILLS", guidance.interpersonalSkills.join(", "), "");
  if (guidance.subjects.length)
    lines.push("SUGGESTED SCHOOL SUBJECTS", guidance.subjects.join(", "), "");
  if (guidance.recommendedCourses.length)
    lines.push("RECOMMENDED TRAINING", guidance.recommendedCourses.join(", "), "");
  if (guidance.selfDirectedLearning.length)
    lines.push("EXPLORE ON YOUR OWN", guidance.selfDirectedLearning.join(", "), "");
  if (guidance.futureOutlook) lines.push("FUTURE OF THIS CAREER", guidance.futureOutlook, "");
  if (guidance.aiExposureLevel)
    lines.push(
      "AI EXPOSURE: " + guidance.aiExposureLevel.toUpperCase(),
      guidance.aiExposureNote,
      "",
    );
  return lines.join("\n");
}

export function CareerDetailDialog({
  open,
  onOpenChange,
  title,
  category,
  description,
  saved,
  video,
  availabilityLabel,
  isFavourite,
  onToggleFavourite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  category: string;
  description: string;
  saved?: Parameters<typeof getCareerGuidance>[2];
  video?: string | null | undefined;
  availabilityLabel: string;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}) {
  const guidance = getCareerGuidance(title, description, saved);

  function download() {
    const blob = new Blob([guidanceToText(title, guidance)], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-career-guide.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-[1400px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-t-4 border-t-primary bg-ivory p-0">
        <DialogHeader className="border-b border-teal/30 bg-teal/20 px-4 py-3 pr-12 text-left sm:px-5 sm:pr-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
              {category}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleFavourite}
                aria-pressed={isFavourite}
                aria-label={
                  isFavourite ? `Remove ${title} from favourites` : `Save ${title} to favourites`
                }
                className={`rounded-full p-1.5 text-primary transition hover:bg-primary/10 ${isFavourite ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
              >
                <Heart
                  className={`h-5 w-5 text-primary ${isFavourite ? "fill-primary" : "fill-none"}`}
                />
              </button>
              <span className="rounded-full bg-cta/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground">
                {availabilityLabel}
              </span>
            </div>
          </div>
          <DialogTitle className="font-display text-2xl uppercase">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Career overview, skills and preparation. Download the full guide using the button below.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-3 py-3 sm:px-4">
          <CareerGuidance framed compact name={title} description={description} saved={saved} />
          {video && (
            <div className="mt-2 max-w-xl">
              <YouTube id={video} title={title} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end border-t border-teal/30 bg-teal/15 px-4 py-2.5">
          <button
            type="button"
            onClick={download}
            className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition hover:brightness-110"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
