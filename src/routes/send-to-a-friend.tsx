import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/send-to-a-friend")({
  beforeLoad: () => {
    throw redirect({
      to: "/contact",
      search: { view: "friend" },
      hash: "contact-form",
      statusCode: 301,
    });
  },
});
