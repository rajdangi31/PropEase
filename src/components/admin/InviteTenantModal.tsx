import { useState, useEffect } from "react";
import { Plus, Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUnitsFn, createInviteFn } from "@/lib/property-server";

export function InviteTenantModal({ properties }: { properties: any[] }) {
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [email, setEmail] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");

  const [units, setUnits] = useState<any[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (propertyId) {
      setIsLoadingUnits(true);
      setUnitId("");
      getUnitsFn({ data: { propertyId } })
        .then(setUnits)
        .catch(console.error)
        .finally(() => setIsLoadingUnits(false));
    } else {
      setUnits([]);
    }
  }, [propertyId]);

  useEffect(() => {
    if (unitId && units.length > 0) {
      const selectedUnit = units.find((u) => u.id === unitId);
      if (selectedUnit) {
        setRentAmount(selectedUnit.rent.toString());
      }
    }
  }, [unitId, units]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const invite = await createInviteFn({
        data: {
          propertyId,
          unitId,
          email: email || undefined,
          rentAmount: Number(rentAmount),
          leaseStart,
          leaseEnd,
        },
      });
      const url = new URL(window.location.href);
      setInviteLink(`${url.protocol}//${url.host}/auth?invite=${invite.id}`);
    } catch (err) {
      console.error(err);
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
        setUnitId("");
        setEmail("");
        setRentAmount("");
        setLeaseStart("");
        setLeaseEnd("");
        setInviteLink("");
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Invite Tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Tenant</DialogTitle>
          <DialogDescription>
            Generate a secure sign-up link. The tenant will automatically be assigned to the
            selected unit and a lease will be created using these terms.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="flex flex-col space-y-4 pt-4">
            <div className="rounded-md bg-accent/10 p-4 border border-accent/20">
              <p className="text-sm text-accent-foreground font-medium mb-2">
                Invitation Link Generated!
              </p>
              <div className="flex items-center space-x-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-xs text-muted-foreground"
                />
                <Button size="icon" variant="secondary" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select property..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={unitId}
                onValueChange={setUnitId}
                required
                disabled={!propertyId || isLoadingUnits}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingUnits ? "Loading..." : "Select vacant unit..."}
                  />
                </SelectTrigger>
                <SelectContent>
                  {units
                    .filter((u) => u.status === "vacant")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        Unit {u.number} (${u.rent.toLocaleString()})
                      </SelectItem>
                    ))}
                  {units.filter((u) => u.status === "vacant").length === 0 && (
                    <SelectItem value="none" disabled>
                      No vacant units
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tenant Email (Optional)</Label>
              <Input
                type="email"
                placeholder="tenant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Rent ($)</Label>
                <Input
                  type="number"
                  placeholder="1500"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 text-transparent select-none">
                <Label>_</Label>
                <Input disabled className="border-transparent bg-transparent" />
              </div>
              <div className="space-y-2">
                <Label>Lease Start</Label>
                <Input
                  type="date"
                  value={leaseStart}
                  onChange={(e) => setLeaseStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Lease End</Label>
                <Input
                  type="date"
                  value={leaseEnd}
                  onChange={(e) => setLeaseEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Link"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
