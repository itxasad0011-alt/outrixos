import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/manual-leads")({
  beforeLoad: () => { throw redirect({ to: "/leads" }); },
});
