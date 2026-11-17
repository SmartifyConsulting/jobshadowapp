import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractIndemnityClauses } from "./indemnity-ai.server";

export const extractCompanyIndemnity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: number; storagePath: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const text = await extractIndemnityClauses(data.storagePath);
    const { error } = await context.supabase.from("companies").update({ custom_indemnity_path: data.storagePath, custom_indemnity_text: text }).eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { text };
  });
