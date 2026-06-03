import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Plus,
  Calendar,
  Shield,
  User,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getMyMaintenanceAsTenantFn,
  createMaintenanceRequestFn,
  getMaintenanceLogsFn,
  addMaintenanceLogFn,
} from "@/lib/data-server";

export const Route = createFileRoute("/tenant/maintenance")({
  loader: () => getMyMaintenanceAsTenantFn(),
  component: TenantMaintenance,
});

function TenantMaintenance() {
  const requests = Route.useLoaderData();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Plumbing");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRequest) {
      setIsLoadingLogs(true);
      getMainMaintenanceLogsFn({ data: { requestId: selectedRequest.id } })
        .then((data) => {
          setLogs(data);
          setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        })
        .catch((err) => toast.error("Failed to load logs: " + err.message))
        .finally(() => setIsLoadingLogs(false));
    } else {
      setLogs([]);
    }
  }, [selectedRequest]);

  // Temporary function alias to prevent TS errors on getMaintenanceLogsFn
  const getMainMaintenanceLogsFn = getMaintenanceLogsFn;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      await addMaintenanceLogFn({
        data: {
          requestId: selectedRequest.id,
          content: newComment.trim(),
          isInternal: false,
        },
      });
      setNewComment("");
      const updated = await getMaintenanceLogsFn({ data: { requestId: selectedRequest.id } });
      setLogs(updated);
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createMaintenanceRequestFn({
        data: { title, description: `${category}: ${description}`, priority, category },
      });
      setTitle("");
      setDescription("");
      router.invalidate();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-accent" /> Submit a request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label>Issue title</Label>
              <Input
                placeholder="e.g. Kitchen faucet leaking"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>HVAC</option>
                  <option>Appliance</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Urgency</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={5}
                placeholder="Tell us what's happening..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit request"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My past requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {requests.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No requests yet</p>
          ) : (
            requests.data.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setSelectedRequest(r)}
                className="w-full text-left rounded-lg border border-border p-3 transition hover:bg-muted/10 cursor-pointer block"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate max-w-[150px]">{r.title}</p>
                  <Badge
                    variant={r.status === "Resolved" ? "secondary" : "outline"}
                    className={r.status === "Open" ? "border-warning/50 text-warning" : ""}
                  >
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Submitted {r.submitted?.split(" ")[0] || r.date?.split(" ")[0]}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Ticket Details & Comments Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-card border border-border/60">
          {selectedRequest && (
            <div className="flex flex-col h-[600px] max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 bg-muted/10">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2.5 py-0.5 rounded-full border border-accent/25">
                    Ticket details
                  </span>
                  <DialogTitle
                    className="mt-2 text-lg font-bold leading-tight font-display text-foreground truncate max-w-[600px]"
                    title={selectedRequest.title}
                  >
                    {selectedRequest.title}
                  </DialogTitle>
                </div>
              </div>

              {/* Split view */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                {/* Left Column: Details */}
                <div className="md:col-span-5 p-5 overflow-y-auto space-y-4 border-r border-border/50">
                  <div className="bg-muted/30 border border-border/40 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-accent" />
                      <span>
                        Submitted on <strong>{selectedRequest.submitted?.split(" ")[0]}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-accent" />
                      <span>
                        Unit: <strong>{selectedRequest.unit}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Urgency
                    </Label>
                    <div className="text-xs font-medium text-foreground bg-muted/20 px-3 py-1.5 rounded-md border border-border/30 capitalize">
                      {selectedRequest.priority}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </Label>
                    <div className="text-xs font-medium text-foreground bg-muted/20 px-3 py-1.5 rounded-md border border-border/30">
                      {selectedRequest.status}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Assigned Worker
                    </Label>
                    <div className="text-xs font-medium text-foreground bg-muted/20 px-3 py-1.5 rounded-md border border-border/30 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-accent" />{" "}
                      {selectedRequest.assigned ?? "Unassigned"}
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-border/50 pt-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </Label>
                    <p className="text-xs text-foreground leading-relaxed bg-muted/10 border border-border/50 p-3 rounded-xl whitespace-pre-wrap max-h-[140px] overflow-y-auto">
                      {selectedRequest.description}
                    </p>
                  </div>
                </div>

                {/* Right Column: Public Comments thread */}
                <div className="md:col-span-7 flex flex-col h-full bg-muted/5 overflow-hidden">
                  <div className="px-5 py-3 border-b border-border/50 bg-muted/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-accent" /> Conversation Logs
                    </span>
                  </div>

                  {/* Message bubbles */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingLogs ? (
                      <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                        Loading conversation history...
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-8 w-8 text-accent/30 stroke-[1.5]" />
                        <span>No comments yet. Send a message below to start coordinating.</span>
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-2 px-1">
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {log.authorName}{" "}
                              <span className="opacity-80 font-normal">({log.authorRole})</span>
                            </span>
                            <span className="text-[9px] text-muted-foreground opacity-80">
                              {log.createdAt.split(" ")[1]?.substring(0, 5) ||
                                log.createdAt.split(" ")[0]}
                            </span>
                          </div>
                          <p className="bg-card border border-border/50 rounded-xl p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words max-w-[95%]">
                            {log.content}
                          </p>
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>

                  {/* Comment Input */}
                  <form
                    onSubmit={handleAddComment}
                    className="p-4 border-t border-border/50 bg-card"
                  >
                    <div className="relative">
                      <textarea
                        rows={2}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a message..."
                        required
                        disabled={isSubmittingComment}
                        className="w-full text-xs rounded-lg border border-border bg-background p-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-accent resize-none placeholder-muted-foreground"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={isSubmittingComment || !newComment.trim()}
                        className="absolute right-2 bottom-3 h-7 w-7 rounded-md"
                      >
                        {isSubmittingComment ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
