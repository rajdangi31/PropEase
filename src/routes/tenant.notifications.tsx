import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/hooks/useApi";

export const Route = createFileRoute("/tenant/notifications")({
  component: TenantNotifications,
});

function TenantNotifications() {
  const { data: notifications, isLoading, error } = useNotifications();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Inbox</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex py-8 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error || !notifications ? (
            <p className="text-sm text-destructive">Failed to load notifications.</p>
          ) : notifications.length === 0 ? (
            <div className="flex py-8 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            notifications.map((n: any) => (
              <div key={n.id} className={`rounded-lg border border-border p-3 ${!n.read ? 'bg-muted/30' : ''}`}>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">{n.title}</p>
                  <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {["Email reminders", "SMS reminders", "Building announcements", "Maintenance updates"].map((p) => (
            <div key={p} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">{p}</span>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

