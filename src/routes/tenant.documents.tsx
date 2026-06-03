import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Download,
  FileText,
  Upload,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import { getMyDocumentsFn, uploadDocumentFn, downloadDocumentFn } from "@/lib/document-server";

export const Route = createFileRoute("/tenant/documents")({
  loader: async () => {
    return getMyDocumentsFn();
  },
  component: TenantDocuments,
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

function TenantDocuments() {
  const documents = Route.useLoaderData();
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState<DocType>("id_proof");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", selectedFile.name);
      formData.append("type", docType);

      await uploadDocumentFn({ data: formData as any });
      
      toast.success("Document uploaded successfully.");
      setUploadOpen(false);
      setSelectedFile(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight font-display">My Documents</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Manage and upload your lease documents, ID proofs, and income verification files
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-1.5 h-4 w-4" /> Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/10">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-6">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">No documents uploaded yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground mb-6">
              Upload your verification proofs (ID/Income) or sign lease documents to keep them
              organized here.
            </p>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" /> Upload first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="font-semibold">Document Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Upload Date</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/5 transition-colors">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-accent/80 shrink-0" />
                        <span className="truncate max-w-xs md:max-w-md block" title={doc.name}>
                          {doc.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {docTypeLabels[doc.type as DocType] || doc.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {doc.createdAt.split(" ")[0]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1 font-medium capitalize py-0.5 px-2.5 rounded-full ${statusStyles[doc.status] || ""}`}
                      >
                        {doc.status === "approved" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : doc.status === "rejected" ? (
                          <AlertCircle className="h-3 w-3" />
                        ) : (
                          <HelpCircle className="h-3 w-3" />
                        )}
                        {statusLabels[doc.status] || doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(doc.id)}
                        disabled={downloadingId === doc.id}
                        className="h-8 gap-1.5"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => !open && (setUploadOpen(false), setSelectedFile(null))}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUploadSubmit}>
            <DialogHeader>
              <DialogTitle>Upload Verification Document</DialogTitle>
              <DialogDescription>
                Select the type of document you want to upload and choose the file. Only PDF,
                JPG/JPEG, PNG, and Word files are supported.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="doc-type">Document Type</Label>
                <Select value={docType} onValueChange={(val) => setDocType(val as DocType)}>
                  <SelectTrigger id="doc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id_proof">ID Proof (e.g. Passport, License)</SelectItem>
                    <SelectItem value="income_proof">
                      Income Verification (e.g. Paystubs, W2)
                    </SelectItem>
                    <SelectItem value="lease_doc">Signed Lease Agreement</SelectItem>
                    <SelectItem value="inspection_report">Inspection Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="file-upload">Choose File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  required
                  className="cursor-pointer"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading || !selectedFile} className="gap-1.5">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
