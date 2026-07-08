import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/discovery")({
  beforeLoad: () => { throw redirect({ to: "/leads" }); },
});
