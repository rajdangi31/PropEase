import { useState } from "react";
import { Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInviteFn } from "@/lib/property-server";

export function InviteWorkerModal({ properties }: { properties: { id: string; name: string }[] }) {
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
        },
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
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Invite Worker
        </Button>
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
              <Label>Worker Email (Optional)</Label>
              <Input
                type="email"
                placeholder="worker@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
