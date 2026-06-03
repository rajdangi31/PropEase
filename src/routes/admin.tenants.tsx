import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Mail,
  Plus,
  Search,
  Users,
  Copy,
  Check,
  FileText,
  Download,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Ban,
} from "lucide-react";
import {
  getTenantDocumentsFn,
  updateDocumentStatusFn,
  downloadDocumentFn,
} from "@/lib/document-server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getMyTenantsFn, renewLeaseFn, terminateLeaseFn } from "@/lib/data-server";
import { getMyPropertiesFn } from "@/lib/property-server";
import { InviteTenantModal } from "@/components/admin/InviteTenantModal";
import type { TenantRow } from "@/db/queries";

import { z } from "zod";

export const Route = createFileRoute("/admin/tenants")({
  validateSearch: z.object({
    page: z.number().catch(1),
    limit: z.number().catch(50),
    q: z.string().catch(""),
  }),
  loaderDeps: ({ search: { page, limit, q } }) => ({ page, limit, q }),
  loader: async ({ deps: { page, limit, q } }) => {
    const tenantsData = await getMyTenantsFn({ data: { page, limit, q } });
    const properties = await getMyPropertiesFn();
    return { tenants: tenantsData.data, total: tenantsData.total, page, limit, q, properties };
  },
  component: TenantsPage,
});

function TenantsPage() {
  const { tenants, total, page, limit, q: initialQ, properties } = Route.useLoaderData();
  const router = useRouter();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(initialQ);
  const [selectedTenantForDocs, setSelectedTenantForDocs] = useState<TenantRow | null>(null);
  const [tenantDocs, setTenantDocs] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Lease Lifecycle states
  const [renewingLease, setRenewingLease] = useState<{
    leaseId: string;
    tenantName: string;
    currentRent: number;
  } | null>(null);
  const [terminatingLease, setTerminatingLease] = useState<{
    leaseId: string;
    tenantName: string;
  } | null>(null);
  const [newEndDate, setNewEndDate] = useState("");
  const [newRent, setNewRent] = useState("");
  const [isRenewing, setIsRenewing] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  // Debounce search update to URL
  useEffect(() => {
    const t = setTimeout(() => {
      router.navigate({ to: ".", search: { page: 1, limit, q }, replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [q, limit]); // We omit router.navigate to avoid dependency issues if router isn't stable

  const totalPages = Math.ceil(total / limit);

  const handleViewDocuments = async (tenant: TenantRow) => {
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
      const response = await downloadDocumentFn({ data: { id } }) as unknown as Response;
      
      // The server function now returns a Response containing the file stream
      if (response instanceof Response) {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        
        // Extract filename from Content-Disposition header if possible
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = "document";
        if (contentDisposition && contentDisposition.includes("filename=")) {
          filename = contentDisposition.split("filename=")[1].replace(/"/g, "");
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback if the interceptor unwrapped it to something else
        const fileData = response as any;
        if (fileData.content) {
          const link = document.createElement("a");
          link.href = `data:${fileData.contentType};base64,${fileData.content}`;
          link.download = fileData.name || "document";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      
      toast.success("Download complete.");
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

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingLease || !newEndDate || !newRent) return;
    setIsRenewing(true);
    try {
      await renewLeaseFn({
        data: {
          leaseId: renewingLease.leaseId,
          newEndDate,
          newRent: Number(newRent),
        },
      });
      toast.success(`Lease successfully renewed for ${renewingLease.tenantName}!`);
      setRenewingLease(null);
      setNewEndDate("");
      setNewRent("");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to renew lease.");
    } finally {
      setIsRenewing(false);
    }
  };

  const handleTerminateSubmit = async () => {
    if (!terminatingLease) return;
    setIsTerminating(true);
    try {
      await terminateLeaseFn({
        data: {
          leaseId: terminatingLease.leaseId,
        },
      });
      toast.success(`Lease terminated for ${terminatingLease.tenantName}. Unit is now vacant.`);
      setTerminatingLease(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to terminate lease.");
    } finally {
      setIsTerminating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight font-display">Tenants</h2>
          <p className="text-sm text-muted-foreground font-medium">
            {total} active across your portfolio
          </p>
        </div>
        <InviteTenantModal properties={properties} />
      </div>

      {tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-border/50 rounded-xl bg-card/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-6">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">No active tenants yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Generate and send a secure sign-up link using the "Invite Tenant" button above.
          </p>
        </div>
      ) : (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b border-border/50 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search tenants..."
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5">
                  <TableHead className="font-semibold">Tenant</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Unit</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">Lease ends</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">Rent</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t, i) => (
                  <TableRow key={t.id} className="hover:bg-muted/5 transition-colors">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/40">
                          <AvatarFallback className="bg-accent/10 text-xs font-bold text-accent">
                            {t.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight text-foreground">
                            {t.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground font-medium mt-0.5">
                            {t.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm font-medium md:table-cell">
                      {t.unit}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell font-medium">
                      {t.leaseEnd}
                    </TableCell>
                    <TableCell className="hidden text-sm lg:table-cell font-semibold">
                      ${t.rent.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-success/15 border-success/30 text-success font-semibold text-[10px] uppercase rounded-full px-2.5 py-0.5"
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewDocuments(t)}
                          className="h-8 w-8 text-muted-foreground hover:text-accent hover:bg-accent/10"
                          title="View Documents"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setRenewingLease({
                              leaseId: t.leaseId,
                              tenantName: t.name,
                              currentRent: t.rent,
                            });
                            setNewRent(String(t.rent));
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-success hover:bg-success/10"
                          title="Renew Lease"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setTerminatingLease({
                              leaseId: t.leaseId,
                              tenantName: t.name,
                            })
                          }
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Terminate Lease"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tenants.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-sm text-muted-foreground font-medium"
                    >
                      No tenants match your search
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tenants
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => navigate({ search: { page: page - 1, limit, q }, replace: true })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => navigate({ search: { page: page + 1, limit, q }, replace: true })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Landlord Documents Dialog */}
      <Dialog
        open={!!selectedTenantForDocs}
        onOpenChange={(open) => !open && setSelectedTenantForDocs(null)}
      >
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
                          <Badge
                            variant="outline"
                            className={`gap-1 font-medium capitalize text-[10px] py-0.5 px-2 rounded-full ${statusStyles[doc.status] || ""}`}
                          >
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
                                  className="h-8 w-8 bg-success/10 hover:bg-success/20 text-success border border-success/20"
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

      {/* Renew Lease Dialog */}
      <Dialog open={!!renewingLease} onOpenChange={(open) => !open && setRenewingLease(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRenewSubmit}>
            <DialogHeader>
              <DialogTitle>Renew Lease for {renewingLease?.tenantName}</DialogTitle>
              <DialogDescription>
                Set a new end date and optional rent adjustment. The new lease starts the day after
                the current lease ends.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="newRent">New Monthly Rent ($)</Label>
                <Input
                  id="newRent"
                  type="number"
                  value={newRent}
                  onChange={(e) => setNewRent(e.target.value)}
                  placeholder="e.g. 1600"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Current Rent: ${renewingLease?.currentRent}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newEndDate">New Lease End Date</Label>
                <Input
                  id="newEndDate"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenewingLease(null)}
                disabled={isRenewing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenewing || !newEndDate || !newRent}>
                {isRenewing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Renewing...
                  </>
                ) : (
                  "Renew Lease"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terminate Lease Dialog */}
      <Dialog open={!!terminatingLease} onOpenChange={(open) => !open && setTerminatingLease(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terminate Lease for {terminatingLease?.tenantName}</DialogTitle>
            <DialogDescription>
              Are you sure you want to terminate this lease? This action will set the unit status
              back to <strong>vacant</strong> immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-destructive/10 p-3.5 border border-destructive/20 text-xs text-destructive flex gap-2 mt-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-normal font-semibold">
              Warning: This is irreversible. Current billing schedules for this tenancy will stop
              and the tenant profile will be unlinked from the active unit.
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerminatingLease(null)}
              disabled={isTerminating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleTerminateSubmit}
              disabled={isTerminating}
            >
              {isTerminating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Terminating...
                </>
              ) : (
                "Terminate Lease"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
