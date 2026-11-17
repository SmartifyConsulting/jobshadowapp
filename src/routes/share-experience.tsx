import { createFileRoute } from "@tanstack/react-router";
import { SharingPage } from "@/components/SharingPage";

export const Route = createFileRoute("/share-experience")({
  head: () => ({
    meta: [
      { title: "Share Your Story & Send To A Friend — Job Shadow" },
      { name: "description", content: "Tell us about your Job Shadow day. Your story helps other scholars choose their career." },
      { property: "og:title", content: "Share Your Story & Send To A Friend — Job Shadow" },
      { property: "og:description", content: "Tell us about your Job Shadow day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SharingPage,
});
