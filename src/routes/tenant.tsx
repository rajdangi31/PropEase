import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/tenant")({
  component: TenantLayout,
});

function TenantLayout() {
  return (
    <AppShell role="tenant">
      <Outlet />
    </AppShell>
  );
}
