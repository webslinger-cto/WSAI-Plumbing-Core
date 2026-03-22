/**
 * Public invoice page — no authentication required.
 * Accessed via /invoice/:token
 *
 * Shows the invoice details and a "Pay Now" button that redirects to Stripe
 * Checkout.  After Stripe redirects back, it reads ?payment=success or
 * ?payment=cancelled from the URL and shows the appropriate banner.
 */
import { useEffect, useState } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertCircle, Loader2, CreditCard, Ban, Clock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirror server response)
// ---------------------------------------------------------------------------

interface InvoiceLineItem {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  amount: number | string;
}

interface PublicInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  status: "draft" | "sent" | "paid" | "void" | "overdue";
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  paidAmount: string | null;
  notes: string | null;
  publicToken: string;
  lineItems: InvoiceLineItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(val: string | number | null | undefined) {
  return `$${Number(val ?? 0).toFixed(2)}`;
}

const STATUS_COLORS: Record<string, string> = {
  paid:    "bg-green-500/15 text-green-400 border-green-500/30",
  sent:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  overdue: "bg-red-500/15 text-red-400 border-red-500/30",
  void:    "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  draft:   "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const paymentResult = searchParams.get("payment"); // "success" | "cancelled" | null

  const { data: invoice, isLoading, error } = useQuery<PublicInvoice>({
    queryKey: ["/api/public/invoice", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/invoice/${token}`);
      if (!res.ok) throw new Error("Invoice not found");
      return res.json();
    },
    enabled: !!token,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/invoice/${token}/pay`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Payment unavailable" }));
        throw new Error(err.error ?? "Payment failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <p className="text-lg font-semibold">Invoice not found</p>
          <p className="text-muted-foreground text-sm">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";
  const isVoid = invoice.status === "void";
  const isPayable = !isPaid && !isVoid;
  const statusColor = STATUS_COLORS[invoice.status] ?? STATUS_COLORS.draft;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Payment result banner */}
        {paymentResult === "success" && (
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-400">Payment received!</p>
              <p className="text-sm text-muted-foreground">Thank you. Your payment is being processed.</p>
            </div>
          </div>
        )}
        {paymentResult === "cancelled" && (
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-400">Payment cancelled</p>
              <p className="text-sm text-muted-foreground">No charge was made. You can try again below.</p>
            </div>
          </div>
        )}

        {/* Invoice card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{invoice.invoiceNumber}</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">{invoice.customerName}</p>
                {invoice.customerEmail && (
                  <p className="text-muted-foreground text-xs">{invoice.customerEmail}</p>
                )}
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${statusColor}`}>
                {invoice.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Dates */}
            <div className="flex gap-6 text-sm">
              {invoice.dueDate && (
                <div>
                  <p className="text-muted-foreground text-xs">Due</p>
                  <p className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(invoice.dueDate), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
              {isPaid && invoice.paidAt && (
                <div>
                  <p className="text-muted-foreground text-xs">Paid on</p>
                  <p className="text-green-400">
                    {format(new Date(invoice.paidAt), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Line items */}
            <div className="space-y-2">
              {invoice.lineItems.map((li, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {li.description}
                    {Number(li.quantity) !== 1 && (
                      <span className="ml-1 text-xs">×{li.quantity}</span>
                    )}
                  </span>
                  <span>{fmt(li.amount)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
                <span>{fmt(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2">
                <span>Total</span>
                <span>{fmt(invoice.total)}</span>
              </div>
              {isPaid && invoice.paidAmount && (
                <div className="flex justify-between text-green-400 font-medium">
                  <span>Paid</span>
                  <span>{fmt(invoice.paidAmount)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {invoice.notes && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </>
            )}

            {/* Pay button */}
            {isPayable && (
              <>
                <Separator />
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending}
                >
                  {payMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Pay {fmt(invoice.total)} Securely
                </Button>
                {payMutation.isError && (
                  <p className="text-sm text-destructive text-center">
                    {(payMutation.error as Error).message}
                  </p>
                )}
                <p className="text-xs text-center text-muted-foreground">
                  Powered by Stripe · Your card info is never stored on our servers.
                </p>
              </>
            )}

            {isVoid && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Ban className="w-4 h-4" /> This invoice has been voided.
              </div>
            )}

            {isPaid && (
              <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Paid in full — thank you!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
