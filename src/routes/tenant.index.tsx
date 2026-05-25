import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CreditCard, FileText, Wrench, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenantDashboard } from "@/hooks/useApi";

export const Route = createFileRoute("/tenant/")({
  component: TenantDashboard,
});

function TenantDashboard() {
  const { data: tenantMe, isLoading, error } = useTenantDashboard();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !tenantMe) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive">
        Failed to load dashboard data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0" >
        <CardContent className="p-6 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-primary-foreground/70">Welcome back, {tenantMe.name?.split(" ")[0] || "Tenant"}</p>
              <h2 className="mt-1 text-2xl font-bold">{tenantMe.unit || "N/A"}</h2>
              <p className="mt-1 text-sm text-primary-foreground/70">Lease ends {tenantMe.leaseEnd || "N/A"}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-primary-foreground/70">Next rent due</p>
              <p className="mt-1 text-2xl font-bold">${(tenantMe.balance || 0).toLocaleString()}</p>
              <p className="text-xs text-primary-foreground/70">{tenantMe.dueDate || "N/A"}</p>
              <Button asChild size="sm" className="mt-3 bg-white text-primary hover:bg-white/90">
                <Link to="/tenant/pay">Pay rent</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ShortcutCard to="/tenant/pay" icon={CreditCard} label="Pay Rent" desc="Quick & secure" />
        <ShortcutCard to="/tenant/maintenance" icon={Wrench} label="Submit Request" desc="Need a fix?" />
        <ShortcutCard to="/tenant/documents" icon={FileText} label="Documents" desc={`${tenantMe.documents?.length || 0} files`} />
        <ShortcutCard to="/tenant/notifications" icon={CalendarClock} label="Notices" desc="See latest" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent payments</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {tenantMe.history?.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">${h.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                  </div>
                  <Badge className={h.status === "PAID" ? "bg-success/15 text-success hover:bg-success/15" : ""}>
                    {h.status}
                  </Badge>
                </div>
              ))}
              {(!tenantMe.history || tenantMe.history.length === 0) && (
                <p className="py-4 text-center text-sm text-muted-foreground">No recent payments</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">My maintenance requests</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {tenantMe.requests?.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.date}</p>
                  </div>
                  <Badge variant={r.status === "RESOLVED" ? "secondary" : "outline"}
                    className={r.status === "OPEN" ? "border-warning/50 text-warning" : ""}>
                    {r.status}
                  </Badge>
                </div>
              ))}
              {(!tenantMe.requests || tenantMe.requests.length === 0) && (
                <p className="py-4 text-center text-sm text-muted-foreground">No maintenance requests</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ShortcutCard({ to, icon: Icon, label, desc }: any) {
  return (
    <Link to={to} className="group block">
      <Card className="transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
        <CardContent className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-accent-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <p className="mt-3 font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

