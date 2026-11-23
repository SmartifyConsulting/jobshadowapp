import { createServerFn } from "@tanstack/react-start";
import { CAREER_DRAFT_FIELDS } from "./career-draft";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only structured draft; saving remains a separate review action. */
export const draftCareerDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        career: z.string().trim().min(1).max(200),
        fields: z.array(z.enum(CAREER_DRAFT_FIELDS)).min(1).max(CAREER_DRAFT_FIELDS.length),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { generateCareerDraft } = await import("./career-ai.server");
    return generateCareerDraft(data.career, data.fields, context.userId);
  });
