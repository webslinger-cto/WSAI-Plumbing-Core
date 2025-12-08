import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import type { Job, Lead, Call, Technician } from "@shared/schema";
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

function JobCard({ job, onAssign }: { job: Job; onAssign: (job: Job) => void }) {
  const status = jobStatusConfig[job.status] || jobStatusConfig.pending;
  const priority = priorityConfig[job.priority || "normal"] || priorityConfig.normal;
  const StatusIcon = status.icon;

  return (
    <Card className="mb-2">
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
              onClick={() => onAssign(job)}
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

export default function DispatcherDashboard() {
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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
        <Button data-testid="button-new-job">
          <Plus className="w-4 h-4 mr-2" />
          New Job
        </Button>
      </div>

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
                      <JobCard key={job.id} job={job} onAssign={handleAssign} />
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
                      <JobCard key={job.id} job={job} onAssign={handleAssign} />
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
                      <JobCard key={job.id} job={job} onAssign={handleAssign} />
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
                      <JobCard key={job.id} job={job} onAssign={handleAssign} />
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
                      <JobCard key={job.id} job={job} onAssign={handleAssign} />
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

      <AssignJobDialog
        job={selectedJob}
        technicians={technicians}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={(jobId, technicianId) => assignMutation.mutate({ jobId, technicianId })}
        isPending={assignMutation.isPending}
      />
    </div>
  );
}
