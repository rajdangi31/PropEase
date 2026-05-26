import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Lock, ShieldCheck, FileText, Loader2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getTenantDashboardFn, getMyPaymentsAsTenantFn, payRentFn } from "@/lib/data-server";

export const Route = createFileRoute("/tenant/pay")({
  loader: () =>
    Promise.all([getTenantDashboardFn(), getMyPaymentsAsTenantFn()]).then(
      ([dashboard, history]) => ({ dashboard, history })
    ),
  component: PayRent,
});

function PayRent() {
  const { dashboard, history } = Route.useLoaderData();
  const router = useRouter();
  
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("12 / 27");
  const [cvc, setCvc] = useState("123");
  const [zip, setZip] = useState("11201");
  const [isPaying, setIsPaying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Receipt dialog fields
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaying(true);
    setMessage(null);
    try {
      await payRentFn({ data: { cardNumber } });
      setMessage({ type: "success", text: "Payment processed successfully!" });
      setTimeout(() => {
        router.invalidate();
        setCardNumber("");
        setIsPaying(false);
      }, 1000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to process payment." });
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Pay Rent</h2>
        <p className="text-sm text-muted-foreground">Manage your rent payments and check your billing ledger</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left / Main column */}
        <div className="lg:col-span-2 space-y-6">
          {!dashboard.hasLease ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <CreditCard className="h-8 w-8" />
                </div>
                <h2 className="mt-6 text-xl font-semibold tracking-tight">No active lease</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  You don't have an active lease yet. Once your landlord assigns you to a unit, you'll be able to pay rent here.
                </p>
              </CardContent>
            </Card>
          ) : dashboard.balance === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="mt-6 text-xl font-semibold tracking-tight">You're all caught up!</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  No pending balance. Your rent is fully paid for the current period. Thank you!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Payment details</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {message && (
                    <div
                      className={`rounded-md p-3 text-sm ${
                        message.type === "success"
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Amount</Label>
                      <Input value={`$${dashboard.balance}`} disabled className="opacity-70 cursor-not-allowed" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Due date</Label>
                      <Input value={dashboard.dueDate} disabled className="opacity-70 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="card-number">Card number</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="card-number"
                        className="pl-9"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input id="cvc" value={cvc} onChange={(e) => setCvc(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="zip">ZIP</Label>
                      <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" className="h-12 w-full text-base" disabled={isPaying}>
                    {isPaying ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="mr-1.5 h-4 w-4" />
                    )}
                    {isPaying ? "Processing..." : `Pay $${dashboard.balance.toLocaleString()}`}
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Secured by Stripe · Sandbox Demo
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div>
          <Card>
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Monthly rent" value={`$${dashboard.rent}`} />
              <Row label="Late fee" value="$0" />
              <Row label="Other charges" value="$0" />
              <div className="border-t border-border pt-3" />
              <Row label="Total due" value={`$${dashboard.balance}`} bold />
              <Badge variant="secondary" className="mt-2 w-full justify-center py-1.5">Auto-pay available</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Full width ledger table */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" /> Rent Ledger & Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No billing history or invoices found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((p: any, i: number) => (
                    <TableRow key={p.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                      <TableCell className="text-sm font-medium">{p.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Monthly Rent Payment</TableCell>
                      <TableCell className="font-semibold">${p.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {p.status === "Paid" ? (
                          <Badge className="bg-success/15 text-success hover:bg-success/15">✅ Paid</Badge>
                        ) : p.status === "Pending" ? (
                          <Badge variant="outline" className="border-warning/50 text-warning">⏳ Pending</Badge>
                        ) : p.status === "Failed" ? (
                          <Badge variant="outline" className="border-destructive/50 text-destructive">🔴 Failed</Badge>
                        ) : (
                          <Badge variant="outline" className="border-destructive/50 text-destructive">🔴 Late</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "Paid" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPaymentForReceipt({
                                id: p.id,
                                tenant: "You (Tenant)",
                                unit: dashboard.unitLabel || "Active Unit",
                                amount: p.amount,
                                due: p.dueDate,
                                paidDate: p.paidDate,
                                category: p.category,
                              });
                              setIsReceiptDialogOpen(true);
                            }}
                          >
                            <FileText className="mr-1 h-3.5 w-3.5" /> Receipt
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

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
                    <p className="font-mono font-medium mt-0.5">REC-{selectedPaymentForReceipt.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Date</p>
                    <p className="font-medium mt-0.5">{selectedPaymentForReceipt.paidDate || selectedPaymentForReceipt.due || "N/A"}</p>
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
                    <p className="font-medium mt-0.5 uppercase text-xs tracking-wider">{selectedPaymentForReceipt.category || "rent"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="font-medium mt-0.5">Stripe Secure Sandbox</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-base px-2">
                <span className="font-medium text-muted-foreground">Total Paid</span>
                <span className="font-bold text-2xl text-foreground">
                  ${selectedPaymentForReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <DialogFooter className="sm:justify-between gap-2 pt-2">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => window.print()}>
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span><span>{value}</span>
    </div>
  );
}
