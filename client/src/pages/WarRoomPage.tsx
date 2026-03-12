import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import {
  Flame, Zap, Phone, UserCheck, Clock, AlertTriangle,
  Plus, RefreshCw, Wifi, WifiOff, ChevronRight, Filter,
  PhoneCall, CheckCircle2, XCircle
} from "lucide-react";

interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  serviceType?: string;
  description?: string;
}

interface VelocityLead {
  id: string;
  externalId: string | null;
  source: string;
  customerInfo: CustomerInfo;
  status: string;
  claimedAt: string | null;
  claimedBy: string | null;
  claimedByName: string | null;
  firstContactAt: string | null;
  createdAt: string;
  notes: string | null;
}

// ─── Timer Hook ─────────────────────────────────────────────
function useElapsedSeconds(createdAt: string): number {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [createdAt]);
  return elapsed;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Timer Display ───────────────────────────────────────────
function LeadTimer({ lead }: { lead: VelocityLead }) {
  const startTime = lead.status === "NEW" ? lead.createdAt : (lead.claimedAt || lead.createdAt);
  const elapsed = useElapsedSeconds(startTime);
  const minutes = elapsed / 60;

  let color = "text-green-400";
  let bg = "bg-green-400/10";
  let pulse = false;
  let icon = <Clock className="w-3 h-3" />;

  if (lead.status === "NEW") {
    if (minutes >= 10) {
      color = "text-red-400";
      bg = "bg-red-500/20";
      pulse = true;
      icon = <AlertTriangle className="w-3 h-3" />;
    } else if (minutes >= 5) {
      color = "text-red-400";
      bg = "bg-red-400/10";
      icon = <Flame className="w-3 h-3" />;
    } else if (minutes >= 2) {
      color = "text-yellow-400";
      bg = "bg-yellow-400/10";
      icon = <Zap className="w-3 h-3" />;
    }
  } else {
    color = "text-blue-400";
    bg = "bg-blue-400/10";
    icon = <Clock className="w-3 h-3" />;
  }

  const label = lead.status === "NEW" ? "Response" : "Contact";

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold ${bg} ${color} ${pulse ? "animate-pulse" : ""}`}>
      {icon}
      <span>{label}: {formatTimer(elapsed)}</span>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    NEW: { label: "NEW", class: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    CLAIMED: { label: "CLAIMED", class: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    CONTACTED: { label: "CONTACTED", class: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    QUOTED: { label: "QUOTED", class: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
    CLOSED: { label: "WON", class: "bg-green-500/20 text-green-400 border-green-500/30" },
    LOST: { label: "LOST", class: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  };
  const s = map[status] || { label: status, class: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${s.class}`}>
      {s.label}
    </span>
  );
}

// ─── Lead Card ───────────────────────────────────────────────
interface LeadCardProps {
  lead: VelocityLead;
  userId: string;
  onClaim: (id: string) => void;
  onContact: (lead: VelocityLead) => void;
  onStatusChange: (lead: VelocityLead) => void;
  claiming: boolean;
  contacting: boolean;
}

function LeadCard({ lead, userId, onClaim, onContact, onStatusChange, claiming, contacting }: LeadCardProps) {
  const info = lead.customerInfo as CustomerInfo;
  const minutes = (Date.now() - new Date(lead.createdAt).getTime()) / 60000;
  const isUrgent = lead.status === "NEW" && minutes >= 5;
  const isCritical = lead.status === "NEW" && minutes >= 10;

  return (
    <div
      data-testid={`velocity-lead-card-${lead.id}`}
      className={`rounded-xl border p-4 transition-all duration-300
        ${isCritical ? "border-red-500/60 bg-red-950/30 shadow-red-900/20 shadow-lg animate-pulse" :
          isUrgent ? "border-red-500/40 bg-red-950/20" :
          lead.status === "NEW" ? "border-orange-500/30 bg-orange-950/10" :
          "border-border bg-card/50"
        }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {info.name || "Unknown Caller"}
            </span>
            <StatusBadge status={lead.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{lead.source}</div>
        </div>
        <LeadTimer lead={lead} />
      </div>

      {/* Contact info */}
      <div className="space-y-1 mb-3">
        {info.phone && (
          <a
            href={`tel:${info.phone}`}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-mono"
            data-testid={`lead-phone-${lead.id}`}
          >
            <Phone className="w-3 h-3" />
            {info.phone}
          </a>
        )}
        {info.serviceType && (
          <div className="text-xs text-muted-foreground">
            Service: <span className="text-foreground">{info.serviceType}</span>
          </div>
        )}
        {info.address && (
          <div className="text-xs text-muted-foreground truncate">📍 {info.address}</div>
        )}
        {info.description && (
          <div className="text-xs text-muted-foreground line-clamp-2 italic">"{info.description}"</div>
        )}
        {lead.claimedByName && lead.status !== "NEW" && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            Claimed by <span className="text-foreground font-medium">{lead.claimedByName}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {lead.status === "NEW" && (
          <Button
            size="sm"
            data-testid={`btn-claim-${lead.id}`}
            className="bg-orange-600 hover:bg-orange-500 text-white h-8 text-xs font-semibold"
            onClick={() => onClaim(lead.id)}
            disabled={claiming}
          >
            <Zap className="w-3 h-3 mr-1" />
            {claiming ? "Claiming…" : "CLAIM IT"}
          </Button>
        )}
        {(lead.status === "CLAIMED" || lead.status === "NEW") && info.phone && (
          <Button
            size="sm"
            variant="outline"
            data-testid={`btn-contact-${lead.id}`}
            className="border-green-500/50 text-green-400 hover:bg-green-950/30 h-8 text-xs"
            onClick={() => onContact(lead)}
            disabled={contacting}
          >
            <PhoneCall className="w-3 h-3 mr-1" />
            {contacting ? "Logging…" : "Log Contact"}
          </Button>
        )}
        {!["CLOSED", "LOST"].includes(lead.status) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            data-testid={`btn-status-${lead.id}`}
            onClick={() => onStatusChange(lead)}
          >
            <ChevronRight className="w-3 h-3 mr-1" />
            Update
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── New Lead Modal ──────────────────────────────────────────
function NewLeadModal({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", serviceType: "", description: "", source: "manual"
  });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/velocity-leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/velocity-leads"] });
      toast({ title: "Lead created", description: "New lead added to Lead Assassin." });
      onClose();
      setForm({ name: "", phone: "", email: "", address: "", serviceType: "", description: "", source: "manual" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create lead.", variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!form.name && !form.phone) {
      toast({ title: "Required", description: "Please enter at least a name or phone number.", variant: "destructive" });
      return;
    }
    create.mutate({
      customerInfo: {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        serviceType: form.serviceType,
        description: form.description,
      },
      source: form.source,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input data-testid="input-lead-name" placeholder="Customer name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input data-testid="input-lead-phone" placeholder="(312) 555-0100" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input data-testid="input-lead-email" placeholder="email@example.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input data-testid="input-lead-address" placeholder="Street address" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Service Type</Label>
              <Input data-testid="input-lead-service" placeholder="e.g. Drain Cleaning" value={form.serviceType}
                onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger data-testid="select-lead-source"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="thumbtack">Thumbtack</SelectItem>
                  <SelectItem value="angi">Angi</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description / Notes</Label>
            <Textarea data-testid="input-lead-description" placeholder="Describe the issue..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button data-testid="btn-create-lead" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status Update Modal ─────────────────────────────────────
function StatusUpdateModal({ lead, onClose, userId }: { lead: VelocityLead | null; onClose: () => void; userId: string }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(lead?.status || "CLAIMED");
  const [note, setNote] = useState("");

  useEffect(() => { if (lead) setStatus(lead.status); }, [lead]);

  const update = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/velocity-leads/${lead?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/velocity-leads"] });
      toast({ title: "Updated", description: "Lead status updated." });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
  });

  if (!lead) return null;

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Lead Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {(lead.customerInfo as CustomerInfo).name || "Lead"} — currently <StatusBadge status={lead.status} />
          </div>
          <div className="space-y-1">
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-new-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["NEW", "CLAIMED", "CONTACTED", "QUOTED", "CLOSED", "LOST"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Note (optional)</Label>
            <Textarea data-testid="input-status-note" placeholder="Add a note..." value={note}
              onChange={e => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button data-testid="btn-save-status" onClick={() => update.mutate({ status, note })} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Lead Assassin Page ──────────────────────────────────
interface WarRoomPageProps {
  userId: string;
  fullName: string;
}

export default function WarRoomPage({ userId, fullName }: WarRoomPageProps) {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [statusLead, setStatusLead] = useState<VelocityLead | null>(null);
  const [filter, setFilter] = useState<string>("active");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch leads
  const { data: leads = [], isLoading, refetch } = useQuery<VelocityLead[]>({
    queryKey: ["/api/velocity-leads"],
  });

  // Socket.io real-time connection
  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setConnected(true);
      console.log("[LeadAssassin] Connected to real-time feed");
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("NEW_LEAD", (lead: VelocityLead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/velocity-leads"] });
      toast({
        title: "🔪 New Lead — Make the Kill!",
        description: `${(lead.customerInfo as CustomerInfo).name || "Unknown"} from ${lead.source}`,
        duration: 8000,
      });
    });

    socket.on("LEAD_UPDATED", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/velocity-leads"] });
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [toast]);

  // Claim lead
  const claimMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/velocity-leads/${id}/claim`, {}),
    onMutate: (id) => setClaimingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/velocity-leads"] });
      toast({ title: "Lead Claimed!", description: "You've claimed this lead. Contact the customer now!" });
    },
    onError: (_, id) => {
      toast({ title: "Cannot claim", description: "This lead may already be claimed.", variant: "destructive" });
    },
    onSettled: () => setClaimingId(null),
  });

  // Log contact
  const contactMutation = useMutation({
    mutationFn: (lead: VelocityLead) => {
      const phone = (lead.customerInfo as CustomerInfo).phone;
      if (phone) window.location.href = `tel:${phone}`;
      return apiRequest("POST", `/api/velocity-leads/${lead.id}/contact`, { note: "Phone contact logged" });
    },
    onMutate: (lead) => setContactingId(lead.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/velocity-leads"] });
      toast({ title: "Contact Logged", description: "First contact timestamp recorded." });
    },
    onError: () => toast({ title: "Error", description: "Failed to log contact.", variant: "destructive" }),
    onSettled: () => setContactingId(null),
  });

  // Filter leads
  const filteredLeads = leads.filter(l => {
    if (filter === "active") return !["CLOSED", "LOST"].includes(l.status);
    if (filter === "new") return l.status === "NEW";
    if (filter === "mine") return l.claimedBy === userId;
    if (filter === "closed") return ["CLOSED", "LOST"].includes(l.status);
    return true;
  });

  // Stats
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "NEW").length,
    claimed: leads.filter(l => l.status === "CLAIMED").length,
    contacted: leads.filter(l => l.status === "CONTACTED").length,
    won: leads.filter(l => l.status === "CLOSED").length,
  };

  const urgentCount = leads.filter(l => {
    if (l.status !== "NEW") return false;
    return (Date.now() - new Date(l.createdAt).getTime()) / 60000 >= 5;
  }).length;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Lead Assassin</h1>
          {urgentCount > 0 && (
            <Badge className="bg-red-600 text-white animate-pulse text-xs">
              {urgentCount} URGENT
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${connected ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{connected ? "Live" : "Offline"}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="h-8 text-xs" data-testid="btn-refresh">
            <RefreshCw className="w-3 h-3 mr-1" />Refresh
          </Button>
          <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-500" onClick={() => setShowNewModal(true)} data-testid="btn-add-lead">
            <Plus className="w-3 h-3 mr-1" />Add Lead
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "New", value: stats.new, color: "text-orange-400" },
          { label: "Claimed", value: stats.claimed, color: "text-blue-400" },
          { label: "Contacted", value: stats.contacted, color: "text-purple-400" },
          { label: "Won", value: stats.won, color: "text-green-400" },
        ].map(s => (
          <Card key={s.label} className="border-border bg-card/50">
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {[
          { key: "active", label: "Active" },
          { key: "new", label: "New Only" },
          { key: "mine", label: "My Leads" },
          { key: "all", label: "All" },
          { key: "closed", label: "Closed" },
        ].map(f => (
          <button
            key={f.key}
            data-testid={`filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
              ${filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lead Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/30 h-40 animate-pulse" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">All clear!</p>
          <p className="text-sm">No leads in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              userId={userId}
              onClaim={(id) => claimMutation.mutate(id)}
              onContact={(lead) => contactMutation.mutate(lead)}
              onStatusChange={(lead) => setStatusLead(lead)}
              claiming={claimingId === lead.id && claimMutation.isPending}
              contacting={contactingId === lead.id && contactMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-4">
        <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-green-400" /> &lt; 2 min</div>
        <div className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> 2-5 min (yellow)</div>
        <div className="flex items-center gap-1"><Flame className="w-3 h-3 text-red-400" /> 5-10 min (red)</div>
        <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" /> 10+ min (flashing — act now!)</div>
      </div>

      {/* Modals */}
      <NewLeadModal open={showNewModal} onClose={() => setShowNewModal(false)} userId={userId} />
      <StatusUpdateModal lead={statusLead} onClose={() => setStatusLead(null)} userId={userId} />
    </div>
  );
}
