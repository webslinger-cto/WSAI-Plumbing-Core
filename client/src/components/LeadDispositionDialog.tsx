import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DollarSign,
  CalendarX,
  FileWarning,
  Building2,
  PhoneMissed,
  MapPinOff,
  Copy,
  RefreshCw,
  Wrench,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
export const NOT_CONVERTED_REASONS = [
  { key: "pricing",           label: "Too Expensive",         icon: DollarSign,  color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30" },
  { key: "scheduling",        label: "Schedule Conflict",      icon: CalendarX,   color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  { key: "permits",           label: "Permit Issues",          icon: FileWarning, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  { key: "competitor",        label: "Chose Competitor",       icon: Building2,   color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  { key: "no_response",       label: "No Response",            icon: PhoneMissed, color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/30" },
  { key: "out_of_area",       label: "Out of Service Area",    icon: MapPinOff,   color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/30" },
  { key: "duplicate",         label: "Duplicate Lead",         icon: Copy,        color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30" },
  { key: "changed_mind",      label: "Customer Changed Mind",  icon: RefreshCw,   color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30" },
  { key: "already_completed", label: "Work Already Done",      icon: Wrench,      color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
  { key: "other",             label: "Other Reason",           icon: HelpCircle,  color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
] as const;

export type NotConvertedReason = typeof NOT_CONVERTED_REASONS[number]["key"];

interface DispositionLead {
  id: string;
  customerName?: string | null;
  name?: string | null;
}

interface LeadDispositionDialogProps {
  lead: DispositionLead | null;
  open: boolean;
  onClose: () => void;
  userId?: string;
}

export function getDispositionLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  return NOT_CONVERTED_REASONS.find(r => r.key === reason)?.label ?? reason;
}

export function DispositionBadge({ lead }: { lead: { status?: string | null; notConvertedReason?: string | null; convertedAt?: Date | string | null } }) {
  if (lead.status === "converted" || lead.convertedAt) {
    return (
      <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 text-xs gap-1 no-default-hover-elevate no-default-active-elevate">
        <TrendingUp className="w-3 h-3" />
        Converted
      </Badge>
    );
  }
  if (lead.status === "lost" && lead.notConvertedReason) {
    const found = NOT_CONVERTED_REASONS.find(r => r.key === lead.notConvertedReason);
    const Icon = found?.icon ?? HelpCircle;
    return (
      <Badge className={`${found?.bg ?? "bg-muted/50 border-border"} ${found?.color ?? "text-muted-foreground"} border text-xs gap-1 no-default-hover-elevate no-default-active-elevate`}>
        <Icon className="w-3 h-3" />
        {found?.label ?? lead.notConvertedReason}
      </Badge>
    );
  }
  if (lead.status === "lost") {
    return (
      <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs gap-1 no-default-hover-elevate no-default-active-elevate">
        <XCircle className="w-3 h-3" />
        Lost
      </Badge>
    );
  }
  return null;
}

export default function LeadDispositionDialog({ lead, open, onClose, userId }: LeadDispositionDialogProps) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<"converted" | "not_converted" | null>(null);
  const [reason, setReason] = useState<NotConvertedReason | null>(null);
  const [notes, setNotes] = useState("");

  const dispositionMutation = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const payload: Record<string, unknown> = {
        dispositionNotes: notes || undefined,
        dispositionSetAt: new Date().toISOString(),
        dispositionSetBy: userId,
      };
      if (outcome === "converted") {
        payload.status = "converted";
        payload.convertedAt = new Date().toISOString();
        payload.notConvertedReason = null;
      } else {
        payload.status = "lost";
        payload.notConvertedReason = reason;
      }
      const res = await apiRequest("PATCH", `/api/leads/${lead.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: outcome === "converted" ? "Lead Marked Converted!" : "Lead Disposition Saved",
        description: outcome === "converted"
          ? `${lead?.customerName || lead?.name} has been marked as a successful conversion.`
          : `Lead marked as lost: ${getDispositionLabel(reason)}.`,
      });
      onClose();
      setOutcome(null);
      setReason(null);
      setNotes("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save disposition.", variant: "destructive" });
    },
  });

  const canSave =
    outcome === "converted" ||
    (outcome === "not_converted" && reason !== null) ||
    (outcome === "not_converted" && reason === "other" && notes.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setOutcome(null); setReason(null); setNotes(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Mark Lead Outcome
          </DialogTitle>
          <DialogDescription>
            Record what happened with <strong>{lead?.customerName || lead?.name}</strong> so you can track conversion rates and improve your process.
          </DialogDescription>
        </DialogHeader>

        {/* Outcome toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            data-testid="btn-outcome-converted"
            onClick={() => { setOutcome("converted"); setReason(null); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              outcome === "converted"
                ? "border-green-500 bg-green-500/10"
                : "border-border bg-card/50 hover:border-green-500/40"
            }`}
          >
            <CheckCircle2 className={`w-8 h-8 ${outcome === "converted" ? "text-green-400" : "text-muted-foreground"}`} />
            <span className={`font-semibold text-sm ${outcome === "converted" ? "text-green-400" : "text-foreground"}`}>
              Converted
            </span>
            <span className="text-xs text-muted-foreground text-center">Customer became a job</span>
          </button>

          <button
            data-testid="btn-outcome-not-converted"
            onClick={() => setOutcome("not_converted")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              outcome === "not_converted"
                ? "border-red-500 bg-red-500/10"
                : "border-border bg-card/50 hover:border-red-500/40"
            }`}
          >
            <XCircle className={`w-8 h-8 ${outcome === "not_converted" ? "text-red-400" : "text-muted-foreground"}`} />
            <span className={`font-semibold text-sm ${outcome === "not_converted" ? "text-red-400" : "text-foreground"}`}>
              Not Converted
            </span>
            <span className="text-xs text-muted-foreground text-center">Lead didn't become a job</span>
          </button>
        </div>

        {/* Reason grid (shown for not converted) */}
        {outcome === "not_converted" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Why wasn't this lead converted?</p>
            <div className="grid grid-cols-2 gap-2">
              {NOT_CONVERTED_REASONS.map(({ key, label, icon: Icon, color, bg }) => (
                <button
                  key={key}
                  data-testid={`btn-reason-${key}`}
                  onClick={() => setReason(key as NotConvertedReason)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                    reason === key
                      ? `${bg} border-opacity-100 ring-1 ring-current`
                      : "border-border bg-card/30 hover:bg-muted/30"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${reason === key ? color : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${reason === key ? color : "text-foreground"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {outcome && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {outcome === "not_converted" && reason === "other"
                ? "Notes (required for Other)"
                : "Additional notes (optional)"}
            </label>
            <Textarea
              data-testid="input-disposition-notes"
              placeholder={
                outcome === "converted"
                  ? "Any notes about the conversion..."
                  : "Add more detail about why this lead didn't convert..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setOutcome(null); setReason(null); setNotes(""); }}>
            Cancel
          </Button>
          <Button
            data-testid="btn-save-disposition"
            onClick={() => dispositionMutation.mutate()}
            disabled={!canSave || dispositionMutation.isPending}
            className={outcome === "converted" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}
          >
            {dispositionMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : outcome === "converted" ? (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            {dispositionMutation.isPending ? "Saving…" : "Save Outcome"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
