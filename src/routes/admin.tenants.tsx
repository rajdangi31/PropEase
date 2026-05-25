import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Plus, Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useTenants } from "@/hooks/useApi";

export const Route = createFileRoute("/admin/tenants")({
  component: TenantsPage,
});

function TenantsPage() {
  const [q, setQ] = useState("");
  const { data: tenants, isLoading } = useTenants();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const safeTenants = tenants || [];
  const filtered = safeTenants.filter((t: any) =>
    [t.firstName, t.lastName, t.email].some((v) => v?.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Tenants</h2>
          <p className="text-sm text-muted-foreground">{safeTenants.length} active across your portfolio</p>
        </div>
        <Button><Plus className="mr-1.5 h-4 w-4" /> Invite Tenant</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenants..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Building</Button>
              <Button variant="outline" size="sm">Lease status</Button>
              <Button variant="outline" size="sm">Sort</Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t: any, i: number) => {
                const name = `${t.firstName} ${t.lastName}`;
                return (
                  <TableRow key={t.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-accent/15 text-xs text-accent">
                            {name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">{t.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{t.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.onboardingCompleted ? "secondary" : "outline"}
                        className={!t.onboardingCompleted ? "border-warning/50 text-warning" : ""}>
                        {t.onboardingCompleted ? "Active" : "Onboarding"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost"><Mail className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    No tenants match your search
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

