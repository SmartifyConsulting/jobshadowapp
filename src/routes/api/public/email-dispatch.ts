import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { dispatchQueuedEmails } from "@/lib/email-dispatch.server";

export const Route = createFileRoute("/api/public/email-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const r = await dispatchQueuedEmails();
        return Response.json({ processed: r.processed, sent: r.sent });
      },
    },
  },
});
