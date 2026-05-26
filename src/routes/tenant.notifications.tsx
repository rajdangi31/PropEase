import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Check, CheckSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getMyNotificationsFn,
  markNotificationReadFn,
  markAllNotificationsReadFn,
} from "@/lib/data-server";

export const Route = createFileRoute("/tenant/notifications")({
  loader: () => getMyNotificationsFn(),
  component: TenantNotifications,
});

function TenantNotifications() {
  const notifications = Route.useLoaderData();
  const router = useRouter();

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkRead = async (id: string) => {
    setActioningId(id);
    try {
      await markNotificationReadFn({ data: { id } });
      toast.success("Notification marked as read.");
      router.invalidate(); // Invalidate loader data
    } catch (err: any) {
      toast.error(err.message || "Failed to clear notification.");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadFn();
      toast.success("All alerts cleared.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to clear alerts.");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Notifications Inbox */}
      <Card className="lg:col-span-2 border-border/50 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Inbox Alerts</CardTitle>
            <CardDescription className="text-xs">Notifications, billing statements, and maintenance updates</CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="h-8 text-xs font-semibold text-accent hover:text-accent/80 hover:bg-accent/5 p-2 gap-1"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckSquare className="h-3.5 w-3.5" />
              )}
              Mark All Read
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Bell className="h-9 w-9 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold">Inbox is clear</p>
              <p className="text-xs text-muted-foreground/75 mt-0.5">We'll let you know when there's an announcement or invoice updates.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`relative group rounded-lg border p-3.5 transition-all ${
                    !n.isRead
                      ? "bg-accent/5 border-accent/20 hover:border-accent/30"
                      : "bg-card border-border/50 hover:bg-muted/10"
                  }`}
                >
                  {!n.isRead && (
                    <span className="absolute top-4 left-2.5 h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                  <div className={`flex items-start justify-between gap-4 ${!n.isRead ? "pl-2" : ""}`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground/95">
                        {n.body}
                      </p>
                      <p className="mt-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {n.time.split(" ")[0]}
                      </p>
                    </div>
                    {!n.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={actioningId === n.id}
                        className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-md text-muted-foreground hover:text-success hover:bg-success/10"
                        title="Mark as read"
                      >
                        {actioningId === n.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences Panel */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Preferences</CardTitle>
          <CardDescription className="text-xs">Manage how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["Email reminders", "SMS reminders", "Building announcements", "Maintenance updates"].map((p) => (
            <div key={p} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium text-foreground">{p}</span>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
