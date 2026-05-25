import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowUpRight, CalendarClock, CreditCard, Home, Wrench, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminStats } from "@/hooks/useApi";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const donutColors = ["var(--success)", "var(--destructive)", "var(--warning)"];

function AdminDashboard() {
  const { data, isLoading, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive">
        Failed to load dashboard data.
      </div>
    );
  }

  const kpis = [
    { label: "Occupancy Rate", value: data.occupancyRate, delta: data.occupancyDelta, icon: Home, tone: "success" as const },
    { label: "Rent Collection", value: data.rentCollectionRate, delta: data.rentCollectionDelta, icon: CreditCard, tone: "success" as const },
    { label: "Open Requests", value: data.openRequests.toString(), delta: data.openRequestsNote, icon: Wrench, tone: "warning" as const },
    { label: "Monthly Revenue", value: data.monthlyRevenue, delta: data.revenueDelta, icon: TrendingUp, tone: "success" as const },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
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

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Revenue (last 6 months)</CardTitle>
              <p className="text-xs text-muted-foreground">Total collected rent across all properties</p>
            </div>
            <Badge variant="secondary">{data.revenueDelta}</Badge>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueSeries} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false}
                       tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unit status</CardTitle>
            <p className="text-xs text-muted-foreground">Across all properties</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.unitStatusBreakdown} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="var(--card)" strokeWidth={3}>
                  {data.unitStatusBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={donutColors[i % donutColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance + activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Maintenance response time</CardTitle>
            <p className="text-xs text-muted-foreground">Average hours from submission to first action</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.maintenanceResponse} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} unit="h" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="hours" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  a.type === "payment" ? "bg-success" : a.type === "maintenance" ? "bg-warning" : "bg-accent"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Lease alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Lease expirations · next 60 days</CardTitle>
            <p className="text-xs text-muted-foreground">Reach out before they slip into month-to-month</p>
          </div>
          <Badge variant="outline" className="gap-1"><CalendarClock className="h-3 w-3" /> {data.leaseAlerts.length} upcoming</Badge>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {data.leaseAlerts.map((l: any) => (
              <div key={l.tenant} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{l.tenant}</p>
                  <p className="text-xs text-muted-foreground">{l.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{l.date}</p>
                  <p className="text-xs text-warning">in {l.endsIn} days</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

