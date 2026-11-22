import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/my-account")({
  beforeLoad: () => { throw redirect({ to: "/profile", search: { tab: "bookings", entry: "workflow" } }); },
});
