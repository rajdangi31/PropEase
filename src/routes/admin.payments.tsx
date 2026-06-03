import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Download, FileText, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMyPaymentsFn,
  generateRentInvoicesFn,
  getLandlordActiveLeasesFn,
  createManualPaymentFn,
} from "@/lib/data-server";

export const Route = createFileRoute("/admin/payments")({
  loader: () =>
    Promise.all([getMyPaymentsFn(), getLandlordActiveLeasesFn()]).then(([payments, leases]) => ({
      payments,
      leases,
    })),
  component: PaymentsPage,
});

function statusBadge(s: string) {
  if (s === "Paid")
    return <Badge className="bg-success/15 text-success hover:bg-success/15">✅ Paid</Badge>;
  if (s === "Pending")
    return (
      <Badge variant="outline" className="border-warning/50 text-warning">
        ⏳ Pending
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-destructive/50 text-destructive">
      🔴 Late
    </Badge>
  );
}

function PaymentsPage() {
  const { payments, leases } = Route.useLoaderData();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Manual payment form fields
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<"rent" | "deposit" | "utility" | "late_fee">("rent");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);

  // Receipt dialog fields
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);

  const totals = {
    collected: payments
      .filter((p: any) => p.status === "Paid")
      .reduce((s: number, p: any) => s + p.amount, 0),
    pending: payments
      .filter((p: any) => p.status === "Pending")
      .reduce((s: number, p: any) => s + p.amount, 0),
    late: payments
      .filter((p: any) => p.status === "Late")
      .reduce((s: number, p: any) => s + p.amount, 0),
  };

  const handleLeaseChange = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    const lease = leases.find((l) => l.leaseId === leaseId);
    if (lease) {
      setAmount(lease.monthlyRent.toString());
    }
  };

  const handleSendInvoices = async () => {
    setIsGenerating(true);
    try {
      const generatedCount = await generateRentInvoicesFn();
      toast.success(`${generatedCount} rent invoice(s) generated successfully for active leases.`);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate rent invoices.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId) {
      toast.error("Please select a lease.");
      return;
    }
    const lease = leases.find((l) => l.leaseId === selectedLeaseId);
    if (!lease) return;

    setIsLoggingPayment(true);
    try {
      await createManualPaymentFn({
        data: {
          leaseId: selectedLeaseId,
          tenantId: lease.tenantId,
          amount: Math.round(parseFloat(amount) * 100),
          category,
          paidDate,
        },
      });
      toast.success("Manual payment logged successfully.");
      setIsDialogOpen(false);
      // Reset form
      setSelectedLeaseId("");
      setAmount("");
      setCategory("rent");
      setPaidDate(new Date().toISOString().split("T")[0]);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to log manual payment.");
    } finally {
      setIsLoggingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground">Collect rent and track every transaction</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Log Manual Payment
          </Button>
          <Button onClick={handleSendInvoices} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-1.5 h-4 w-4" />
            )}
            Send Invoices
          </Button>
        </div>
      </div>
      <Tabs defaultValue="collect">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="collect">Collect Rent</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 grid gap-4 md:grid-cols-3">
          <Stat
            title="Collected this month"
            value={`$${totals.collected.toLocaleString()}`}
            tone="success"
          />
          <Stat title="Pending" value={`$${totals.pending.toLocaleString()}`} tone="warning" />
          <Stat title="Late" value={`$${totals.late.toLocaleString()}`} tone="error" />
        </TabsContent>
        <TabsContent value="collect" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <CreditCard className="h-8 w-8" />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold tracking-tight">No payments yet</h2>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Payments will appear here once tenants are assigned to units with active leases.
                    Click "Send Invoices" to generate rent invoices for the current billing period.
                  </p>
                </div>
              ) : (
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
                    {payments.map((p: any, i: number) => (
                      <TableRow key={p.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{p.tenant}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.unit}</TableCell>
                        <TableCell className="font-semibold">
                          ${p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.due}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="text-right">
                          {p.status === "Paid" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPaymentForReceipt(p);
                                setIsReceiptDialogOpen(true);
                              }}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" /> Receipt
                            </Button>
                          ) : (
                            <Button size="sm">Send Reminder</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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

      {/* Log Manual Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Manual Payment</DialogTitle>
            <DialogDescription>
              Record a manual cash, check, or direct bank transfer payment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogManualPayment} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="lease-select">Select Lease / Unit</Label>
              {leases.length === 0 ? (
                <p className="text-sm text-destructive font-medium">
                  No active leases found. Please sign a lease first.
                </p>
              ) : (
                <Select value={selectedLeaseId} onValueChange={handleLeaseChange}>
                  <SelectTrigger id="lease-select">
                    <SelectValue placeholder="Select active tenant lease" />
                  </SelectTrigger>
                  <SelectContent>
                    {leases.map((l: any) => (
                      <SelectItem key={l.leaseId} value={l.leaseId}>
                        {l.tenantName} ({l.unitLabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount-input">Amount ($)</Label>
                <Input
                  id="amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category-select">Category</Label>
                <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                  <SelectTrigger id="category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="utility">Utility</SelectItem>
                    <SelectItem value="late_fee">Late Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paid-date-input">Payment Date</Label>
              <Input
                id="paid-date-input"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoggingPayment || leases.length === 0}>
                {isLoggingPayment && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Log Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-success" /> Rent Receipt
            </DialogTitle>
            <DialogDescription>
              Proof of transaction and payment verification details.
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentForReceipt && (
            <div className="space-y-6 py-4">
              <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg tracking-tight">PropEase</h3>
                    <p className="text-xs text-muted-foreground">Simplified Property Management</p>
                  </div>
                  <Badge className="bg-success/15 text-success hover:bg-success/15 py-1 px-2.5">
                    ✅ PAID
                  </Badge>
                </div>

                <div className="border-t border-border pt-4 grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Receipt Number</p>
                    <p className="font-mono font-medium mt-0.5">
                      REC-{selectedPaymentForReceipt.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Date</p>
                    <p className="font-medium mt-0.5">
                      {selectedPaymentForReceipt.paidDate || selectedPaymentForReceipt.due || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tenant</p>
                    <p className="font-medium mt-0.5">{selectedPaymentForReceipt.tenant}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unit</p>
                    <p className="font-medium mt-0.5">{selectedPaymentForReceipt.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium mt-0.5 uppercase text-xs tracking-wider">
                      {selectedPaymentForReceipt.category || "rent"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="font-medium mt-0.5">
                      {selectedPaymentForReceipt.transactionId || "Cash / Check (Logged Manually)"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-base px-2">
                <span className="font-medium text-muted-foreground">Total Paid</span>
                <span className="font-bold text-2xl text-foreground">
                  $
                  {selectedPaymentForReceipt.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <DialogFooter className="sm:justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => window.print()}
                >
                  <Download className="mr-1.5 h-4 w-4" /> Print / PDF
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => setIsReceiptDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "success" | "warning" | "error";
}) {
  const color =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-destructive";
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
