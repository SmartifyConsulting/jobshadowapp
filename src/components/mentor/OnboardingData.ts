import { ownCvPath } from "@/lib/mentor-cv";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export function useMentorOnboarding(userId: string) {
  return useQuery({
    queryKey: ["mentor-onboarding", userId],
    queryFn: async () => {
      const [draft, review] = await Promise.all([
        supabase.from("mentor_onboarding_drafts").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("mentor_onboarding_reviews").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      if (draft.error) throw draft.error;
      if (review.error) throw review.error;
      return { draft: draft.data, review: review.data };
    },
  });
}
export async function openMentorEvidence(path: string, email: string) {
  if (!ownCvPath(path, email)) throw new Error("This evidence does not belong to this mentor.");
  const result = await supabase.storage.from("host-docs").createSignedUrl(path, 300);
  if (result.error) throw result.error;
  if (!result.data?.signedUrl) throw new Error("This document could not be opened.");
  window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
}
