import { createFileRoute } from "@tanstack/react-router";
import { Camera, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMyMaintenance, useSubmitMaintenance } from "@/hooks/useApi";
import { toast } from "sonner";

export const Route = createFileRoute("/tenant/maintenance")({
  component: TenantMaintenance,
});

function TenantMaintenance() {
  const { data: requests, isLoading, error } = useMyMaintenance();
  const { mutate: submitRequest, isPending: submitting } = useSubmitMaintenance();

  const [formData, setFormData] = useState({
    title: "",
    category: "PLUMBING",
    priority: "LOW",
    description: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error("Title and description are required");
      return;
    }
    submitRequest(formData, {
      onSuccess: () => {
        toast.success("Maintenance request submitted successfully");
        setFormData({ title: "", category: "PLUMBING", priority: "LOW", description: "" });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to submit request");
      }
    });
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Issue title</Label>
              <Input 
                placeholder="e.g. Kitchen faucet leaking" 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select 
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="PLUMBING">Plumbing</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="HVAC">HVAC</option>
                  <option value="APPLIANCE">Appliance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Urgency</Label>
                <select 
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea 
                rows={5} 
                placeholder="Tell us what's happening..." 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Photos</Label>
              <button type="button" className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition hover:bg-muted/50">
                <Camera className="h-5 w-5" />
                Click to add photos
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit request
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">My past requests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex py-8 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error || !requests ? (
            <p className="text-sm text-destructive">Failed to load requests.</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No past requests</p>
          ) : (
            requests.map((r: any) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.title}</p>
                  <Badge variant={r.status === "RESOLVED" ? "secondary" : "outline"}
                    className={r.status === "OPEN" ? "border-warning/50 text-warning" : ""}>
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Submitted {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}


