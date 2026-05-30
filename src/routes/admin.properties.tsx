import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building2, MapPin, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getMyPropertiesFn,
  getUnitsFn,
  createPropertyFn,
  createUnitFn,
  updateUnitFn,
} from "@/lib/property-server";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { PropertyWithCounts, UnitWithTenant } from "@/db/queries";

export const Route = createFileRoute("/admin/properties")({
  loader: async () => {
    const properties = await getMyPropertiesFn();

    // If there are properties, pre-load units for the first one
    let initialUnits: UnitWithTenant[] = [];
    if (properties.length > 0) {
      initialUnits = await getUnitsFn({ data: { propertyId: properties[0].id } });
    }

    return { properties, initialUnits };
  },
  component: PropertiesPage,
});

type UnitStatus = "occupied" | "vacant" | "maintenance";

const statusStyle: Record<UnitStatus, { bg: string; text: string; label: string }> = {
  occupied:    { bg: "bg-success/10 border-success/30", text: "text-success", label: "Occupied" },
  vacant:      { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", label: "Vacant" },
  maintenance: { bg: "bg-warning/10 border-warning/40", text: "text-warning", label: "Maintenance" },
};

function PropertiesPage() {
  const { properties, initialUnits } = Route.useLoaderData();
  const router = useRouter();

  const [activeProperty, setActiveProperty] = useState(properties[0]?.id ?? "");
  const [unitsMap, setUnitsMap] = useState<Record<string, UnitWithTenant[]>>(
    properties[0] ? { [properties[0].id]: initialUnits } : {}
  );
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Automatically sync activeProperty when properties list updates or activeProperty is invalid
  useEffect(() => {
    const hasActiveProp = properties.some((p) => p.id === activeProperty);
    if ((!activeProperty || !hasActiveProp) && properties[0]?.id) {
      setActiveProperty(properties[0].id);
    }
  }, [properties, activeProperty]);


  // Property form state
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");

  // Unit form state
  const [unitNumber, setUnitNumber] = useState("");
  const [unitRent, setUnitRent] = useState("");
  const [unitSqft, setUnitSqft] = useState("");
  const [unitBeds, setUnitBeds] = useState("");
  const [unitBaths, setUnitBaths] = useState("");

  // Edit Unit form state
  const [showEditUnit, setShowEditUnit] = useState(false);
  const [editUnitNumber, setEditUnitNumber] = useState("");
  const [editUnitRent, setEditUnitRent] = useState("");
  const [editUnitSqft, setEditUnitSqft] = useState("");
  const [editUnitBeds, setEditUnitBeds] = useState("");
  const [editUnitBaths, setEditUnitBaths] = useState("");
  const [editUnitStatus, setEditUnitStatus] = useState<UnitStatus>("vacant");

  const visibleUnits = unitsMap[activeProperty] ?? [];
  const unit = openUnit ? visibleUnits.find((u) => u.id === openUnit) : null;

  const handleSelectProperty = async (propertyId: string) => {
    setActiveProperty(propertyId);
    if (!unitsMap[propertyId]) {
      const units = await getUnitsFn({ data: { propertyId } });
      setUnitsMap((prev) => ({ ...prev, [propertyId]: units }));
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createPropertyFn({ data: { name: propName, address: propAddress } });
      setPropName("");
      setPropAddress("");
      setShowAddProperty(false);
      toast.success("Property created successfully.");
      router.invalidate(); // Reload route data
    } catch (err: any) {
      console.error("Failed to create property:", err);
      toast.error(err.message || "Failed to create property.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) {
      toast.error("Please select a property before creating a unit.");
      return;
    }
    setIsLoading(true);
    try {
      await createUnitFn({
        data: {
          propertyId: activeProperty,
          unitNumber,
          rent: parseFloat(unitRent) || 0,
          sqft: parseInt(unitSqft) || undefined,
          beds: parseInt(unitBeds) || undefined,
          baths: parseInt(unitBaths) || undefined,
        },
      });
      setUnitNumber("");
      setUnitRent("");
      setUnitSqft("");
      setUnitBeds("");
      setUnitBaths("");
      setShowAddUnit(false);
      toast.success("Unit created successfully.");

      // Re-fetch and update local units state for immediate UI update
      const updatedUnits = await getUnitsFn({ data: { propertyId: activeProperty } });
      setUnitsMap((prev) => ({ ...prev, [activeProperty]: updatedUnits }));

      router.invalidate(); // Reload route data
    } catch (err: any) {
      console.error("Failed to create unit:", err);
      toast.error(err.message || "Failed to create unit.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (!unit) return;
    setEditUnitNumber(unit.number);
    setEditUnitRent(unit.rent.toString());
    setEditUnitSqft(unit.sqft ? unit.sqft.toString() : "");
    setEditUnitBeds(unit.beds ? unit.beds.toString() : "");
    setEditUnitBaths(unit.baths ? unit.baths.toString() : "");
    setEditUnitStatus(unit.status);
    setShowEditUnit(true);
  };

  const handleSaveEditUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !activeProperty) return;
    setIsLoading(true);
    try {
      await updateUnitFn({
        data: {
          id: unit.id,
          unitNumber: editUnitNumber,
          rent: parseFloat(editUnitRent) || 0,
          sqft: parseInt(editUnitSqft) || undefined,
          beds: parseInt(editUnitBeds) || undefined,
          baths: parseInt(editUnitBaths) || undefined,
          status: editUnitStatus,
        },
      });
      setShowEditUnit(false);
      toast.success("Unit details updated successfully.");

      // Re-fetch and update local units state for immediate UI update
      const updatedUnits = await getUnitsFn({ data: { propertyId: activeProperty } });
      setUnitsMap((prev) => ({ ...prev, [activeProperty]: updatedUnits }));

      router.invalidate(); // Reload route data
    } catch (err: any) {
      console.error("Failed to save unit:", err);
      toast.error(err.message || "Failed to save unit details.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Empty state ─────────────────────────────────────────
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Building2 className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-xl font-semibold tracking-tight">Add your first property</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Properties are the foundation of your portfolio. Add a building to start managing units, tenants, and leases.
        </p>
        <Button className="mt-6" onClick={() => setShowAddProperty(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Property
        </Button>

        {/* Add Property Dialog (also used in the main view below) */}
        <AddPropertyDialog
          open={showAddProperty}
          onOpenChange={setShowAddProperty}
          name={propName}
          address={propAddress}
          onNameChange={setPropName}
          onAddressChange={setPropAddress}
          onSubmit={handleCreateProperty}
          isLoading={isLoading}
        />
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
        <Button onClick={() => setShowAddProperty(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Property
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {properties.map((p) => {
          const pct = p.units > 0 ? Math.round((p.occupied / p.units) * 100) : 0;
          const isActive = p.id === activeProperty;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectProperty(p.id)}
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
                <Badge variant="secondary">{p.units} units</Badge>
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

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{properties.find((p) => p.id === activeProperty)?.name} · Units</h3>
              <p className="text-xs text-muted-foreground">Click a tile to view details</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Legend color="bg-success" label="Occupied" />
              <Legend color="bg-destructive" label="Vacant" />
              <Legend color="bg-warning" label="Maintenance" />
              <Button size="sm" variant="outline" onClick={() => setShowAddUnit(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Unit
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
            {visibleUnits.map((u) => {
              const s = statusStyle[u.status];
              return (
                <button
                  key={u.id}
                  onClick={() => setOpenUnit(u.id)}
                  className={`group flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-2 text-center transition hover:scale-[1.03] ${s.bg}`}
                >
                  <span className={`text-base font-bold ${s.text}`}>{u.number}</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
                </button>
              );
            })}
            {visibleUnits.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No units yet — add your first unit to get started
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unit detail dialog */}
      <Dialog open={!!unit} onOpenChange={(o) => !o && setOpenUnit(null)}>
        <DialogContent className="sm:max-w-lg">
          {unit && (
            <>
              <DialogHeader>
                <DialogTitle>Unit {unit.number}</DialogTitle>
                <DialogDescription>
                  {properties.find((p) => p.id === unit.propertyId)?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Current tenant</p>
                  <p className="text-sm font-medium">{unit.tenant ?? "— Vacant —"}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Stat label="Rent" value={`$${unit.rent.toLocaleString()}`} />
                  <Stat label="Sqft" value={unit.sqft.toString()} />
                  <Stat label="Beds / Baths" value={`${unit.beds}/${unit.baths}`} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleOpenEdit}>Edit unit</Button>
                {unit.tenant && <Button>View tenant</Button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Property dialog */}
      <AddPropertyDialog
        open={showAddProperty}
        onOpenChange={setShowAddProperty}
        name={propName}
        address={propAddress}
        onNameChange={setPropName}
        onAddressChange={setPropAddress}
        onSubmit={handleCreateProperty}
        isLoading={isLoading}
      />

      {/* Add Unit dialog */}
      <Dialog open={showAddUnit} onOpenChange={setShowAddUnit}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateUnit}>
            <DialogHeader>
              <DialogTitle>Add Unit</DialogTitle>
              <DialogDescription>
                Add a new unit to {properties.find((p) => p.id === activeProperty)?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit-number">Unit number</Label>
                <Input id="unit-number" placeholder="e.g. 101, 2A" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit-rent">Monthly rent ($)</Label>
                <Input id="unit-rent" type="number" step="0.01" placeholder="2400" value={unitRent} onChange={(e) => setUnitRent(e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unit-sqft">Sqft</Label>
                  <Input id="unit-sqft" type="number" placeholder="800" value={unitSqft} onChange={(e) => setUnitSqft(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit-beds">Beds</Label>
                  <Input id="unit-beds" type="number" placeholder="2" value={unitBeds} onChange={(e) => setUnitBeds(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit-baths">Baths</Label>
                  <Input id="unit-baths" type="number" placeholder="1" value={unitBaths} onChange={(e) => setUnitBaths(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddUnit(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Unit"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Unit dialog */}
      <Dialog open={showEditUnit} onOpenChange={setShowEditUnit}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveEditUnit}>
            <DialogHeader>
              <DialogTitle>Edit Unit</DialogTitle>
              <DialogDescription>
                Modify unit details and status.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-unit-number">Unit number</Label>
                <Input id="edit-unit-number" placeholder="e.g. 101, 2A" value={editUnitNumber} onChange={(e) => setEditUnitNumber(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-unit-rent">Monthly rent ($)</Label>
                <Input id="edit-unit-rent" type="number" step="0.01" placeholder="2400" value={editUnitRent} onChange={(e) => setEditUnitRent(e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-unit-sqft">Sqft</Label>
                  <Input id="edit-unit-sqft" type="number" placeholder="800" value={editUnitSqft} onChange={(e) => setEditUnitSqft(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-unit-beds">Beds</Label>
                  <Input id="edit-unit-beds" type="number" placeholder="2" value={editUnitBeds} onChange={(e) => setEditUnitBeds(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-unit-baths">Baths</Label>
                  <Input id="edit-unit-baths" type="number" placeholder="1" value={editUnitBaths} onChange={(e) => setEditUnitBaths(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-unit-status">Status</Label>
                <Select value={editUnitStatus} onValueChange={(val: any) => setEditUnitStatus(val)}>
                  <SelectTrigger id="edit-unit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied" disabled={unit?.tenant ? false : true}>Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                {!unit?.tenant && editUnitStatus === "occupied" && (
                  <p className="text-[10px] text-muted-foreground mt-1">To mark as occupied, assign a tenant by sending them an invitation.</p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowEditUnit(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shared UI helpers ─────────────────────────────────────

function AddPropertyDialog({
  open, onOpenChange, name, address, onNameChange, onAddressChange, onSubmit, isLoading,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  name: string; address: string;
  onNameChange: (v: string) => void; onAddressChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
            <DialogDescription>Add a new building to your portfolio</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="prop-name">Property name</Label>
              <Input id="prop-name" placeholder="e.g. Maple Heights" value={name} onChange={(e) => onNameChange(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-address">Address</Label>
              <Input id="prop-address" placeholder="1200 Maple Ave, Brooklyn, NY" value={address} onChange={(e) => onAddressChange(e.target.value)} required />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Property"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
