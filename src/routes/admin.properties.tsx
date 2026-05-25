import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useProperties, useUnits, useAddProperty, useAddUnit } from "@/hooks/useApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/properties")({
  component: PropertiesPage,
});

type UnitStatus = "OCCUPIED" | "VACANT" | "NOTICE";

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  OCCUPIED: { bg: "bg-success/10 border-success/30", text: "text-success", label: "Occupied" },
  VACANT:   { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", label: "Vacant" },
  NOTICE:   { bg: "bg-warning/10 border-warning/40", text: "text-warning", label: "Notice" },
};

function PropertiesPage() {
  const { data: properties, isLoading: loadingProps } = useProperties();
  const { mutate: addProperty, isPending: addingProperty } = useAddProperty();
  const { mutate: addUnit, isPending: addingUnit } = useAddUnit();
  
  const [activeProperty, setActiveProperty] = useState<string | null>(null);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [newPropData, setNewPropData] = useState({ name: "", address: "", description: "" });
  const [newUnitData, setNewUnitData] = useState({ unitNumber: "", currentMarketRent: "", sqft: "", beds: "", baths: "" });

  // Set initial active property when loaded
  useEffect(() => {
    if (properties && properties.length > 0 && !activeProperty) {
      setActiveProperty(properties[0].id);
    }
  }, [properties, activeProperty]);

  const { data: units, isLoading: loadingUnits } = useUnits(activeProperty);

  const unit = openUnit && units ? units.find((u: any) => u.id === openUnit) : null;

  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropData.name || !newPropData.address) {
      toast.error("Name and address are required");
      return;
    }
    addProperty(newPropData, {
      onSuccess: () => {
        toast.success("Property added successfully!");
        setAddPropertyOpen(false);
        setNewPropData({ name: "", address: "", description: "" });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to add property");
      }
    });
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    if (!newUnitData.unitNumber) {
      toast.error("Unit number is required");
      return;
    }
    const data = {
      unitNumber: newUnitData.unitNumber,
      currentMarketRent: newUnitData.currentMarketRent ? Number(newUnitData.currentMarketRent) : null,
      sqft: newUnitData.sqft ? Number(newUnitData.sqft) : null,
      beds: newUnitData.beds ? Number(newUnitData.beds) : null,
      baths: newUnitData.baths ? Number(newUnitData.baths) : null,
      status: "VACANT",
      amenities: []
    };
    
    addUnit({ propertyId: activeProperty, data }, {
      onSuccess: () => {
        toast.success("Unit added successfully!");
        setAddUnitOpen(false);
        setNewUnitData({ unitNumber: "", currentMarketRent: "", sqft: "", beds: "", baths: "" });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to add unit");
      }
    });
  };

  if (loadingProps) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Properties</h2>
          <p className="text-sm text-muted-foreground">Manage your buildings and units</p>
        </div>
        <Button onClick={() => setAddPropertyOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Property</Button>
      </div>

      {!properties || properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
          <h2 className="text-xl font-semibold">No properties found</h2>
          <p className="text-muted-foreground">Add your first property to get started.</p>
          <Button onClick={() => setAddPropertyOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Property</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {properties.map((p: any) => {
            const pct = p.totalUnits > 0 ? Math.round((p.occupiedUnits / p.totalUnits) * 100) : 0;
            const isActive = p.id === activeProperty;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProperty(p.id)}
                className={`text-left rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-card)] ${
                  isActive ? "border-accent ring-2 ring-accent/20" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.address}
                    </p>
                  </div>
                  <Badge variant="secondary">{p.totalUnits || 0} units</Badge>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Occupancy</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {properties && properties.length > 0 && activeProperty && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{properties.find((p: any) => p.id === activeProperty)?.name} · Units</h3>
                <p className="text-xs text-muted-foreground">Click a tile to view details</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Legend color="bg-success" label="Occupied" />
                <Legend color="bg-destructive" label="Vacant" />
                <Legend color="bg-warning" label="Notice" />
                <Button size="sm" variant="outline" onClick={() => setAddUnitOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Unit</Button>
              </div>
            </div>
            {loadingUnits ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {units?.map((u: any) => {
                  const s = statusStyle[u.status] || statusStyle.VACANT;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setOpenUnit(u.id)}
                      className={`group flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-2 text-center transition hover:scale-[1.03] ${s.bg}`}
                    >
                      <span className={`text-base font-bold ${s.text}`}>{u.unitNumber}</span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
                    </button>
                  );
                })}
                {(!units || units.length === 0) && (
                  <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No units yet — add your first unit to get started
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!unit} onOpenChange={(o) => !o && setOpenUnit(null)}>
        <DialogContent className="sm:max-w-lg">
          {unit && (
            <>
              <DialogHeader>
                <DialogTitle>Unit {unit.unitNumber}</DialogTitle>
                <DialogDescription>
                  {properties?.find((p: any) => p.id === activeProperty)?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Current tenant</p>
                  <p className="text-sm font-medium">{unit.tenantId ? unit.tenantId : "— Vacant —"}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Stat label="Rent" value={`$${unit.rentAmount?.toLocaleString() || 0}`} />
                  <Stat label="Sqft" value={unit.squareFeet?.toString() || "N/A"} />
                  <Stat label="Beds / Baths" value={`${unit.bedrooms || 0}/${unit.bathrooms || 0}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Lease start</Label>
                    <Input defaultValue="2024-01-15" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lease end</Label>
                    <Input defaultValue="2026-01-14" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Amenities</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Dishwasher", "Hardwood", "In-unit W/D", "Balcony"].map((a) => (
                      <Badge key={a} variant="secondary">{a}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Edit unit</Button>
                <Button>View tenant</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>
              Enter the details of the new property you want to manage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProperty} className="space-y-4">
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input 
                placeholder="e.g. Maple Heights" 
                value={newPropData.name}
                onChange={(e) => setNewPropData({ ...newPropData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                placeholder="e.g. 123 Main St, Springfield" 
                value={newPropData.address}
                onChange={(e) => setNewPropData({ ...newPropData, address: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input 
                placeholder="e.g. A beautiful residential complex..." 
                value={newPropData.description}
                onChange={(e) => setNewPropData({ ...newPropData, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddPropertyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingProperty}>
                {addingProperty ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Property
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
            <DialogDescription>
              Add a unit to {properties?.find((p: any) => p.id === activeProperty)?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUnit} className="space-y-4">
            <div className="space-y-2">
              <Label>Unit Number</Label>
              <Input 
                placeholder="e.g. 101, Apt B" 
                value={newUnitData.unitNumber}
                onChange={(e) => setNewUnitData({ ...newUnitData, unitNumber: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Market Rent ($)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 1500" 
                  value={newUnitData.currentMarketRent}
                  onChange={(e) => setNewUnitData({ ...newUnitData, currentMarketRent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Square Feet</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 850" 
                  value={newUnitData.sqft}
                  onChange={(e) => setNewUnitData({ ...newUnitData, sqft: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 2" 
                  value={newUnitData.beds}
                  onChange={(e) => setNewUnitData({ ...newUnitData, beds: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 1" 
                  value={newUnitData.baths}
                  onChange={(e) => setNewUnitData({ ...newUnitData, baths: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddUnitOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingUnit}>
                {addingUnit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Unit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} /> {label}
    </span>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}


