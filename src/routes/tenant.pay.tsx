import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { tenantMe } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/tenant/pay")({
  component: PayRent,
});

function PayRent() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Payment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" defaultValue={`$${tenantMe.balance}`} />
            <Field label="Due date" defaultValue={tenantMe.dueDate} />
          </div>
          <div className="space-y-1.5">
            <Label>Card number</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="4242 4242 4242 4242" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Expiry" defaultValue="12 / 27" />
            <Field label="CVC" defaultValue="123" />
            <Field label="ZIP" defaultValue="11201" />
          </div>
          <Button className="h-12 w-full text-base">
            <Lock className="mr-1.5 h-4 w-4" /> Pay ${tenantMe.balance.toLocaleString()}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Secured by Stripe · Demo mode
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Monthly rent" value={`$${tenantMe.rent}`} />
          <Row label="Late fee" value="$0" />
          <Row label="Other charges" value="$0" />
          <div className="border-t border-border pt-3" />
          <Row label="Total due" value={`$${tenantMe.balance}`} bold />
          <Badge variant="secondary" className="mt-2 w-full justify-center py-1.5">Auto-pay available</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
