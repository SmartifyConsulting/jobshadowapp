import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractMentorCv } from "./mentor-cv.server";

export const draftMentorProfileFromCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ storagePath: z.string().min(1).max(1000) }))
  .handler(async ({ context, data }) => {
    const [mentor, admin] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "mentor" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (mentor.error || admin.error || (!mentor.data && !admin.data))
      throw new Error("Mentor access is required.");
    const email = context.claims.email;
    if (typeof email !== "string") throw new Error("Please sign in again before reading your CV.");
    return extractMentorCv(data.storagePath, email, context.userId);
  });
