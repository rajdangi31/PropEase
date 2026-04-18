import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Filter, LayoutGrid, List, Plus, Wrench, Zap, Droplets, Wind, Box } from "lucide-react";
import { maintenanceRequests, type Priority, type RequestStatus } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/maintenance")({
  component: MaintenancePage,
});

const cols: RequestStatus[] = ["Open", "In Progress", "Awaiting Parts", "Resolved"];

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

function MaintenancePage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Maintenance</h2>
          <p className="text-sm text-muted-foreground">{maintenanceRequests.length} requests · 2 high priority</p>
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
            const items = maintenanceRequests.filter((r) => r.status === col);
            return (
              <div key={col} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold">{col}</h3>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((r) => {
                    const Icon = catIcon(r.category);
                    return (
                      <Card key={r.id} className="cursor-pointer transition hover:shadow-[var(--shadow-card)]">
                        <CardContent className="p-3.5">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`gap-1 ${priorityClass[r.priority]}`}>
                              {priorityDot[r.priority]} {r.priority}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{r.submitted}</span>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-snug">{r.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{r.unit}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Icon className="h-3 w-3" /> {r.category}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {r.assigned ?? "Unassigned"}
                            </span>
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
                {maintenanceRequests.map((r, i) => (
                  <TableRow key={r.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.unit}</TableCell>
                    <TableCell className="text-sm">{r.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={priorityClass[r.priority]}>
                        {priorityDot[r.priority]} {r.priority}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.assigned ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
