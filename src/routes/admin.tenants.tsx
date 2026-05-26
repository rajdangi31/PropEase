import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Plus, Search, Users, Copy, Check, FileText, Download, X, Loader2, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import { getTenantDocumentsFn, updateDocumentStatusFn, downloadDocumentFn } from "@/lib/document-server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getMyTenantsFn } from "@/lib/data-server";
import { getMyPropertiesFn, getUnitsFn, createInviteFn } from "@/lib/property-server";

export const Route = createFileRoute("/admin/tenants")({
  loader: async () => {
    const tenants = await getMyTenantsFn();
    const properties = await getMyPropertiesFn();
    return { tenants, properties };
  },
  component: TenantsPage,
});

function InviteModal({ properties }: { properties: any[] }) {
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
        }
      });
      // Generate full URL
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
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1.5 h-4 w-4" /> Invite Tenant</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Tenant</DialogTitle>
          <DialogDescription>
            Generate a secure sign-up link. The tenant will automatically be assigned to the selected unit and a lease will be created using these terms.
          </DialogDescription>
        </DialogHeader>
        
        {inviteLink ? (
          <div className="flex flex-col space-y-4 pt-4">
            <div className="rounded-md bg-accent/10 p-4 border border-accent/20">
              <p className="text-sm text-accent-foreground font-medium mb-2">Invitation Link Generated!</p>
              <div className="flex items-center space-x-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs text-muted-foreground" />
                <Button size="icon" variant="secondary" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId} required>
                <SelectTrigger><SelectValue placeholder="Select property..." /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unitId} onValueChange={setUnitId} required disabled={!propertyId || isLoadingUnits}>
                <SelectTrigger><SelectValue placeholder={isLoadingUnits ? "Loading..." : "Select vacant unit..."} /></SelectTrigger>
                <SelectContent>
                  {units.filter(u => u.status === "vacant").map((u) => (
                    <SelectItem key={u.id} value={u.id}>Unit {u.unitNumber} (${(u.currentMarketRent / 100).toLocaleString()})</SelectItem>
                  ))}
                  {units.filter(u => u.status === "vacant").length === 0 && (
                    <SelectItem value="none" disabled>No vacant units</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tenant Email (Optional)</Label>
              <Input type="email" placeholder="tenant@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Rent ($)</Label>
                <Input type="number" placeholder="1500" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required />
              </div>
              <div className="space-y-2 text-transparent select-none"><Label>_</Label><Input disabled className="border-transparent bg-transparent" /></div>
              <div className="space-y-2">
                <Label>Lease Start</Label>
                <Input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Lease End</Label>
                <Input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} required />
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate Link"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TenantsPage() {
  const { tenants, properties } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [selectedTenantForDocs, setSelectedTenantForDocs] = useState<any | null>(null);
  const [tenantDocs, setTenantDocs] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = tenants.filter((t) =>
    [t.name, t.email, t.unit].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );

  const handleViewDocuments = async (tenant: any) => {
    setSelectedTenantForDocs(tenant);
    setIsLoadingDocs(true);
    try {
      const docs = await getTenantDocumentsFn({ data: { tenantId: tenant.id } });
      setTenantDocs(docs);
    } catch (err: any) {
      toast.error("Failed to load documents: " + err.message);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const fileData = await downloadDocumentFn({ data: { id } });
      const link = document.createElement("a");
      link.href = `data:${fileData.contentType};base64,${fileData.content}`;
      link.download = fileData.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started.");
    } catch (err: any) {
      toast.error(err.message || "Failed to download document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    setUpdatingId(id);
    try {
      await updateDocumentStatusFn({ data: { id, status } });
      toast.success(`Document ${status} successfully.`);
      if (selectedTenantForDocs) {
        const docs = await getTenantDocumentsFn({ data: { tenantId: selectedTenantForDocs.id } });
        setTenantDocs(docs);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Tenants</h2>
          <p className="text-sm text-muted-foreground">{tenants.length} active across your portfolio</p>
        </div>
        <InviteModal properties={properties} />
      </div>
      
      {tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-xl font-semibold tracking-tight">No tenants yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Click "Invite Tenant" to generate a secure sign-up link for your first tenant.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenants..." className="pl-9" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="hidden md:table-cell">Unit</TableHead>
                  <TableHead className="hidden lg:table-cell">Lease ends</TableHead>
                  <TableHead className="hidden lg:table-cell">Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t, i) => (
                  <TableRow key={t.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-accent/15 text-xs text-accent">
                            {t.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{t.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{t.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{t.unit}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{t.leaseEnd}</TableCell>
                    <TableCell className="hidden text-sm lg:table-cell">${t.rent.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1.5">
                      <Button size="icon" variant="ghost" onClick={() => handleViewDocuments(t)} title="View Documents">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost"><Mail className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No tenants match your search
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Landlord Documents Dialog */}
      <Dialog open={!!selectedTenantForDocs} onOpenChange={(open) => !open && setSelectedTenantForDocs(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documents for {selectedTenantForDocs?.name}</DialogTitle>
            <DialogDescription>
              Review uploaded files and verification proofs for this tenant.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDocs ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              Loading tenant documents...
            </div>
          ) : tenantDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground gap-1.5 border border-dashed border-border rounded-xl">
              <FileText className="h-8 w-8 opacity-45 mb-1.5 text-accent" />
              No documents submitted by this tenant yet.
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto border rounded-lg border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantDocs.map((doc) => {
                    const docTypeLabels: Record<string, string> = {
                      lease_doc: "Lease Agreement",
                      id_proof: "ID Proof",
                      income_proof: "Income Verification",
                      inspection_report: "Inspection Report",
                    };
                    const statusStyles: Record<string, string> = {
                      pending_review: "bg-warning/15 text-warning border-warning/30",
                      approved: "bg-success/15 text-success border-success/30",
                      rejected: "bg-destructive/15 text-destructive border-destructive/30",
                    };
                    const statusLabels: Record<string, string> = {
                      pending_review: "Pending Review",
                      approved: "Approved",
                      rejected: "Rejected",
                    };
                    return (
                      <TableRow key={doc.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="font-medium">
                          <span className="truncate max-w-[180px] block" title={doc.name}>
                            {doc.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {docTypeLabels[doc.type] || doc.type}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 font-medium capitalize text-[10px] py-0.5 px-2 rounded-full ${statusStyles[doc.status] || ""}`}>
                            {doc.status === "approved" ? (
                              <CheckCircle className="h-2.5 w-2.5" />
                            ) : doc.status === "rejected" ? (
                              <AlertCircle className="h-2.5 w-2.5" />
                            ) : (
                              <HelpCircle className="h-2.5 w-2.5" />
                            )}
                            {statusLabels[doc.status] || doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleDownload(doc.id)}
                              disabled={downloadingId === doc.id}
                              className="h-8 w-8"
                              title="Download File"
                            >
                              {downloadingId === doc.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {doc.status === "pending_review" && (
                              <>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  onClick={() => handleUpdateStatus(doc.id, "approved")}
                                  disabled={updatingId === doc.id}
                                  className="h-8 w-8 bg-success/10 hover:bg-success/20 text-success border border-success/20 animate-pulse hover:animate-none"
                                  title="Approve"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  onClick={() => handleUpdateStatus(doc.id, "rejected")}
                                  disabled={updatingId === doc.id}
                                  className="h-8 w-8 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20"
                                  title="Reject"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
