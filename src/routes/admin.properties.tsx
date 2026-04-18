import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { properties, units, type UnitStatus } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/properties")({
  component: PropertiesPage,
});

const statusStyle: Record<UnitStatus, { bg: string; text: string; label: string }> = {
  occupied: { bg: "bg-success/10 border-success/30", text: "text-success", label: "Occupied" },
  vacant:   { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", label: "Vacant" },
  notice:   { bg: "bg-warning/10 border-warning/40", text: "text-warning", label: "Notice" },
};

function PropertiesPage() {
  const [activeProperty, setActiveProperty] = useState(properties[0].id);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const visibleUnits = units.filter((u) => u.propertyId === activeProperty);
  const unit = openUnit ? units.find((u) => u.id === openUnit) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Properties</h2>
          <p className="text-sm text-muted-foreground">Manage your buildings and units</p>
        </div>
        <Button><Plus className="mr-1.5 h-4 w-4" /> Add Property</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {properties.map((p) => {
          const pct = Math.round((p.occupied / p.units) * 100);
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
              <Legend color="bg-warning" label="Notice" />
              <Button size="sm" variant="outline"><Plus className="mr-1 h-3.5 w-3.5" /> Unit</Button>
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
