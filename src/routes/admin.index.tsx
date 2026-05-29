import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area, AreaChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, Building2, CreditCard, Home, Plus, Wrench,
  TrendingUp, Clock, CalendarClock, Activity, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardFn } from "@/lib/data-server";
import type { DashboardStats } from "@/db/queries";

export const Route = createFileRoute("/admin/")(({
  loader: () => getDashboardFn(),
  component: AdminDashboard,
}));

const donutColors = ["var(--success)", "var(--destructive)", "var(--warning)"];

/* ──── Helpers ───────────────────────────────────────── */

function formatCurrency(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function relativeTime(ts: string) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function actionIcon(actionType: string) {
  if (actionType.includes("PAYMENT")) return CreditCard;
  if (actionType.includes("MAINTENANCE")) return Wrench;
  if (actionType.includes("UNIT")) return Home;
  return Activity;
}

function expiryBadge(days: number) {
  if (days <= 0) return { label: "Expired", tone: "bg-destructive/15 text-destructive" };
  if (days <= 14) return { label: `${days}d left`, tone: "bg-destructive/15 text-destructive" };
  if (days <= 30) return { label: `${days}d left`, tone: "bg-warning/15 text-warning-foreground" };
  return { label: `${days}d left`, tone: "bg-success/15 text-success" };
}

/* ──── Empty State ───────────────────────────────────── */

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Building2 className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-xl font-semibold tracking-tight">Welcome to PropEase</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your dashboard will come alive once you add your first property. Start by creating a building, adding units, and assigning tenants.
      </p>
      <Button asChild className="mt-6">
        <Link to="/admin/properties"><Plus className="mr-1.5 h-4 w-4" /> Add your first property</Link>
      </Button>
    </div>
  );
}

/* ──── Main Dashboard ────────────────────────────────── */

function AdminDashboard() {
  const stats = Route.useLoaderData() as DashboardStats;

  if (!stats.hasData) return <EmptyDashboard />;

  const kpis = [
    { label: "Occupancy Rate", value: stats.occupancyRate, delta: `${stats.occupiedUnits}/${stats.totalUnits} units`, icon: Home, tone: "success" as const },
    { label: "Rent Collected", value: formatCurrency(stats.collectedRevenue), delta: `${formatCurrency(stats.pendingRevenue)} pending`, icon: CreditCard, tone: stats.pendingRevenue > 0 ? "warning" as const : "success" as const },
    { label: "Open Requests", value: String(stats.openRequests), delta: `${stats.highPriorityRequests} high priority`, icon: Wrench, tone: stats.highPriorityRequests > 0 ? "warning" as const : "success" as const },
    { label: "Total Units", value: String(stats.totalUnits), delta: `${stats.vacantUnits} vacant`, icon: TrendingUp, tone: "success" as const },
  ];

  const unitStatusBreakdown = [
    { name: "Occupied", value: stats.occupiedUnits },
    { name: "Vacant", value: stats.vacantUnits },
    { name: "Maintenance", value: stats.maintenanceUnits },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden border-0 shadow-soft transition-shadow hover:shadow-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{k.value}</p>
                  <p className={`mt-1 text-xs ${k.tone === "success" ? "text-success" : "text-warning"}`}>
                    <ArrowUpRight className="mr-0.5 inline h-3 w-3" /> {k.delta}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Revenue Area Chart */}
        <Card className="lg:col-span-3 border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
            <CardDescription className="text-xs">Collected vs. pending rent — last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pr-2">
            {stats.revenueTimeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueTimeSeries} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--warning)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, boxShadow: "var(--shadow-soft)" }}
                    formatter={(val: number) => [`$${val.toLocaleString()}`, undefined]}
                  />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="var(--success)" fill="url(#gradCollected)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }} />
                  <Area type="monotone" dataKey="pending" name="Pending" stroke="var(--warning)" fill="url(#gradPending)" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No revenue data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Donut chart */}
        {unitStatusBreakdown.length > 0 && (
          <Card className="lg:col-span-2 border-0 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Unit Status</CardTitle>
              <CardDescription className="text-xs">Across all properties</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={unitStatusBreakdown} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="var(--card)" strokeWidth={3}>
                    {unitStatusBreakdown.map((_, i) => (
                      <Cell key={i} fill={donutColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Row: Activity + Expiring Leases */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <CardDescription className="text-xs">Latest actions across your portfolio</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-1">
                {stats.recentActivity.map((a) => {
                  const Icon = actionIcon(a.actionType);
                  return (
                    <div key={a.id} className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug break-words whitespace-pre-wrap">{a.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.actorName} · <Clock className="mr-0.5 inline h-3 w-3" />{relativeTime(a.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">No recent activity yet</p>
                <p className="text-xs text-muted-foreground/70">Actions like payments and maintenance updates will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Leases */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Upcoming Lease Expirations</CardTitle>
              <CardDescription className="text-xs">Leases ending within 90 days</CardDescription>
            </div>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.expiringLeases.length > 0 ? (
              <div className="space-y-1">
                {stats.expiringLeases.map((lease) => {
                  const badge = expiryBadge(lease.daysUntilExpiry);
                  return (
                    <div key={lease.leaseId} className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-snug">{lease.unitLabel}</p>
                          <p className="text-xs text-muted-foreground">{lease.tenantName} · ends {lease.endDate}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`shrink-0 text-[10px] font-semibold ${badge.tone}`}>
                        {badge.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarClock className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">No leases expiring soon</p>
                <p className="text-xs text-muted-foreground/70">Active leases within 90 days of expiry will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
