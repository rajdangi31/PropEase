import { createFileRoute } from "@tanstack/react-router";
import { Bell, Megaphone, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyNotificationsFn } from "@/lib/data-server";
import { getMyPropertiesFn } from "@/lib/property-server";

export const Route = createFileRoute("/admin/notifications")({
  loader: async () => {
    const [notifications, properties] = await Promise.all([
      getMyNotificationsFn(),
      getMyPropertiesFn(),
    ]);
    return { notifications, properties };
  },
  component: NotificationsPage,
});

function NotificationsPage() {
  const { notifications, properties } = Route.useLoaderData();
  const audienceOptions = ["All tenants", ...properties.map(p => p.name)];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-accent" /> Send announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <div className="flex flex-wrap gap-2">
              {audienceOptions.map((a, i) => (
                <Button key={a} size="sm" variant={i === 0 ? "default" : "outline"}>{a}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input placeholder="e.g. Water shutoff this Saturday" />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={6} placeholder="Hi everyone, a quick heads up that..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Save draft</Button>
            <Button><Send className="mr-1.5 h-4 w-4" /> Send</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-accent" /> Recent notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <span className="text-[10px] text-muted-foreground">{n.time}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
