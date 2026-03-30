import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText, Plus, Send, Link2, MoreHorizontal, Ban, Copy,
  DollarSign, Clock, CheckCircle2, AlertCircle, Loader2, Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  jobId: string | null;
  quoteId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
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
  publicToken: string | null;
  notes: string | null;
  createdAt: string;
  lineItems: InvoiceLineItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  Invoice["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  draft:   { label: "Draft",   variant: "secondary",    icon: <FileText className="w-3 h-3" /> },
  sent:    { label: "Sent",    variant: "default",      icon: <Send className="w-3 h-3" /> },
  paid:    { label: "Paid",    variant: "default",      icon: <CheckCircle2 className="w-3 h-3" /> },
  void:    { label: "Void",    variant: "destructive",  icon: <Ban className="w-3 h-3" /> },
  overdue: { label: "Overdue", variant: "destructive",  icon: <AlertCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const colorClass =
    status === "paid"    ? "bg-green-500/15 text-green-400 border-green-500/30" :
    status === "sent"    ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
    status === "overdue" ? "bg-red-500/15 text-red-400 border-red-500/30" :
    status === "void"    ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" :
    "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function fmt(val: string | number | null | undefined) {
  return `$${Number(val ?? 0).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Create / Edit Invoice dialog
// ---------------------------------------------------------------------------

const EMPTY_LINE_ITEM: InvoiceLineItem = { description: "", quantity: 1, unitPrice: 0, amount: 0 };

function InvoiceFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<Invoice>;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!initial?.id;

  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [customerAddress, setCustomerAddress] = useState(initial?.customerAddress ?? "");
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? "0");
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ? initial.dueDate.substring(0, 10) : ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    initial?.lineItems?.length ? initial.lineItems : [{ ...EMPTY_LINE_ITEM }]
  );

  const recalcLine = (items: InvoiceLineItem[], idx: number) => {
    const updated = [...items];
    updated[idx] = {
      ...updated[idx],
      amount: (updated[idx].quantity ?? 0) * (updated[idx].unitPrice ?? 0),
    };
    return updated;
  };

  const updateLine = (idx: number, field: keyof InvoiceLineItem, value: string | number) => {
    const copy = [...lineItems];
    (copy[idx] as any)[field] = value;
    setLineItems(recalcLine(copy, idx));
  };

  const addLine = () => setLineItems([...lineItems, { ...EMPTY_LINE_ITEM }]);
  const removeLine = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const subtotal = lineItems.reduce((s, li) => s + (li.amount || 0), 0);
  const taxAmount = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + taxAmount;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        customerName, customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        taxRate, dueDate: dueDate || null,
        notes: notes || null,
        lineItems: lineItems.map((li, i) => ({ ...li, sortOrder: i })),
      };
      if (isEdit) {
        return apiRequest("PATCH", `/api/invoices/${initial!.id}`, body);
      }
      return apiRequest("POST", "/api/invoices", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: isEdit ? "Invoice updated" : "Invoice created" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${initial?.invoiceNumber}` : "New Invoice"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Customer</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Smith" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" type="email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(312) 555-0000" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="123 Main St, Chicago IL" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Line Items</h4>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3 h-3 mr-1" /> Add Line
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-center">
                  <Input
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) => updateLine(idx, "description", e.target.value)}
                  />
                  <Input
                    placeholder="Qty"
                    type="number"
                    min={0}
                    value={li.quantity}
                    onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    placeholder="Unit $"
                    type="number"
                    min={0}
                    step="0.01"
                    value={li.unitPrice}
                    onChange={(e) => updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-sm text-right text-muted-foreground">{fmt(li.amount)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(idx)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals + options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Payment terms, thank you note…" />
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span>{fmt(taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1 font-semibold text-base">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !customerName.trim()}
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Invoice detail side panel
// ---------------------------------------------------------------------------

function InvoiceDetail({
  invoice,
  onClose,
  onUpdated,
}: {
  invoice: Invoice;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/invoices/${invoice.id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice sent to customer" });
      onUpdated();
    },
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const payLinkMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/invoices/${invoice.id}/payment-link`),
    onSuccess: async (res) => {
      const data = await (res as any).json?.() ?? res;
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (e: any) => toast({ title: "Payment link failed", description: e.message, variant: "destructive" }),
  });

  const voidMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/invoices/${invoice.id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice voided" });
      onUpdated();
    },
    onError: (e: any) => toast({ title: "Void failed", description: e.message, variant: "destructive" }),
  });

  const baseUrl = window.location.origin;
  const publicUrl = invoice.publicToken ? `${baseUrl}/invoice/${invoice.publicToken}` : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
            <CardDescription className="mt-0.5">{invoice.customerName}</CardDescription>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {invoice.status !== "void" && invoice.status !== "paid" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                Send Invoice
              </Button>
              <Button
                size="sm"
                onClick={() => payLinkMutation.mutate()}
                disabled={payLinkMutation.isPending}
              >
                {payLinkMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Link2 className="w-3 h-3 mr-1" />}
                Stripe Checkout
              </Button>
            </>
          )}
          {invoice.status === "draft" && (
            <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
          )}
          {invoice.status !== "void" && invoice.status !== "paid" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Void this invoice?")) voidMutation.mutate();
              }}
              disabled={voidMutation.isPending}
            >
              <Ban className="w-3 h-3 mr-1" /> Void
            </Button>
          )}
          {publicUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast({ title: "Link copied" });
              }}
            >
              <Copy className="w-3 h-3 mr-1" /> Copy Link
            </Button>
          )}
        </div>

        <Separator />

        {/* Customer info */}
        <div className="space-y-1 text-sm">
          <p className="font-medium">Customer</p>
          {invoice.customerEmail && <p className="text-muted-foreground">{invoice.customerEmail}</p>}
          {invoice.customerPhone && <p className="text-muted-foreground">{invoice.customerPhone}</p>}
          {invoice.customerAddress && <p className="text-muted-foreground">{invoice.customerAddress}</p>}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Created</p>
            <p>{format(new Date(invoice.createdAt), "MMM d, yyyy")}</p>
          </div>
          {invoice.dueDate && (
            <div>
              <p className="text-muted-foreground text-xs">Due</p>
              <p>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</p>
            </div>
          )}
          {invoice.sentAt && (
            <div>
              <p className="text-muted-foreground text-xs">Sent</p>
              <p>{format(new Date(invoice.sentAt), "MMM d, yyyy")}</p>
            </div>
          )}
          {invoice.paidAt && (
            <div>
              <p className="text-muted-foreground text-xs">Paid</p>
              <p className="text-green-400">{format(new Date(invoice.paidAt), "MMM d, yyyy")}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Line items */}
        <div className="space-y-1">
          <p className="font-medium text-sm">Line Items</p>
          {invoice.lineItems.map((li, idx) => (
            <div key={idx} className="flex justify-between text-sm py-0.5">
              <span className="text-muted-foreground">
                {li.description}
                {li.quantity !== 1 && ` ×${li.quantity}`}
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
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span>{fmt(invoice.total)}</span>
          </div>
          {invoice.paidAmount && (
            <div className="flex justify-between text-green-400">
              <span>Paid</span>
              <span>{fmt(invoice.paidAmount)}</span>
            </div>
          )}
        </div>

        {invoice.notes && (
          <>
            <Separator />
            <div className="text-sm">
              <p className="font-medium mb-1">Notes</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          </>
        )}
      </CardContent>

      {showEdit && (
        <InvoiceFormDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          initial={invoice}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const filtered = invoices.filter((inv) => {
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchSearch =
      !search ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const selected = invoices.find((i) => i.id === selectedId) ?? null;

  // Summary KPIs
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.total), 0);
  const totalDraft = invoices.filter((i) => i.status === "draft").reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Create, send, and collect payments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Collected", value: fmt(totalPaid), icon: <CheckCircle2 className="w-5 h-5 text-green-400" />, color: "text-green-400" },
          { label: "Outstanding", value: fmt(totalOutstanding), icon: <Clock className="w-5 h-5 text-yellow-400" />, color: "text-yellow-400" },
          { label: "Drafts", value: fmt(totalDraft), icon: <FileText className="w-5 h-5 text-muted-foreground" />, color: "" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-3 pt-5">
              {kpi.icon}
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main area */}
      <div className={`grid gap-6 ${selected ? "grid-cols-[1fr_380px]" : "grid-cols-1"}`}>
        {/* Table */}
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-3">
            <Input
              placeholder="Search by name or invoice #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading invoices…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className={`cursor-pointer ${selectedId === inv.id ? "bg-primary/10" : ""}`}
                      onClick={() => setSelectedId(selectedId === inv.id ? null : inv.id)}
                    >
                      <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>{inv.customerName}</div>
                        {inv.customerEmail && (
                          <div className="text-xs text-muted-foreground">{inv.customerEmail}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(inv.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {inv.dueDate ? format(new Date(inv.dueDate), "MMM d") : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(inv.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="w-7 h-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedId(inv.id); }}>
                              View Details
                            </DropdownMenuItem>
                            {inv.publicToken && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/invoice/${inv.publicToken}`, "_blank");
                              }}>
                                Open Public Link
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Detail panel */}
        {selected && (
          <InvoiceDetail
            invoice={selected}
            onClose={() => setSelectedId(null)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            }}
          />
        )}
      </div>

      {showCreate && (
        <InvoiceFormDialog open={showCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
