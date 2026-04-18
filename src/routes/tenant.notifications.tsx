import { createFileRoute } from "@tanstack/react-router";
import { notifications } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/tenant/notifications")({
  component: TenantNotifications,
});

function TenantNotifications() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Inbox</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium">{n.title}</p>
                <span className="text-[10px] text-muted-foreground">{n.time}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
            </div>
          ))}
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
