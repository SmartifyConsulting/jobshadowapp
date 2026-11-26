import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/share-experience")({
  beforeLoad: () => {
    throw redirect({
      to: "/contact",
      search: { view: "story" },
      hash: "contact-form",
      statusCode: 301,
    });
  },
});
