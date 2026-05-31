import { createFileRoute, redirect } from "@tanstack/react-router";
import { TenantShell } from "@/components/tenant/TenantShell";
import { getMeFn } from "@/lib/auth-server";
import { getMyNotificationsFn } from "@/lib/data-server";

export const Route = createFileRoute("/tenant")({
  loader: async () => {
    const user = await getMeFn();
    if (!user) {
      throw redirect({ to: "/auth" });
    }
    if (user.role !== "tenant") {
      throw redirect({ to: "/admin" });
    }
    const notifications = await getMyNotificationsFn();
    return { user, notifications };
  },
  component: TenantShell,
});
