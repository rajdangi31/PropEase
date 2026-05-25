import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Filter, LayoutGrid, List, Plus, Wrench, Zap, Droplets, Wind, Box, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAdminMaintenance, useUpdateMaintenanceStatus } from "@/hooks/useApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/maintenance")({
  component: MaintenancePage,
});

const cols: string[] = ["OPEN", "IN_PROGRESS", "AWAITING_PARTS", "RESOLVED"];

const colLabels: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  AWAITING_PARTS: "Awaiting Parts",
  RESOLVED: "Resolved",
};

const priorityClass: Record<string, string> = {
  EMERGENCY: "bg-destructive/15 text-destructive border-destructive/30",
  HIGH: "bg-warning/15 text-warning border-warning/40",
  MEDIUM: "bg-info/15 text-info border-info/30",
  LOW: "bg-success/15 text-success border-success/30",
};
const priorityDot: Record<string, string> = {
  EMERGENCY: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🟢",
};

const catIcon = (c: string) => {
  if (c === "PLUMBING") return Droplets;
  if (c === "ELECTRICAL") return Zap;
  if (c === "HVAC") return Wind;
  if (c === "APPLIANCE") return Box;
  return Wrench;
};

function MaintenancePage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const { data: maintenanceRequests, isLoading, error } = useAdminMaintenance();
  const { mutate: updateStatus } = useUpdateMaintenanceStatus();

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatus({ id, status: newStatus }, {
      onSuccess: () => toast.success("Status updated"),
      onError: (err: any) => toast.error(err.message || "Failed to update status")
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !maintenanceRequests) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive">
        Failed to load maintenance requests.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Maintenance</h2>
          <p className="text-sm text-muted-foreground">{maintenanceRequests.length} requests</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <Button size="sm" variant={view === "kanban" ? "default" : "ghost"} onClick={() => setView("kanban")} className="h-8">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Kanban
            </Button>
            <Button size="sm" variant={view === "table" ? "default" : "ghost"} onClick={() => setView("table")} className="h-8">
              <List className="mr-1.5 h-3.5 w-3.5" /> Table
            </Button>
          </div>
          <Button variant="outline" size="sm"><Filter className="mr-1.5 h-3.5 w-3.5" /> Filter</Button>
          <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> New Request</Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {cols.map((col) => {
            const items = maintenanceRequests.filter((r: any) => r.status === col);
            return (
              <div key={col} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold">{colLabels[col]}</h3>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((r: any) => {
                    const Icon = catIcon(r.category);
                    const prio = r.priority || "LOW";
                    return (
                      <Card key={r.id} className="transition hover:shadow-[var(--shadow-card)]">
                        <CardContent className="p-3.5">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`gap-1 ${priorityClass[prio]}`}>
                              {priorityDot[prio]} {prio}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-snug">{r.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{r.unitId}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Icon className="h-3 w-3" /> {r.category}
                            </span>
                            <select 
                              className="h-6 rounded border border-input bg-background px-1 text-[10px]"
                              value={r.status}
                              onChange={(e) => handleStatusChange(r.id, e.target.value)}
                            >
                              <option value="OPEN">Open</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="AWAITING_PARTS">Awaiting Parts</option>
                              <option value="RESOLVED">Resolved</option>
                            </select>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                      No requests
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceRequests.map((r: any, i: number) => {
                  const prio = r.priority || "LOW";
                  return (
                    <TableRow key={r.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.unitId}</TableCell>
                      <TableCell className="text-sm">{r.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityClass[prio]}>
                          {priorityDot[prio]} {prio}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <select 
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={r.status}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="AWAITING_PARTS">Awaiting Parts</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.assignedToId ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

