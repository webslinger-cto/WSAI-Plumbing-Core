/**
 * Customer self-service portal — no authentication required.
 * Accessed via /customer/:token
 *
 * Shows job history, open invoices, and a "Request Service" form
 * that creates a new lead.
 */
import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  User,
  Phone,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { serviceTypes } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PortalJob {
  id: string;
  serviceType: string;
  status: string;
  address: string;
  scheduledDate: string | null;
  completedAt: string | null;
  totalRevenue: string | null;
  createdAt: string;
}

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  total: string;
  status: string;
  dueDate: string | null;
  publicToken: string | null;
}

interface PortalData {
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
  jobs: PortalJob[];
  invoices: PortalInvoice[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const JOB_STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  pending:     { label: "Pending",     icon: Clock,         color: "text-yellow-400" },
  assigned:    { label: "Assigned",    icon: Clock,         color: "text-blue-400"   },
  confirmed:   { label: "Confirmed",   icon: Clock,         color: "text-indigo-400" },
  en_route:    { label: "En Route",    icon: Clock,         color: "text-cyan-400"   },
  on_site:     { label: "On Site",     icon: Clock,         color: "text-violet-400" },
  in_progress: { label: "In Progress", icon: Clock,         color: "text-orange-400" },
  completed:   { label: "Completed",   icon: CheckCircle2,  color: "text-green-400"  },
  cancelled:   { label: "Cancelled",   icon: XCircle,       color: "text-red-400"    },
};

const INVOICE_BADGE: Record<string, string> = {
  draft:    "secondary",
  sent:     "secondary",
  paid:     "default",
  void:     "destructive",
  overdue:  "destructive",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CustomerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [requestOpen, setRequestOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    serviceType: "Drain Cleaning",
    description: "",
    preferredDate: "",
  });

  const { data, isLoading, isError } = useQuery<PortalData>({
    queryKey: [`/api/customer-portal/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/customer-portal/${token}`);
      if (!res.ok) throw new Error("Portal not found");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/customer-portal/${token}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setRequestOpen(false);
      setSubmitted(true);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm w-full mx-4">
          <CardHeader>
            <CardTitle className="text-destructive">Portal Not Found</CardTitle>
            <CardDescription>
              This link may have expired or is invalid. Please contact us for a
              new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { customer, jobs, invoices } = data;
  const openInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const recentJobs = jobs.slice(0, 10);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Customer Portal</h1>
            <p className="text-sm text-muted-foreground">Chicago Sewer Experts</p>
          </div>
          <Button size="sm" onClick={() => setRequestOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Request Service
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Success banner */}
        {submitted && (
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="flex items-center gap-3 pt-4">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="font-medium text-green-300">Request Submitted</p>
                <p className="text-sm text-muted-foreground">
                  We'll contact you shortly to confirm your appointment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Your Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{customer.fullName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open invoices */}
        {openInvoices.length > 0 && (
          <Card className="border-orange-500/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-orange-300">
                <Receipt className="w-4 h-4" />
                Outstanding Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {openInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                    {inv.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(inv.dueDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      ${Number(inv.total).toFixed(2)}
                    </span>
                    {inv.publicToken && (
                      <Button
                        size="sm"
                        asChild
                      >
                        <a href={`/invoice/${inv.publicToken}`}>Pay Now</a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Job history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-4 h-4" />
              Job History
            </CardTitle>
            <CardDescription>
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No jobs found. Request your first service above!
              </p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => {
                  const cfg =
                    JOB_STATUS_CONFIG[job.status] ?? JOB_STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={job.id}
                      className="flex items-start gap-3 p-3 rounded-md bg-muted/40"
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{job.serviceType}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.address}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {cfg.label}
                          </Badge>
                          {(job.scheduledDate || job.createdAt) && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {format(
                                new Date(
                                  job.scheduledDate || job.createdAt
                                ),
                                "MMM d, yyyy"
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {job.totalRevenue && job.status === "completed" && (
                        <span className="text-sm font-semibold shrink-0">
                          ${Number(job.totalRevenue).toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All invoices */}
        {invoices.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="w-4 h-4" />
                All Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      {inv.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(inv.dueDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          (INVOICE_BADGE[inv.status] as any) ?? "secondary"
                        }
                        className="capitalize"
                      >
                        {inv.status}
                      </Badge>
                      <span className="font-semibold">
                        ${Number(inv.total).toFixed(2)}
                      </span>
                      {inv.publicToken &&
                        (inv.status === "sent" ||
                          inv.status === "overdue") && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/invoice/${inv.publicToken}`}>Pay</a>
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Request Service Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label>Service Type</Label>
              <Select
                value={form.serviceType}
                onValueChange={(v) => setForm((p) => ({ ...p, serviceType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Preferred Date</Label>
              <Input
                type="date"
                value={form.preferredDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, preferredDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Describe the Issue</Label>
              <Textarea
                rows={3}
                placeholder="Please describe the problem or service needed…"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
