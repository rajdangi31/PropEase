import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMeFn } from "@/lib/auth-server";
import { getMyPropertiesFn } from "@/lib/property-server";
import { getMyNotificationsFn } from "@/lib/data-server";

export const Route = createFileRoute("/admin")({
  loader: async ({ location }) => {
    const user = await getMeFn();
    if (!user || user.role === "tenant") {
      throw redirect({ to: "/auth" });
    }

    // Redirect maintenance workers accessing restricted paths
    if (user.role === "maintenance" || user.role === "service") {
      const allowedPaths = ["/admin/maintenance", "/admin/notifications"];
      const isAllowed = allowedPaths.some(
        (p) => location.pathname === p || location.pathname.startsWith(p + "/")
      );
      if (!isAllowed) {
        throw redirect({ to: "/admin/maintenance" });
      }
    }

    const [properties, notifications] = await Promise.all([
      getMyPropertiesFn(),
      getMyNotificationsFn(),
    ]);
    return { user, properties, notifications };
  },
  component: AdminShell,
});
