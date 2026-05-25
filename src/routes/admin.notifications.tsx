import { createFileRoute } from "@tanstack/react-router";
import { Bell, Megaphone, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotifications, useSendAnnouncement } from "@/hooks/useApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: notifications, isLoading, error } = useNotifications();
  const { mutate: sendAnnouncement, isPending: sending } = useSendAnnouncement();

  const [formData, setFormData] = useState({
    title: "",
    body: "",
    type: "ANNOUNCEMENT"
  });

  const handleSend = () => {
    if (!formData.title || !formData.body) {
      toast.error("Subject and message are required");
      return;
    }
    sendAnnouncement(formData, {
      onSuccess: () => {
        toast.success("Announcement sent successfully!");
        setFormData({ title: "", body: "", type: "ANNOUNCEMENT" });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to send announcement");
      }
    });
  };

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
              {["All tenants", "Maple Heights", "Riverside Lofts", "Sunset Court", "Specific units…"].map((a) => (
                <Button key={a} size="sm" variant={a === "All tenants" ? "default" : "outline"}>{a}</Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Note: Currently sending to all tenants by default.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input 
              placeholder="e.g. Water shutoff this Saturday" 
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea 
              rows={6} 
              placeholder="Hi everyone, a quick heads up that..." 
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Save draft</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Send
            </Button>
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
          {isLoading ? (
            <div className="flex py-8 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error || !notifications ? (
            <p className="text-sm text-destructive">Failed to load notifications.</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent notifications</p>
          ) : (
            notifications.map((n: any) => (
              <div key={n.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

