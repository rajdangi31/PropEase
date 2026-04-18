import { createFileRoute } from "@tanstack/react-router";
import { Camera, Plus } from "lucide-react";
import { tenantMe } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/tenant/maintenance")({
  component: TenantMaintenance,
});

function TenantMaintenance() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-accent" /> Submit a request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Issue title</Label>
            <Input placeholder="e.g. Kitchen faucet leaking" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>Plumbing</option><option>Electrical</option><option>HVAC</option>
                <option>Appliance</option><option>Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>Low</option><option>Medium</option><option>High</option><option>Emergency</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={5} placeholder="Tell us what's happening..." />
          </div>
          <div className="space-y-1.5">
            <Label>Photos</Label>
            <button type="button" className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition hover:bg-muted/50">
              <Camera className="h-5 w-5" />
              Click to add photos
            </button>
          </div>
          <Button className="w-full">Submit request</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">My past requests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {tenantMe.requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{r.title}</p>
                <Badge variant={r.status === "Resolved" ? "secondary" : "outline"}
                  className={r.status === "Open" ? "border-warning/50 text-warning" : ""}>
                  {r.status}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Submitted {r.date}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
