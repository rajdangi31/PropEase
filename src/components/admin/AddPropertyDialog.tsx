import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddPropertyDialog({
  open,
  onOpenChange,
  name,
  address,
  onNameChange,
  onAddressChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  address: string;
  onNameChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
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
              <Input
                id="prop-name"
                placeholder="e.g. Maple Heights"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-address">Address</Label>
              <Input
                id="prop-address"
                placeholder="1200 Maple Ave, Brooklyn, NY"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
