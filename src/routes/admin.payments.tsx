import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Download, FileText, Plus } from "lucide-react";
import { payments } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/payments")({
  component: PaymentsPage,
});

function statusBadge(s: string) {
  if (s === "Paid") return <Badge className="bg-success/15 text-success hover:bg-success/15">✅ Paid</Badge>;
  if (s === "Pending") return <Badge variant="outline" className="border-warning/50 text-warning">⏳ Pending</Badge>;
  return <Badge variant="outline" className="border-destructive/50 text-destructive">🔴 Late</Badge>;
}

function PaymentsPage() {
  const totals = {
    collected: payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0),
    pending: payments.filter((p) => p.status === "Pending").reduce((s, p) => s + p.amount, 0),
    late: payments.filter((p) => p.status === "Late").reduce((s, p) => s + p.amount, 0),
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground">Collect rent and track every transaction</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Plus className="mr-1.5 h-4 w-4" /> Log Manual Payment</Button>
          <Button><CreditCard className="mr-1.5 h-4 w-4" /> Send Invoices</Button>
        </div>
      </div>

      <Tabs defaultValue="collect">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="collect">Collect Rent</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 md:grid-cols-3">
          <Stat title="Collected this month" value={`$${totals.collected.toLocaleString()}`} tone="success" />
          <Stat title="Pending" value={`$${totals.pending.toLocaleString()}`} tone="warning" />
          <Stat title="Late" value={`$${totals.late.toLocaleString()}`} tone="error" />
        </TabsContent>

        <TabsContent value="collect" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p, i) => (
                    <TableRow key={p.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">{p.tenant}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.unit}</TableCell>
                      <TableCell className="font-semibold">${p.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.due}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-right">
                        {p.status === "Paid" ? (
                          <Button size="sm" variant="ghost"><FileText className="mr-1 h-3.5 w-3.5" /> Receipt</Button>
                        ) : (
                          <Button size="sm">Send Reminder</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Payment history</CardTitle>
              <Button variant="outline" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">All transactions across the portfolio. Filter by tenant, building, date or status.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">PDF invoices auto-generated per payment</p>
              <p className="text-sm text-muted-foreground">Tenants can download their receipts anytime from the tenant portal.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Late fee automation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle label="Auto-apply late fee" defaultChecked />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Apply after (days)</Label>
                  <Input type="number" defaultValue={5} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fee amount</Label>
                  <Input defaultValue="$50 or 5%" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-reminders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Toggle label="Send 3 days before due (Email)" defaultChecked />
              <Toggle label="Send on due date (SMS + Email)" defaultChecked />
              <Toggle label="Send 3 days after if unpaid (SMS + Email)" defaultChecked />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ title, value, tone }: { title: string; value: string; tone: "success" | "warning" | "error" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-destructive";
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
