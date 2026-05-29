import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Wrench, Zap, Droplets, Wind, Box, User, Calendar, Shield, LayoutGrid, List, Plus, Copy, Check, MessageSquare, Send, EyeOff, Eye, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getMyMaintenanceFn, getAssignableWorkersFn, updateMaintenanceRequestFn, getMaintenanceLogsFn, addMaintenanceLogFn } from "@/lib/data-server";
import { createInviteFn } from "@/lib/property-server";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/maintenance")({
  loader: async () => {
    const [requests, workers] = await Promise.all([
      getMyMaintenanceFn(),
      getAssignableWorkersFn(),
    ]);
    return { requests, workers };
  },
  component: MaintenancePage,
});

type Priority = "Emergency" | "High" | "Medium" | "Low";

const priorityClass: Record<Priority, string> = {
  Emergency: "bg-destructive/15 text-destructive border-destructive/30",
  High: "bg-warning/15 text-warning border-warning/40",
  Medium: "bg-info/15 text-info border-info/30",
  Low: "bg-success/15 text-success border-success/30",
};

const priorityDot: Record<Priority, string> = {
  Emergency: "🔴", High: "🟠", Medium: "🟡", Low: "🟢",
};

const catIcon = (c: string) => {
  if (c === "Plumbing") return Droplets;
  if (c === "Electrical") return Zap;
  if (c === "HVAC") return Wind;
  if (c === "Appliance") return Box;
  return Wrench;
};

const cols = [
  { id: "pending", label: "Open", badgeColor: "bg-muted text-muted-foreground border-border" },
  { id: "in_progress", label: "In Progress", badgeColor: "bg-warning/10 text-warning border-warning/20" },
  { id: "resolved_pending", label: "Pending Approval", badgeColor: "bg-warning/10 text-warning border-warning/20" },
  { id: "resolved", label: "Resolved", badgeColor: "bg-success/10 text-success border-success/20" },
];

function InviteWorkerModal({ properties }: { properties: any[] }) {
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [email, setEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const invite = await createInviteFn({
        data: {
          propertyId,
          email: email || undefined,
          inviteType: "maintenance",
        }
      });
      const url = new URL(window.location.href);
      setInviteLink(`${url.protocol}//${url.host}/auth?invite=${invite.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate invitation link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setPropertyId("");
        setEmail("");
        setInviteLink("");
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1.5 h-4 w-4" /> Invite Worker</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Maintenance Worker</DialogTitle>
          <DialogDescription>
            Generate a secure sign-up link to invite a maintenance worker to your property.
          </DialogDescription>
        </DialogHeader>
        
        {inviteLink ? (
          <div className="flex flex-col space-y-4 pt-4">
            <div className="rounded-md bg-accent/10 p-4 border border-accent/20">
              <p className="text-sm text-accent-foreground font-medium mb-2">Invitation Link Generated!</p>
              <div className="flex items-center space-x-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs text-muted-foreground" />
                <Button size="icon" variant="secondary" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId} required>
                <SelectTrigger><SelectValue placeholder="Select property..." /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Worker Email (Optional)</Label>
              <Input type="email" placeholder="worker@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="pt-4 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate Link"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MaintenancePage() {
  const { requests, workers } = Route.useLoaderData();
  const { user, properties } = useLoaderData({ from: "/admin" }) as any;
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);
  const [draggedRequest, setDraggedRequest] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch logs whenever the selectedRequest opens/changes
  useEffect(() => {
    if (selectedRequest) {
      setIsLoadingLogs(true);
      getMaintenanceLogsFn({ data: { requestId: selectedRequest.id } })
        .then((data) => {
          setLogs(data);
          // Scroll to bottom after loading
          setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        })
        .catch((err) => toast.error("Failed to load logs: " + err.message))
        .finally(() => setIsLoadingLogs(false));
    } else {
      setLogs([]);
    }
  }, [selectedRequest]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      await addMaintenanceLogFn({
        data: {
          requestId: selectedRequest.id,
          content: newComment.trim(),
          isInternal: isInternalComment,
        },
      });
      setNewComment("");
      // Reload logs
      const updated = await getMaintenanceLogsFn({ data: { requestId: selectedRequest.id } });
      setLogs(updated);
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpdate = async (id: string, updates: {
    status?: "pending" | "in_progress" | "resolved_pending" | "resolved";
    priority?: "low" | "medium" | "high" | "emergency";
    assignedWorkerId?: string | null;
  }) => {
    setIsUpdating(id);
    try {
      await updateMaintenanceRequestFn({ data: { id, ...updates } });
      toast.success("Maintenance request updated successfully");
      
      // Update selectedRequest local state if modal is open
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest((prev: any) => {
          const updated = { ...prev };
          if (updates.status !== undefined) {
            updated.rawStatus = updates.status;
            const statusLabelMap = { pending: "Open", in_progress: "In Progress", resolved_pending: "Pending Approval", resolved: "Resolved" };
            updated.status = statusLabelMap[updates.status];
          }
          if (updates.priority !== undefined) {
            updated.rawPriority = updates.priority;
            const priorityLabelMap = { low: "Low", medium: "Medium", high: "High", emergency: "Emergency" };
            updated.priority = priorityLabelMap[updates.priority];
          }
          if (updates.assignedWorkerId !== undefined) {
            updated.assignedWorkerId = updates.assignedWorkerId;
            const w = workers.find((worker: any) => worker.id === updates.assignedWorkerId);
            updated.assigned = w ? w.name : null;
          }
          return updated;
        });
      }

      await router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update request");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, req: any) => {
    e.dataTransfer.setData("text/plain", req.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedRequest(req);
  };

  const handleDrop = async (e: React.DragEvent, status: "pending" | "in_progress" | "resolved_pending" | "resolved") => {
    e.preventDefault();
    setDraggedOverCol(null);
    setDraggedRequest(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    
    // Find current status to prevent redundant or forbidden updates
    const item = requests.find((r: any) => r.id === id);
    if (!item) return;

    if (status === "pending" && item.rawStatus !== "pending") {
      toast.error("Cannot move active or resolved requests back to Open status.");
      return;
    }

    if (status !== "pending" && !item.assignedWorkerId) {
      toast.error("Cannot move maintenance request status: No worker is assigned.");
      return;
    }

    if (status === "resolved" && (user.role === "maintenance" || user.role === "service")) {
      toast.error("Only landlords and managers can finalize resolved requests.");
      return;
    }

    if (item.rawStatus !== status) {
      await handleUpdate(id, { status });
    }
  };

  const highPri = requests.filter((r: any) => r.priority === "High" || r.priority === "Emergency").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight font-display">Maintenance</h2>
          <p className="text-sm text-muted-foreground font-medium">{requests.length} requests · {highPri} high priority</p>
        </div>
        <div className="flex items-center gap-2">
          {!(user.role === "maintenance" || user.role === "service") && (
            <InviteWorkerModal properties={properties} />
          )}
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <Button size="sm" variant={view === "kanban" ? "default" : "ghost"} onClick={() => setView("kanban")} className="h-8">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Kanban
            </Button>
            <Button size="sm" variant={view === "table" ? "default" : "ghost"} onClick={() => setView("table")} className="h-8">
              <List className="mr-1.5 h-3.5 w-3.5" /> Table
            </Button>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent animate-pulse">
            <Wrench className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-xl font-semibold tracking-tight">No maintenance requests</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            When tenants submit maintenance requests, they'll appear here for you to manage.
          </p>
        </div>
      ) : view === "kanban" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {cols.map((col) => {
            const items = requests.filter((r: any) => r.rawStatus === col.id);
            const isOver = draggedOverCol === col.id;
            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  // Check if dragging back to Open/pending is forbidden
                  if (col.id === "pending" && draggedRequest && draggedRequest.rawStatus !== "pending") {
                    return;
                  }
                  if (draggedOverCol !== col.id) setDraggedOverCol(col.id);
                }}
                onDragLeave={() => {
                  setDraggedOverCol(null);
                }}
                onDrop={(e) => handleDrop(e, col.id as any)}
                className={`flex flex-col gap-3 rounded-xl border p-3.5 transition-all duration-200 ${
                  isOver
                    ? "border-accent bg-accent/5 shadow-[0_0_12px_rgba(var(--accent-rgb),0.1)] scale-[1.01]"
                    : "border-border/40 bg-card/20"
                }`}
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold tracking-tight">{col.label}</h3>
                  <Badge variant="outline" className={col.badgeColor}>
                    {items.length}
                  </Badge>
                </div>
                <div className="space-y-2 min-h-[350px]">
                  {items.map((r: any) => {
                    const Icon = catIcon(r.category);
                    const updating = isUpdating === r.id;
                    return (
                      <Card
                        key={r.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, r)}
                        onClick={() => setSelectedRequest(r)}
                        className={`group cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:border-border/85 ${
                          updating ? "opacity-40 pointer-events-none" : ""
                        }`}
                      >
                        <CardContent className="p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`gap-1 font-medium ${priorityClass[r.priority as Priority] ?? ""}`}>
                              {priorityDot[r.priority as Priority] ?? "⚪"} {r.priority}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-medium">{r.submitted.split(" ")[0]}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
                              {r.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {r.description}
                            </p>
                          </div>
                          <div className="flex items-center justify-between border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <Icon className="h-3.5 w-3.5 text-accent" /> {r.category}
                            </span>
                            <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-full border border-border/25">
                              <User className="h-3 w-3" /> {r.assigned ?? "Unassigned"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center text-xs text-muted-foreground/60">
                      <Wrench className="h-5 w-5 mb-1.5 opacity-40 animate-pulse" />
                      No requests in this status
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 hover:bg-muted/10">
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold">Unit</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Assigned Worker</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any, i: number) => (
                  <TableRow
                    key={r.id}
                    onClick={() => setSelectedRequest(r)}
                    className={`cursor-pointer transition-colors ${i % 2 === 1 ? "bg-muted/10" : ""} hover:bg-muted/20`}
                  >
                    <TableCell className="font-medium text-foreground max-w-xs truncate">
                      {r.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 font-medium ${priorityClass[r.priority as Priority] ?? ""}`}>
                        {priorityDot[r.priority as Priority] ?? "⚪"} {r.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.assigned ?? "Unassigned"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Details & Assignment Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden bg-card border border-border/60">
          {selectedRequest && (
            <div className="flex flex-col h-[650px] max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 bg-muted/10">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2.5 py-0.5 rounded-full border border-accent/25">
                    Ticket #{selectedRequest.id.substring(0, 8)}
                  </span>
                  <DialogTitle className="mt-2 text-lg font-bold leading-tight font-display text-foreground truncate max-w-[650px]" title={selectedRequest.title}>
                    {selectedRequest.title}
                  </DialogTitle>
                </div>
              </div>

              {/* Split view */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                {/* Left Side: Ticket Details */}
                <div className="md:col-span-5 p-5 overflow-y-auto space-y-5 border-r border-border/50">
                  <div className="bg-muted/30 border border-border/40 p-4 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-accent" />
                      <span>Submitted on <strong>{selectedRequest.submitted}</strong> by <strong>{selectedRequest.tenant}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-accent" />
                      <span>Unit: <strong>{selectedRequest.unit}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                    <p className="text-sm text-foreground leading-relaxed bg-muted/10 border border-border/50 p-4 rounded-xl whitespace-pre-wrap max-h-[160px] overflow-y-auto">
                      {selectedRequest.description}
                    </p>
                  </div>

                  <div className="space-y-4 border-t border-border/50 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Urgency</Label>
                      <Select
                        value={selectedRequest.rawPriority}
                        onValueChange={(val) => handleUpdate(selectedRequest.id, { priority: val as any })}
                        disabled={user.role === "maintenance" || user.role === "service"}
                      >
                        <SelectTrigger className="h-10 w-full font-medium cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                      <Select
                        value={selectedRequest.rawStatus}
                        onValueChange={(val) => handleUpdate(selectedRequest.id, { status: val as any })}
                      >
                        <SelectTrigger className="h-10 w-full font-medium cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending" disabled={selectedRequest.rawStatus !== "pending"}>Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          {user.role === "maintenance" || user.role === "service" ? (
                            <SelectItem value="resolved_pending">Resolve (Request Approval)</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="resolved_pending">Pending Approval</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignee</Label>
                      <Select
                        value={selectedRequest.assignedWorkerId || "__unassigned__"}
                        onValueChange={(val) => {
                          handleUpdate(selectedRequest.id, { assignedWorkerId: val === "__unassigned__" ? null : val });
                        }}
                        disabled={user.role === "maintenance" || user.role === "service"}
                      >
                        <SelectTrigger className="h-10 w-full font-medium cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unassigned__">Unassigned</SelectItem>
                          {workers.map((w: any) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name} ({w.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Right Side: Conversation Logs */}
                <div className="md:col-span-7 flex flex-col h-full bg-muted/5 overflow-hidden">
                  <div className="px-5 py-3 border-b border-border/50 bg-muted/10 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-accent" /> Activity & Comments
                    </span>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingLogs ? (
                      <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                        Loading conversation history...
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-8 w-8 text-accent/30 stroke-[1.5]" />
                        <span>No activity logs or messages yet.</span>
                      </div>
                    ) : (
                      logs.map((log) => {
                        const isSystem = log.authorRole === "system";
                        const isMe = log.authorId === user.id;
                        return (
                          <div
                            key={log.id}
                            className={`flex flex-col gap-1 ${
                              log.isInternal ? "border-l-2 border-warning/60 pl-2" : ""
                            }`}
                          >
                            <div className="flex items-baseline justify-between gap-2 px-1">
                              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                <strong>{log.authorName}</strong>
                                <span className="opacity-80">({log.authorRole})</span>
                              </span>
                              <span className="text-[9px] text-muted-foreground opacity-80">{log.createdAt.split(" ")[1]?.substring(0, 5) || log.createdAt.split(" ")[0]}</span>
                            </div>
                            <div
                              className={`rounded-xl p-3 text-xs leading-relaxed max-w-[95%] border ${
                                log.isInternal
                                  ? "bg-warning/5 border-warning/30 text-foreground"
                                  : "bg-card border-border/50 text-foreground"
                              }`}
                            >
                              {log.isInternal && (
                                <div className="flex items-center gap-1 text-[9px] font-bold text-warning uppercase tracking-wide mb-1.5 select-none">
                                  <EyeOff className="h-3 w-3" /> Internal Staff Note
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words">{log.content}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={logsEndRef} />
                  </div>

                  {/* Comment Input Form */}
                  <form onSubmit={handleAddComment} className="p-4 border-t border-border/50 bg-card space-y-3">
                    <div className="relative">
                      <textarea
                        rows={2}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a message or log activity..."
                        required
                        disabled={isSubmittingComment}
                        className="w-full text-xs rounded-lg border border-border bg-background p-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-accent resize-none placeholder-muted-foreground"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={isSubmittingComment || !newComment.trim()}
                        className="absolute right-2 bottom-3.5 h-7 w-7 rounded-md"
                      >
                        {isSubmittingComment ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="internal-comment"
                          checked={isInternalComment}
                          onCheckedChange={setIsInternalComment}
                          disabled={isSubmittingComment}
                        />
                        <Label htmlFor="internal-comment" className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 cursor-pointer select-none">
                          <EyeOff className="h-3.5 w-3.5" /> Internal staff note
                        </Label>
                      </div>
                      <span className="text-[9px] text-muted-foreground/60 font-medium">Shift + Enter to submit</span>
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
