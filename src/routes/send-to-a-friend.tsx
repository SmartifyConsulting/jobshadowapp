import { createFileRoute } from "@tanstack/react-router";
import { SharingPage } from "@/components/SharingPage";

export const Route = createFileRoute("/send-to-a-friend")({
  head: () => ({
    meta: [
      { title: "Share Your Story & Send To A Friend — Job Shadow" },
      { name: "description", content: "Share Job Shadow with a friend by email or WhatsApp." },
      { property: "og:title", content: "Share Your Story & Send To A Friend — Job Shadow" },
      { property: "og:description", content: "Tell a friend about Job Shadow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SharingPage,
});
