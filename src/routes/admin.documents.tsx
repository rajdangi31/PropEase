import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Loader2,
  Search,
  Filter,
  ArrowUpRight,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getDocumentsForLandlordFn,
  downloadDocumentFn,
  updateDocumentStatusFn,
} from "@/lib/document-server";

export const Route = createFileRoute("/admin/documents")({
  loader: async () => {
    return getDocumentsForLandlordFn();
  },
  component: AdminDocuments,
});

type DocType = "lease_doc" | "id_proof" | "income_proof" | "inspection_report";

const docTypeLabels: Record<DocType, string> = {
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

function AdminDocuments() {
  const documents = Route.useLoaderData();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending_review" | "approved" | "rejected"
  >("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleDownload = async (id: string, name: string) => {
    setDownloadingId(id);
    try {
      const fileData = await downloadDocumentFn({ data: { id } });
      const link = document.createElement("a");
      link.href = `data:${fileData.contentType};base64,${fileData.content}`;
      link.download = fileData.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded: ${name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    setActioningId(id);
    try {
      await updateDocumentStatusFn({ data: { id, status } });
      toast.success(`Document marked as ${status}.`);
      router.invalidate(); // Refresh page loader
    } catch (err: any) {
      toast.error(err.message || "Failed to update document status.");
    } finally {
      setActioningId(null);
    }
  };

  // Filter documents based on search term and status tab selection
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" ? true : doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const countByStatus = (status: string) => {
    return documents.filter((doc) => doc.status === status).length;
  };

  const tabs = [
    { id: "all", label: "All Documents", count: documents.length },
    { id: "pending_review", label: "Pending", count: countByStatus("pending_review") },
    { id: "approved", label: "Approved", count: countByStatus("approved") },
    { id: "rejected", label: "Rejected", count: countByStatus("rejected") },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight font-display">Document Reviews</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Verify tenant-uploaded documents, lease agreements, and verification proofs
          </p>
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden border-0 shadow-soft">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pending Review
              </p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight">
                {countByStatus("pending_review")}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-soft">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Approved Files
              </p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight">
                {countByStatus("approved")}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-soft">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Rejected Files
              </p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight">
                {countByStatus("rejected")}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Queue Layout */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5 bg-muted/30 p-1 rounded-lg border border-border/40 shrink-0 self-start">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    statusFilter === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                  }`}
                >
                  {tab.label}
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px] bg-muted/60 text-muted-foreground border-0"
                  >
                    {tab.count}
                  </Badge>
                </button>
              ))}
            </div>

            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tenant or property..."
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/60 mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">
                No matching documents found
              </h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Try clearing your search term or filtering by a different document review status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/5">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">
                      Document
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">
                      Tenant
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">
                      Property & Unit
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">
                      Uploaded
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
                            <FileText className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-medium text-sm text-foreground leading-snug truncate"
                              title={doc.name}
                            >
                              {doc.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                              {docTypeLabels[doc.type as DocType] || doc.type}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 font-medium text-sm text-foreground">
                        {doc.tenantName}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="min-w-[150px]">
                          <p className="text-sm font-medium text-foreground">{doc.propertyName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            Unit {doc.unitNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          {doc.createdAt.split(" ")[0]}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant="outline"
                          className={`gap-1 font-semibold text-[10px] uppercase py-0.5 px-2.5 rounded-full ${statusStyles[doc.status] || ""}`}
                        >
                          {doc.status === "approved" ? (
                            <Check className="h-3 w-3" />
                          ) : doc.status === "rejected" ? (
                            <X className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {statusLabels[doc.status] || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(doc.id, doc.name)}
                            disabled={downloadingId === doc.id}
                            className="h-8 w-8 p-0"
                            title="Download document"
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
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(doc.id, "approved")}
                                disabled={actioningId === doc.id}
                                className="h-8 px-2 bg-success/5 hover:bg-success/15 border-success/30 hover:border-success/50 text-success text-xs font-semibold gap-1"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(doc.id, "rejected")}
                                disabled={actioningId === doc.id}
                                className="h-8 px-2 bg-destructive/5 hover:bg-destructive/15 border-destructive/30 hover:border-destructive/50 text-destructive text-xs font-semibold gap-1"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
