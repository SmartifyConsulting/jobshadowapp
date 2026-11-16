import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dispatchQueuedEmails } from "./email-dispatch.server";

export const sendQueuedEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { retryFailed?: boolean }) => d ?? {})
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.retryFailed) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("email_outbox").update({ status: "queued" }).eq("status", "failed");
    }
    return dispatchQueuedEmails();
  });
