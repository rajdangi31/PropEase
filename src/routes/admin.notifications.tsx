import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Megaphone, Send, Check, CheckSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getMyNotificationsFn,
  markNotificationReadFn,
  markAllNotificationsReadFn,
  broadcastAnnouncementFn,
} from "@/lib/data-server";
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
  const router = useRouter();

  // State for announcement
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both the subject and the message.");
      return;
    }

    setIsSending(true);
    try {
      await broadcastAnnouncementFn({
        data: {
          propertyId: selectedPropertyId,
          title: subject,
          body: message,
        },
      });
      toast.success("Announcement broadcasted successfully to all target tenants!");
      setSubject("");
      setMessage("");
      router.invalidate(); // Refresh notification list
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast announcement.");
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    setActioningId(id);
    try {
      await markNotificationReadFn({ data: { id } });
      toast.success("Notification dismissed.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to dismiss notification.");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadFn();
      toast.success("All notifications marked as read.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to clear notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Broadcast Announcement Panel */}
      <Card className="lg:col-span-2 border-border/50 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Megaphone className="h-4.5 w-4.5 text-accent shrink-0" /> Send Announcement
          </CardTitle>
          <CardDescription className="text-xs">
            Send an alert notification and email blast to all active tenants in selected properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Target Properties</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedPropertyId === null ? "default" : "outline"}
                  onClick={() => setSelectedPropertyId(null)}
                  className="text-xs font-semibold h-8"
                >
                  All Properties
                </Button>
                {properties.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant={selectedPropertyId === p.id ? "default" : "outline"}
                    onClick={() => setSelectedPropertyId(p.id)}
                    className="text-xs font-semibold h-8"
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-xs font-semibold text-foreground uppercase tracking-wider">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Scheduled Maintenance: Building Water Shutoff"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="message" className="text-xs font-semibold text-foreground uppercase tracking-wider">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Hi everyone, please be advised that the main building water lines will be closed this Saturday between 9:00 AM and 11:00 AM..."
                required
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSending || !subject.trim() || !message.trim()}
                className="gap-1.5 font-semibold text-xs tracking-wider uppercase h-9 px-4"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Broadcasting...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Broadcast
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Alerts Feed */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Bell className="h-4.5 w-4.5 text-accent shrink-0" /> Alerts Feed
            </CardTitle>
            <CardDescription className="text-xs">
              Latest system notifications
            </CardDescription>
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
              Clear All
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">No alerts yet</p>
              <p className="text-xs text-muted-foreground/75 mt-0.5">Tenant activities and payment updates will show up here.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
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
                    <span className="absolute top-3.5 left-2 h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                  <div className={`flex items-start justify-between gap-4 ${!n.isRead ? "pl-2" : ""}`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground/90">
                        {n.body}
                      </p>
                      <p className="mt-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
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
                        title="Dismiss notification"
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
    </div>
  );
}
