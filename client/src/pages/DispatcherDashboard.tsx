import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import JobTimeline from "@/components/JobTimeline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  MapPin,
  User,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Truck,
  PlayCircle,
  Calendar,
  Plus,
  Moon,
  Sun,
  PhoneCall,
  UserCheck,
  UserX,
  Bell,
  Shield,
  FileText,
  ClipboardList,
} from "lucide-react";
import type { Job, Lead, Call, Technician, Quote } from "@shared/schema";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";

const jobStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  assigned: { label: "Assigned", color: "bg-blue-500/20 text-blue-400", icon: User },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  en_route: { label: "En Route", color: "bg-amber-500/20 text-amber-400", icon: Truck },
  on_site: { label: "On Site", color: "bg-purple-500/20 text-purple-400", icon: MapPin },
  in_progress: { label: "In Progress", color: "bg-primary/20 text-primary", icon: PlayCircle },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive", icon: AlertCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-blue-500/20 text-blue-400" },
  high: { label: "High", color: "bg-amber-500/20 text-amber-400" },
  urgent: { label: "Urgent", color: "bg-destructive/20 text-destructive" },
};

interface EmergencyTeamMember {
  id: string;
  technicianId: string;
  technicianName: string;
  phone: string;
  isOnCall: boolean;
  isPrimary: boolean;
  lastCallTime?: string;
  callsHandled: number;
}

const mockEmergencyTeam: EmergencyTeamMember[] = [
  { id: "1", technicianId: "1", technicianName: "Mike Johnson", phone: "(312) 555-0101", isOnCall: true, isPrimary: true, callsHandled: 12 },
  { id: "2", technicianId: "2", technicianName: "Carlos Rodriguez", phone: "(312) 555-0102", isOnCall: true, isPrimary: false, callsHandled: 8 },
  { id: "3", technicianId: "3", technicianName: "David Smith", phone: "(312) 555-0103", isOnCall: false, isPrimary: false, callsHandled: 5 },
];

const quoteStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  sent: { label: "Pending Review", color: "bg-amber-500/20 text-amber-400" },
  viewed: { label: "Viewed", color: "bg-blue-500/20 text-blue-400" },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400" },
  declined: { label: "Declined", color: "bg-destructive/20 text-destructive" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

function QuoteReviewCard({ quote, jobs, technicians }: { quote: Quote; jobs: Job[]; technicians: Technician[] }) {
  const { toast } = useToast();
  const job = jobs.find(j => j.id === quote.jobId);
  const technician = technicians.find(t => t.id === quote.technicianId);
  const status = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;
  
  let lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];
  try {
    if (quote.lineItems) {
      lineItems = JSON.parse(quote.lineItems);
    }
  } catch {
    lineItems = [];
  }

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/quotes/${quote.id}`, { status: "sent", acceptedAt: new Date().toISOString() });
      if (quote.jobId) {
        await apiRequest("PATCH", `/api/jobs/${quote.jobId}`, { status: "pending", assignedTechnicianId: null });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Quote Approved",
        description: "The quote has been approved and the job is now on the dispatch board.",
      });
    },
    onError: () => {
      toast({
        title: "Approval Failed",
        description: "Could not approve the quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/quotes/${quote.id}`, { status: "declined" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote Rejected",
        description: "The quote has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Rejection Failed",
        description: "Could not reject the quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card data-testid={`quote-card-${quote.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium" data-testid={`text-quote-customer-${quote.id}`}>
                {quote.customerName}
              </p>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {quote.address}
            </p>
            {technician && (
              <p className="text-sm text-muted-foreground">
                Created by: {technician.fullName}
              </p>
            )}
            {job && (
              <p className="text-sm text-muted-foreground">
                Job: {job.serviceType}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary" data-testid={`text-quote-total-${quote.id}`}>
              ${parseFloat(String(quote.total || 0)).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              Created {quote.createdAt && formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Description</th>
                  <th className="text-right p-2 font-medium">Qty</th>
                  <th className="text-right p-2 font-medium">Price</th>
                  <th className="text-right p-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{item.description}</td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-right">${parseFloat(String(item.unitPrice || 0)).toFixed(2)}</td>
                    <td className="p-2 text-right">${parseFloat(String(item.total || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Subtotal: ${parseFloat(String(quote.subtotal || 0)).toFixed(2)}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Tax: ${parseFloat(String(quote.taxAmount || 0)).toFixed(2)}</span>
        </div>

        {quote.notes && (
          <div className="bg-muted/30 rounded-lg p-3 mb-4">
            <p className="text-sm">{quote.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            data-testid={`button-reject-quote-${quote.id}`}
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            data-testid={`button-approve-quote-${quote.id}`}
          >
            {approveMutation.isPending ? "Approving..." : "Approve & Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JobCard({ job, onAssign, onViewDetails }: { job: Job; onAssign: (job: Job) => void; onViewDetails?: (job: Job) => void }) {
  const status = jobStatusConfig[job.status] || jobStatusConfig.pending;
  const priority = priorityConfig[job.priority || "normal"] || priorityConfig.normal;
  const StatusIcon = status.icon;

  return (
    <Card 
      className="mb-2 cursor-pointer hover-elevate" 
      onClick={() => onViewDetails?.(job)}
      data-testid={`job-card-${job.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid={`text-job-customer-${job.id}`}>
              {job.customerName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{job.serviceType}</p>
          </div>
          <Badge className={`${priority.color} text-xs shrink-0`}>
            {priority.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{job.address}, {job.city}</span>
        </div>

        {job.scheduledDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Calendar className="w-3 h-3" />
            <span>
              {format(new Date(job.scheduledDate), "MMM d")} {job.scheduledTimeStart && `at ${job.scheduledTimeStart}`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Badge className={`${status.color} text-xs`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
          
          {job.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onAssign(job); }}
              data-testid={`button-assign-job-${job.id}`}
            >
              <User className="w-3 h-3 mr-1" />
              Assign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CallItem({ call }: { call: Call }) {
  const isInbound = call.direction === "inbound";
  const Icon = isInbound ? PhoneIncoming : PhoneOutgoing;

  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0">
      <div className={`p-2 rounded-md ${isInbound ? "bg-emerald-500/20" : "bg-blue-500/20"}`}>
        <Icon className={`w-4 h-4 ${isInbound ? "text-emerald-400" : "text-blue-400"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid={`text-call-phone-${call.id}`}>
          {call.callerName || call.callerPhone}
        </p>
        <p className="text-xs text-muted-foreground">
          {call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}` : "Missed"}
        </p>
      </div>
      <div className="text-xs text-muted-foreground">
        {call.createdAt && formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
      </div>
    </div>
  );
}

function LeadItem({ lead }: { lead: Lead }) {
  const priority = priorityConfig[lead.priority || "normal"] || priorityConfig.normal;

  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0">
      <div className="p-2 rounded-md bg-primary/20">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid={`text-lead-name-${lead.id}`}>
          {lead.customerName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {lead.source} - {lead.serviceType || "General inquiry"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={`${priority.color} text-xs`}>
          {priority.label}
        </Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {lead.status}
        </Badge>
      </div>
    </div>
  );
}

function AssignJobDialog({ 
  job, 
  technicians, 
  open, 
  onOpenChange,
  onAssign,
  isPending
}: { 
  job: Job | null; 
  technicians: Technician[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (jobId: string, technicianId: string) => void;
  isPending: boolean;
}) {
  const [selectedTech, setSelectedTech] = useState<string>("");

  if (!job) return null;

  const availableTechs = technicians.filter(t => t.status === "available");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Job to Technician</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{job.customerName}</p>
            <p className="text-sm text-muted-foreground">{job.serviceType}</p>
            <p className="text-sm text-muted-foreground">{job.address}, {job.city}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Technician</label>
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger data-testid="select-technician">
                <SelectValue placeholder="Choose a technician..." />
              </SelectTrigger>
              <SelectContent>
                {availableTechs.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No available technicians
                  </div>
                ) : (
                  availableTechs.map((tech) => (
                    <SelectItem 
                      key={tech.id} 
                      value={tech.id}
                      data-testid={`option-technician-${tech.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        <span>{tech.fullName}</span>
                        <Badge variant="outline" className="text-xs capitalize ml-2">
                          {tech.skillLevel}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-assign">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTech && job) {
                  onAssign(job.id, selectedTech);
                }
              }}
              disabled={!selectedTech || isPending}
              data-testid="button-confirm-assign"
            >
              {isPending ? "Assigning..." : "Assign Job"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmergencyTeamMemberCard({ 
  member, 
  onToggleOnCall, 
  onSetPrimary 
}: { 
  member: EmergencyTeamMember; 
  onToggleOnCall: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  return (
    <Card className={`${member.isOnCall ? "border-emerald-500/50" : "opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${member.isOnCall ? "bg-emerald-500/20" : "bg-muted"}`}>
              {member.isOnCall ? (
                <UserCheck className={`w-5 h-5 ${member.isPrimary ? "text-primary" : "text-emerald-400"}`} />
              ) : (
                <UserX className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium" data-testid={`text-oncall-name-${member.id}`}>{member.technicianName}</p>
                {member.isPrimary && (
                  <Badge className="bg-primary/20 text-primary text-xs">Primary</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{member.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={member.isOnCall}
              onCheckedChange={() => onToggleOnCall(member.id)}
              data-testid={`switch-oncall-${member.id}`}
            />
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <PhoneCall className="w-3 h-3" />
              <span>{member.callsHandled} calls handled</span>
            </div>
          </div>
          {member.isOnCall && !member.isPrimary && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onSetPrimary(member.id)}
              data-testid={`button-set-primary-${member.id}`}
            >
              <Shield className="w-3 h-3 mr-1" />
              Set Primary
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CallTeamTab({ technicians }: { technicians: Technician[] }) {
  const { toast } = useToast();
  const [emergencyTeam, setEmergencyTeam] = useState<EmergencyTeamMember[]>(mockEmergencyTeam);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTechToAdd, setSelectedTechToAdd] = useState<string>("");

  const currentHour = new Date().getHours();
  const isNightShift = currentHour >= 19 || currentHour < 7;

  const onCallCount = emergencyTeam.filter(m => m.isOnCall).length;
  const primaryMember = emergencyTeam.find(m => m.isPrimary && m.isOnCall);

  const handleToggleOnCall = (id: string) => {
    setEmergencyTeam(prev => prev.map(m => {
      if (m.id === id) {
        const newOnCall = !m.isOnCall;
        if (!newOnCall && m.isPrimary) {
          return { ...m, isOnCall: false, isPrimary: false };
        }
        return { ...m, isOnCall: newOnCall };
      }
      return m;
    }));
    toast({
      title: "On-Call Status Updated",
      description: "Technician on-call status has been changed.",
    });
  };

  const handleSetPrimary = (id: string) => {
    setEmergencyTeam(prev => prev.map(m => ({
      ...m,
      isPrimary: m.id === id,
    })));
    toast({
      title: "Primary Contact Updated",
      description: "Primary on-call technician has been set.",
    });
  };

  const handleAddToTeam = () => {
    if (!selectedTechToAdd) return;
    const tech = technicians.find(t => t.id === selectedTechToAdd);
    if (!tech) return;

    const alreadyInTeam = emergencyTeam.some(m => m.technicianId === selectedTechToAdd);
    if (alreadyInTeam) {
      toast({
        title: "Already in Team",
        description: "This technician is already part of the emergency team.",
        variant: "destructive",
      });
      return;
    }

    const newMember: EmergencyTeamMember = {
      id: `new-${Date.now()}`,
      technicianId: tech.id,
      technicianName: tech.fullName,
      phone: tech.phone,
      isOnCall: true,
      isPrimary: false,
      callsHandled: 0,
    };

    setEmergencyTeam(prev => [...prev, newMember]);
    setAddDialogOpen(false);
    setSelectedTechToAdd("");
    toast({
      title: "Technician Added",
      description: `${tech.fullName} has been added to the emergency call team.`,
    });
  };

  const handleRemoveFromTeam = (id: string) => {
    setEmergencyTeam(prev => prev.filter(m => m.id !== id));
    toast({
      title: "Technician Removed",
      description: "Technician has been removed from the emergency team.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isNightShift ? (
            <div className="p-3 rounded-lg bg-indigo-500/20">
              <Moon className="w-6 h-6 text-indigo-400" />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-500/20">
              <Sun className="w-6 h-6 text-amber-400" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">Emergency Call Team</h2>
            <p className="text-sm text-muted-foreground">7:00 PM - 7:00 AM After-Hours Coverage</p>
          </div>
        </div>
        <Badge className={isNightShift ? "bg-indigo-500/20 text-indigo-400" : "bg-muted text-muted-foreground"}>
          {isNightShift ? "Night Shift Active" : "Day Shift"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-500/20">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-oncall-count">{onCallCount}</p>
                <p className="text-sm text-muted-foreground">On-Call Techs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold truncate" data-testid="text-primary-oncall">
                  {primaryMember?.technicianName || "Not Set"}
                </p>
                <p className="text-sm text-muted-foreground">Primary Contact</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-500/20">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-muted-foreground">Rings Before Forward</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Call Team Roster</CardTitle>
              <CardDescription>Technicians available for after-hours emergency calls</CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-to-team">
              <Plus className="w-4 h-4 mr-2" />
              Add Technician
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emergencyTeam.map((member) => (
              <EmergencyTeamMemberCard
                key={member.id}
                member={member}
                onToggleOnCall={handleToggleOnCall}
                onSetPrimary={handleSetPrimary}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Call Forwarding Rules</CardTitle>
          <CardDescription>Automated routing for after-hours calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Main Office Line</p>
                  <p className="text-sm text-muted-foreground">(312) 555-PIPE</p>
                </div>
              </div>
              <div className="text-sm text-right">
                <p className="text-muted-foreground">After 4 rings, forward to:</p>
                <p className="font-medium text-primary">{primaryMember?.technicianName || "Primary On-Call"}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium">Escalation Path</p>
                  <p className="text-sm text-muted-foreground">If primary doesn't answer in 30s</p>
                </div>
              </div>
              <div className="text-sm text-right">
                <p className="text-muted-foreground">Forward to:</p>
                <p className="font-medium">Next Available On-Call</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <PhoneCall className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium">Final Fallback</p>
                  <p className="text-sm text-muted-foreground">If no technician answers</p>
                </div>
              </div>
              <div className="text-sm text-right">
                <p className="text-muted-foreground">Forward to:</p>
                <p className="font-medium">Answering Service</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Technician to Emergency Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Technician</label>
              <Select value={selectedTechToAdd} onValueChange={setSelectedTechToAdd}>
                <SelectTrigger data-testid="select-add-technician">
                  <SelectValue placeholder="Choose a technician..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        <span>{tech.fullName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddToTeam} disabled={!selectedTechToAdd} data-testid="button-confirm-add-team">
                Add to Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const serviceTypeOptions = [
  "Sewer Main - Clear",
  "Sewer Main - Repair",
  "Sewer Main - Replace",
  "Drain Cleaning",
  "Water Heater - Repair",
  "Water Heater - Replace",
  "Toilet Repair",
  "Faucet Repair",
  "Leak Detection",
  "Emergency Service",
  "General Plumbing",
];

const leadSourceOptions = ["eLocal", "Networx", "Angi", "HomeAdvisor", "Direct", "Referral", "Website"];

interface CustomerIntakeFormProps {
  technicians: Technician[];
  onJobCreated: () => void;
}

function CustomerIntakeForm({ technicians, onJobCreated }: CustomerIntakeFormProps) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [leadSource, setLeadSource] = useState("");
  const [wantsLiveQuote, setWantsLiveQuote] = useState(false);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [intakeStep, setIntakeStep] = useState<"info" | "quote_decision" | "assign" | "complete">("info");

  const availableTechs = technicians.filter(t => t.status === "available");

  const createJobMutation = useMutation({
    mutationFn: async (jobData: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      address: string;
      city?: string;
      zipCode?: string;
      serviceType: string;
      description?: string;
      priority?: string;
      assignedTechnicianId?: string;
      scheduledDate?: string;
      scheduledTimeStart?: string;
    }) => {
      return apiRequest("POST", "/api/jobs", jobData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      toast({
        title: "Job Created",
        description: wantsLiveQuote && assignedTechnicianId 
          ? "Job created and technician assigned for live quote." 
          : "Job created successfully.",
      });
      resetForm();
      onJobCreated();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create job. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setAddress("");
    setCity("");
    setZipCode("");
    setServiceType("");
    setDescription("");
    setPriority("normal");
    setLeadSource("");
    setWantsLiveQuote(false);
    setAssignedTechnicianId("");
    setScheduledDate("");
    setScheduledTime("");
    setIntakeStep("info");
  };

  const canProceedToQuoteDecision = customerName && customerPhone && address && serviceType;

  const handleContinueToQuoteDecision = () => {
    if (canProceedToQuoteDecision) {
      setIntakeStep("quote_decision");
    }
  };

  const handleQuoteDecision = (wantsQuote: boolean) => {
    setWantsLiveQuote(wantsQuote);
    if (wantsQuote) {
      setIntakeStep("assign");
    } else {
      setIntakeStep("complete");
    }
  };

  const handleAssignTech = () => {
    if (assignedTechnicianId) {
      setIntakeStep("complete");
    }
  };

  const handleCreateJob = () => {
    if (!canProceedToQuoteDecision) return;
    
    if (wantsLiveQuote && !assignedTechnicianId) {
      toast({
        title: "Technician Required",
        description: "Please assign a technician for the live quote before completing.",
        variant: "destructive",
      });
      setIntakeStep("assign");
      return;
    }

    createJobMutation.mutate({
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      address,
      city: city || undefined,
      zipCode: zipCode || undefined,
      serviceType,
      description: description || undefined,
      priority,
      assignedTechnicianId: assignedTechnicianId || undefined,
      scheduledDate: scheduledDate || undefined,
      scheduledTimeStart: scheduledTime || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Customer Intake Form
        </CardTitle>
        <CardDescription>
          {intakeStep === "info" && "Collect customer and service information"}
          {intakeStep === "quote_decision" && "Does the customer want a live quote?"}
          {intakeStep === "assign" && "Assign a technician for the live quote"}
          {intakeStep === "complete" && "Review and create the job"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${intakeStep === "info" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
          <div className={`flex-1 h-1 ${intakeStep !== "info" ? "bg-primary" : "bg-muted"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${intakeStep === "quote_decision" ? "bg-primary text-primary-foreground" : intakeStep !== "info" ? "bg-primary/50 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
          <div className={`flex-1 h-1 ${intakeStep === "assign" || intakeStep === "complete" ? "bg-primary" : "bg-muted"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${intakeStep === "assign" ? "bg-primary text-primary-foreground" : intakeStep === "complete" ? "bg-primary/50 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</div>
          <div className={`flex-1 h-1 ${intakeStep === "complete" ? "bg-primary" : "bg-muted"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${intakeStep === "complete" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>4</div>
        </div>

        {intakeStep === "info" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    placeholder="John Smith"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    placeholder="(312) 555-0123"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    data-testid="input-customer-phone"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customerEmail">Email (optional)</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    data-testid="input-customer-email"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Service Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    data-testid="input-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Chicago"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="60601"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    data-testid="input-zip-code"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Service Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Type *</Label>
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger data-testid="select-service-type">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lead Source</Label>
                  <Select value={leadSource} onValueChange={setLeadSource}>
                    <SelectTrigger data-testid="select-lead-source">
                      <SelectValue placeholder="How did they find us?" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSourceOptions.map((source) => (
                        <SelectItem key={source} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Preferred Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    data-testid="input-scheduled-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Preferred Time</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    data-testid="input-scheduled-time"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Problem Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue the customer is experiencing..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px]"
                    data-testid="input-description"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetForm} data-testid="button-reset-form">
                Clear Form
              </Button>
              <Button 
                onClick={handleContinueToQuoteDecision}
                disabled={!canProceedToQuoteDecision}
                data-testid="button-continue-intake"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {intakeStep === "quote_decision" && (
          <div className="space-y-6">
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{customerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{customerPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{address}{city && `, ${city}`}{zipCode && ` ${zipCode}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Service</p>
                    <p className="font-medium">{serviceType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Priority</p>
                    <Badge className={priorityConfig[priority]?.color}>{priorityConfig[priority]?.label}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Does the customer want a live quote?</h3>
              <p className="text-muted-foreground text-sm">
                If yes, a technician will be assigned before the job can be closed.
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => handleQuoteDecision(false)}
                  data-testid="button-no-quote"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  No, Schedule Only
                </Button>
                <Button 
                  size="lg"
                  onClick={() => handleQuoteDecision(true)}
                  data-testid="button-yes-quote"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Yes, Live Quote
                </Button>
              </div>
            </div>

            <div className="flex justify-start">
              <Button variant="ghost" onClick={() => setIntakeStep("info")} data-testid="button-back-info">
                Back to Information
              </Button>
            </div>
          </div>
        )}

        {intakeStep === "assign" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Assign Technician for Live Quote</h3>
              <p className="text-muted-foreground text-sm">
                A technician must be assigned before the job can be created.
              </p>
            </div>

            <div className="space-y-4">
              <Label>Select Technician</Label>
              <Select value={assignedTechnicianId} onValueChange={setAssignedTechnicianId}>
                <SelectTrigger data-testid="select-assign-tech">
                  <SelectValue placeholder="Choose a technician..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTechs.length === 0 ? (
                    <SelectItem value="_none" disabled>No technicians available</SelectItem>
                  ) : (
                    availableTechs.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4" />
                          <span>{tech.fullName}</span>
                          <Badge className="ml-2 text-xs bg-emerald-500/20 text-emerald-400">Available</Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {availableTechs.length === 0 && (
                <p className="text-sm text-amber-400">
                  No technicians are currently available. You may need to wait or contact a technician directly.
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setIntakeStep("quote_decision")} data-testid="button-back-quote">
                Back
              </Button>
              <Button 
                onClick={handleAssignTech}
                disabled={!assignedTechnicianId}
                data-testid="button-confirm-assign"
              >
                Continue with Assignment
              </Button>
            </div>
          </div>
        )}

        {intakeStep === "complete" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-semibold">Ready to Create Job</h3>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{customerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{customerPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{address}{city && `, ${city}`}{zipCode && ` ${zipCode}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Service</p>
                    <p className="font-medium">{serviceType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Priority</p>
                    <Badge className={priorityConfig[priority]?.color}>{priorityConfig[priority]?.label}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Live Quote</p>
                    <p className="font-medium">{wantsLiveQuote ? "Yes" : "No"}</p>
                  </div>
                  {wantsLiveQuote && assignedTechnicianId && (
                    <div>
                      <p className="text-muted-foreground">Assigned Tech</p>
                      <p className="font-medium">
                        {technicians.find(t => t.id === assignedTechnicianId)?.fullName || "Unknown"}
                      </p>
                    </div>
                  )}
                </div>
                {description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-sm">Description</p>
                      <p className="text-sm">{description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setIntakeStep(wantsLiveQuote ? "assign" : "quote_decision")}
                data-testid="button-back-review"
              >
                Back
              </Button>
              <Button 
                onClick={handleCreateJob}
                disabled={createJobMutation.isPending}
                data-testid="button-create-job"
              >
                {createJobMutation.isPending ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DispatcherDashboard() {
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState("dispatch");

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: calls = [], isLoading: callsLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls?limit=10"],
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const { data: quotes = [], isLoading: quotesLoading, isError: quotesError } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const pendingQuotes = quotes.filter(q => q.status === "draft");

  const assignMutation = useMutation({
    mutationFn: async ({ jobId, technicianId }: { jobId: string; technicianId: string }) => {
      return apiRequest("POST", `/api/jobs/${jobId}/assign`, { technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      setAssignDialogOpen(false);
      setSelectedJob(null);
      toast({
        title: "Job Assigned",
        description: "The technician has been notified.",
      });
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Could not assign the job. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssign = (job: Job) => {
    setSelectedJob(job);
    setAssignDialogOpen(true);
  };

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setDetailsDialogOpen(true);
  };

  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const pendingJobs = jobs.filter(j => j.status === "pending");
  const assignedJobs = jobs.filter(j => j.status === "assigned");
  const confirmedJobs = jobs.filter(j => j.status === "confirmed");
  const enRouteJobs = jobs.filter(j => j.status === "en_route");
  const onSiteJobs = jobs.filter(j => ["on_site", "in_progress"].includes(j.status));

  const newLeads = leads.filter(l => l.status === "new");
  const availableTechs = technicians.filter(t => t.status === "available");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Dispatch Center</h1>
          <p className="text-muted-foreground">Manage jobs, calls, and technician assignments</p>
        </div>
        <Button onClick={() => setActiveTab("newjob")} data-testid="button-new-job">
          <Plus className="w-4 h-4 mr-2" />
          New Job
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="newjob" data-testid="tab-newjob">
            <ClipboardList className="w-4 h-4 mr-2" />
            New Job
          </TabsTrigger>
          <TabsTrigger value="dispatch" data-testid="tab-dispatch">
            <Truck className="w-4 h-4 mr-2" />
            Dispatch Board
          </TabsTrigger>
          <TabsTrigger value="callteam" data-testid="tab-callteam">
            <Moon className="w-4 h-4 mr-2" />
            Call Team (7PM-7AM)
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <FileText className="w-4 h-4 mr-2" />
            Quotes ({pendingQuotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="newjob">
          <CustomerIntakeForm 
            technicians={technicians} 
            onJobCreated={() => setActiveTab("dispatch")} 
          />
        </TabsContent>

        <TabsContent value="dispatch" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/20">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingJobs.length}</p>
                    <p className="text-sm text-muted-foreground">Pending Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-500/20">
                    <Truck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-active-count">{activeJobs.length}</p>
                    <p className="text-sm text-muted-foreground">Active Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-500/20">
                    <Wrench className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-available-techs">{availableTechs.length}</p>
                    <p className="text-sm text-muted-foreground">Available Techs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-500/20">
                    <User className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-new-leads">{newLeads.length}</p>
                    <p className="text-sm text-muted-foreground">New Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Job Board</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Pending ({pendingJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {pendingJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {pendingJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No pending jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Assigned ({assignedJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {assignedJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {assignedJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No assigned jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmed ({confirmedJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {confirmedJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {confirmedJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No confirmed jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        En Route ({enRouteJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {enRouteJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {enRouteJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No en route jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <PlayCircle className="w-4 h-4" />
                        On Site ({onSiteJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {onSiteJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {onSiteJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No on site jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Recent Calls
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px]">
                    {callsLoading ? (
                      <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : calls.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No recent calls</div>
                    ) : (
                      calls.slice(0, 10).map((call) => (
                        <CallItem key={call.id} call={call} />
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-4 h-4" />
                    New Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px]">
                    {leadsLoading ? (
                      <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : newLeads.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No new leads</div>
                    ) : (
                      newLeads.slice(0, 10).map((lead) => (
                        <LeadItem key={lead.id} lead={lead} />
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="callteam">
          <CallTeamTab technicians={technicians} />
        </TabsContent>

        <TabsContent value="quotes" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pending Quotes for Review
              </CardTitle>
              <CardDescription>
                Review and approve quotes submitted by technicians
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading quotes...</div>
              ) : quotesError ? (
                <div className="text-center py-8 text-destructive">Failed to load quotes. Please try again.</div>
              ) : pendingQuotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pending quotes to review</div>
              ) : (
                <div className="space-y-4">
                  {pendingQuotes.map((quote) => (
                    <QuoteReviewCard key={quote.id} quote={quote} jobs={jobs} technicians={technicians} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssignJobDialog
        job={selectedJob}
        technicians={technicians}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={(jobId, technicianId) => assignMutation.mutate({ jobId, technicianId })}
        isPending={assignMutation.isPending}
      />

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Details - {selectedJob?.customerName}</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList>
                <TabsTrigger value="details" data-testid="tab-job-details">Details</TabsTrigger>
                <TabsTrigger value="timeline" data-testid="tab-job-timeline">Timeline</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedJob.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedJob.customerPhone}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedJob.address}, {selectedJob.city}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium">{selectedJob.serviceType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={jobStatusConfig[selectedJob.status]?.color}>
                      {jobStatusConfig[selectedJob.status]?.label || selectedJob.status}
                    </Badge>
                  </div>
                  {selectedJob.scheduledDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="font-medium">
                        {format(new Date(selectedJob.scheduledDate), "MMM d, yyyy")}
                        {selectedJob.scheduledTimeStart && ` at ${selectedJob.scheduledTimeStart}`}
                      </p>
                    </div>
                  )}
                  {selectedJob.description && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{selectedJob.description}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <JobTimeline job={selectedJob} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
