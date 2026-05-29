import { createFileRoute, useRouter, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CreditCard, Lock, ShieldCheck, FileText, Loader2, Download, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getTenantDashboardFn, getMyPaymentsAsTenantFn } from "@/lib/data-server";
import { createStripeCheckoutSessionFn, verifyStripePaymentFn } from "@/lib/stripe-server";

export const Route = createFileRoute("/tenant/pay")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: search.session_id as string | undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    Promise.all([getTenantDashboardFn(), getMyPaymentsAsTenantFn()]).then(
      ([dashboard, history]) => ({ dashboard, history, sessionId: deps.session_id })
    ),
  component: PayRent,
});

function PayRent() {
  const { dashboard, history, sessionId } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(!!sessionId);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Receipt dialog fields
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);

  useEffect(() => {
    if (sessionId) {
      const verifyPayment = async () => {
        setIsVerifyingStripe(true);
        try {
          await verifyStripePaymentFn({ data: { sessionId } });
          setMessage({ type: "success", text: "Rent payment processed and verified successfully via Stripe Checkout!" });
          // Clear query params
          navigate({ to: "/tenant/pay", replace: true });
          router.invalidate();
        } catch (err: any) {
          console.error("Stripe verification error:", err);
          setMessage({ type: "error", text: err.message || "Failed to verify Stripe payment. Please check your card or contact support." });
        } finally {
          setIsVerifyingStripe(false);
        }
      };

      verifyPayment();
    }
  }, [sessionId, navigate, router]);

  const handleStripePay = async () => {
    setIsPaying(true);
    setMessage(null);
    try {
      const result = await createStripeCheckoutSessionFn();
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("Stripe Checkout URL could not be generated.");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to launch Stripe Checkout." });
      setIsPaying(false);
    }
  };

  if (isVerifyingStripe) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-8">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute h-full w-full animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
          <CreditCard className="h-8 w-8 text-accent animate-pulse" />
        </div>
        <h3 className="mt-6 text-lg font-semibold tracking-tight">Verifying Stripe Payment</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Please wait while we confirm your payment details with Stripe and secure your rent transaction receipt.
        </p>
      </div>
    );
  }

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
            <Card className="overflow-hidden border border-border/80 shadow-md">
              <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent px-6 py-5 border-b border-border/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-accent" /> Secure Rent Payment
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Pay your outstanding rent balance securely via Stripe.
                </CardDescription>
              </div>
              <CardContent className="p-6 space-y-6">
                {message && (
                  <div
                    className={`rounded-xl p-4 text-sm flex items-start gap-3 border ${
                      message.type === "success"
                        ? "bg-success/10 border-success/20 text-success"
                        : "bg-destructive/10 border-destructive/20 text-destructive"
                    }`}
                  >
                    {message.type === "success" ? (
                      <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{message.type === "success" ? "Success" : "Payment Issue"}</p>
                      <p className="mt-0.5 text-xs opacity-90">{message.text}</p>
                    </div>
                  </div>
                )}
                
                <div className="rounded-2xl bg-muted/40 border border-border/50 p-6 flex flex-col items-center text-center justify-center space-y-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Outstanding Balance</p>
                  <p className="text-4xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text">
                    ${dashboard.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    Due date: <span className="font-medium text-foreground">{dashboard.dueDate}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <Button 
                    onClick={handleStripePay} 
                    className="h-13 w-full text-base font-semibold bg-gradient-to-r from-accent to-accent/90 hover:from-accent/95 hover:to-accent/85 shadow-md shadow-accent/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group cursor-pointer" 
                    disabled={isPaying}
                  >
                    {isPaying ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 transition-transform group-hover:scale-110" />
                    )}
                    {isPaying ? "Launching Gateway..." : `Pay $${dashboard.balance.toLocaleString()} securely`}
                  </Button>
                  
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-success" /> Payments are encrypted and secured by Stripe.
                    </p>
                    <div className="flex gap-2 opacity-50 grayscale hover:opacity-70 hover:grayscale-0 transition-all">
                      <img src="https://js.stripe.com/v3/fingerprinted/img/visa-72545d4e12e177fcb348db4974f115a3.svg" className="h-6" alt="Visa" />
                      <img src="https://js.stripe.com/v3/fingerprinted/img/mastercard-a12f6c0143899db9e92cf4de7c9e05fa.svg" className="h-6" alt="Mastercard" />
                      <img src="https://js.stripe.com/v3/fingerprinted/img/amex-910fa16857addf9eec45c38e4a9e224e.svg" className="h-6" alt="Amex" />
                      <img src="https://js.stripe.com/v3/fingerprinted/img/discover-4df15a6b7d346ff175d7b5bf46d7e0f2.svg" className="h-6" alt="Discover" />
                    </div>
                  </div>
                </div>
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
                                transactionId: p.transactionId,
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
                    <p className="font-medium mt-0.5">
                      {selectedPaymentForReceipt.transactionId && selectedPaymentForReceipt.transactionId.startsWith("cs_")
                        ? "Stripe Checkout"
                        : selectedPaymentForReceipt.transactionId || "Stripe Secure Sandbox"}
                    </p>
                  </div>
                  {selectedPaymentForReceipt.transactionId && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Stripe Session ID</p>
                      <p className="font-mono text-xs mt-0.5 break-all text-muted-foreground bg-muted p-2 rounded">{selectedPaymentForReceipt.transactionId}</p>
                    </div>
                  )}
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
