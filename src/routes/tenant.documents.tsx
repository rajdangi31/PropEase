import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Upload, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMyDocuments } from "@/hooks/useApi";

export const Route = createFileRoute("/tenant/documents")({
  component: TenantDocuments,
});

function TenantDocuments() {
  const { data: documents, isLoading, error } = useMyDocuments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My Documents</h2>
          <p className="text-sm text-muted-foreground">Lease, agreements, and personal files</p>
        </div>
        <Button><Upload className="mr-1.5 h-4 w-4" /> Upload</Button>
      </div>
      
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || !documents ? (
        <p className="text-sm text-destructive">Failed to load documents.</p>
      ) : documents.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No documents found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((d: any) => (
            <Card key={d.id} className="transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.fileSize}</p>
                </div>
                <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

