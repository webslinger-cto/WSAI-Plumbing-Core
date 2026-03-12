import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Phone,
  User,
  MapPin,
  Mail,
  Clock,
  FileText,
  DollarSign,
  Save,
  ArrowRight,
  Building2,
  ClipboardList,
  Moon,
  Loader2,
  ChevronRight,
  CheckCircle2,
  X,
  Play,
  Flag,
  Truck,
  Wrench,
  Hammer,
  CalendarPlus,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import QuoteBuilder from "@/components/QuoteBuilder";
import type { Lead, Quote, Job, Technician } from "@shared/schema";
import { format } from "date-fns";

const intakeFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  contactTenantName: z.string().optional(),
  contactTenantPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  propertyType: z.string().optional(),
  source: z.string().min(1, "Lead source is required"),
  serviceType: z.string().optional(),
  description: z.string().optional(),
  estimateAmount: z.string().optional(),
  nightWeekendCall: z.boolean().default(false),
  rehab: z.boolean().default(false),
  intakeNotes: z.string().optional(),
  priority: z.string().default("normal"),
  recipient: z.string().optional(),
});

type IntakeFormValues = z.infer<typeof intakeFormSchema>;

const PROPERTY_TYPES = [
  { value: "SFH", label: "Single Family Home" },
  { value: "Townhome", label: "Townhome" },
  { value: "2-3 Flat", label: "2 or 3 Flat" },
  { value: "Condo/Multi-Unit", label: "Condo / Multi-Unit" },
  { value: "Business/Commercial", label: "Business / Commercial" },
];

const LEAD_SOURCES = [
  { value: "Phone Call", label: "Phone Call" },
  { value: "Walk-In", label: "Walk-In" },
  { value: "Referral", label: "Referral" },
  { value: "Website", label: "Website" },
  { value: "eLocal", label: "eLocal" },
  { value: "Networx", label: "Networx" },
  { value: "Angi", label: "Angi" },
  { value: "Thumbtack", label: "Thumbtack" },
  { value: "Google", label: "Google" },
  { value: "Yelp", label: "Yelp" },
  { value: "Other", label: "Other" },
];

const SERVICE_TYPES = [
  { value: "Sewer Main", label: "Sewer Main" },
  { value: "Drain Cleaning", label: "Drain Cleaning" },
  { value: "Sewer Repair", label: "Sewer Repair" },
  { value: "Sewer Lining", label: "Sewer Lining" },
  { value: "Camera Inspection", label: "Camera Inspection" },
  { value: "Water Line", label: "Water Line" },
  { value: "Plumbing", label: "Plumbing" },
  { value: "Excavation", label: "Excavation" },
  { value: "Ejector Pit", label: "Ejector Pit" },
  { value: "Flood Control", label: "Flood Control" },
  { value: "Other", label: "Other" },
];

const WORKFLOW_STAGES = [
  { key: "new", label: "Intake", description: "Customer information captured" },
  { key: "estimated", label: "Estimate", description: "Estimate provided" },
  { key: "quoted", label: "Quote", description: "Quote sent to customer" },
  { key: "converted", label: "Job Created", description: "Job created" },
  { key: "assigned", label: "Assigned", description: "Technician assigned" },
  { key: "in_progress", label: "In Progress", description: "Work in progress" },
  { key: "completed", label: "Completed", description: "Job completed" },
];

interface PrefillData {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  serviceType?: string;
  description?: string;
  source?: string;
}

interface CustomerIntakeFormProps {
  lead?: Lead | null;
  prefill?: PrefillData;
  onClose?: () => void;
  onLeadCreated?: (lead: Lead) => void;
}

export default function CustomerIntakeForm({ lead, prefill, onClose, onLeadCreated }: CustomerIntakeFormProps) {
  const { toast } = useToast();
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [savedLead, setSavedLead] = useState<Lead | null>(null);
  const [showQuoteBuilderSheet, setShowQuoteBuilderSheet] = useState(false);
  const [quoteBuilderJobId, setQuoteBuilderJobId] = useState<string | null>(null);
  const isEditing = !!lead;

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const { data: linkedQuotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    select: (data) => data.filter(q => {
      if (!lead) return false;
      if (q.leadId === lead.id) return true;
      return q.customerPhone === lead.customerPhone || q.customerName === lead.customerName;
    }),
    enabled: !!lead,
  });

  const { data: linkedJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    select: (data) => data.filter(j => {
      if (!lead) return false;
      return j.leadId === lead.id;
    }),
    enabled: !!lead,
  });

  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      customerName: lead?.customerName || prefill?.customerName || "",
      customerPhone: lead?.customerPhone || prefill?.customerPhone || "",
      customerEmail: lead?.customerEmail || prefill?.customerEmail || "",
      contactTenantName: lead?.contactTenantName || "",
      contactTenantPhone: lead?.contactTenantPhone || "",
      address: lead?.address || prefill?.address || "",
      city: lead?.city || prefill?.city || "",
      state: lead?.state || "IL",
      zipCode: lead?.zipCode || prefill?.zipCode || "",
      propertyType: lead?.propertyType || "",
      source: lead?.source || prefill?.source || "Phone Call",
      serviceType: lead?.serviceType || prefill?.serviceType || "",
      description: lead?.description || prefill?.description || "",
      estimateAmount: lead?.estimateAmount || "",
      nightWeekendCall: lead?.nightWeekendCall || false,
      rehab: lead?.rehab || false,
      intakeNotes: lead?.intakeNotes || "",
      priority: lead?.priority || "normal",
      recipient: lead?.recipient || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: IntakeFormValues) => {
      const payload = {
        ...data,
        receivedAt: new Date().toISOString(),
        status: "new",
      };
      const res = await apiRequest("POST", "/api/leads", payload);
      return res.json();
    },
    onSuccess: (newLead: Lead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Customer Intake Created", description: `Lead created for ${newLead.customerName}` });
      setSavedLead(newLead);
      onLeadCreated?.(newLead);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create intake record", variant: "destructive" });
    },
  });

  const buildQuoteMutation = useMutation({
    mutationFn: async () => {
      const theLead = savedLead || lead;
      if (!theLead) throw new Error("No lead available");
      const fullAddress = [theLead.address, theLead.city, theLead.state, theLead.zipCode].filter(Boolean).join(", ");
      const res = await apiRequest("POST", "/api/jobs", {
        leadId: theLead.id,
        customerName: theLead.customerName,
        customerPhone: theLead.customerPhone,
        address: fullAddress || "Address pending",
        serviceType: theLead.serviceType || "Sewer Service",
        status: "pending",
        priority: theLead.priority || "normal",
        scheduledDate: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: (job: Job) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setQuoteBuilderJobId(job.id);
      setShowQuoteBuilderSheet(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create job for quote", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: IntakeFormValues) => {
      const res = await apiRequest("PATCH", `/api/leads/${lead!.id}`, data);
      return res.json();
    },
    onSuccess: (updatedLead: Lead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Intake Updated", description: "Customer intake record updated" });
      setSavedLead(updatedLead);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update intake record", variant: "destructive" });
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const fullAddress = lead.address ? `${lead.address}${lead.city ? ', ' + lead.city : ''}${lead.state ? ', ' + lead.state : ''} ${lead.zipCode || ''}`.trim() : undefined;
      const res = await apiRequest("POST", "/api/quotes", {
        leadId: lead.id,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        customerEmail: lead.customerEmail || undefined,
        address: fullAddress,
        city: lead.city || undefined,
        zipCode: lead.zipCode || undefined,
        status: "draft",
        subtotal: lead.estimateAmount || "0",
        total: lead.estimateAmount || "0",
        notes: `Created from intake - Lead #${lead.id.substring(0, 8)}`,
      });
      const quote = await res.json();
      await apiRequest("PATCH", `/api/leads/${lead.id}`, { status: "quoted" });
      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setShowQuoteDialog(false);
      toast({ title: "Quote Created", description: `Draft quote created for ${lead?.customerName}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create quote", variant: "destructive" });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      const theLead = savedLead || lead;
      if (!theLead) return;
      const res = await apiRequest("POST", "/api/jobs", {
        leadId: theLead.id,
        customerName: theLead.customerName,
        customerPhone: theLead.customerPhone,
        customerEmail: theLead.customerEmail || undefined,
        address: theLead.address || "Address pending",
        city: theLead.city || undefined,
        zipCode: theLead.zipCode || undefined,
        serviceType: theLead.serviceType || "Sewer Service",
        description: theLead.description || `Job from intake - ${theLead.customerName}`,
        status: "pending",
        priority: theLead.priority || "normal",
      });
      const job = await res.json();
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setShowJobDialog(false);
      const theLead = savedLead || lead;
      toast({ title: "Job Created", description: `Job created for ${theLead?.customerName}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create job", variant: "destructive" });
    },
  });

  const assignTechMutation = useMutation({
    mutationFn: async (techId: string) => {
      if (!linkedJobs.length) return;
      const jobId = linkedJobs[0].id;
      await apiRequest("POST", `/api/jobs/${jobId}/assign`, { technicianId: techId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setShowAssignDialog(false);
      toast({ title: "Technician Assigned", description: "Technician has been assigned to the job" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign technician", variant: "destructive" });
    },
  });

  const setEstimateMutation = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const estimateVal = form.getValues("estimateAmount");
      return apiRequest("PATCH", `/api/leads/${lead.id}`, { 
        status: "estimated",
        estimateAmount: estimateVal || "0",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Estimate Set", description: "Lead marked as estimated" });
    },
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      await apiRequest("PATCH", `/api/jobs/${jobId}`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      const statusLabels: Record<string, string> = {
        en_route: "En Route",
        in_progress: "In Progress",
        completed: "Completed",
      };
      toast({ 
        title: `Job ${statusLabels[variables.status] || variables.status}`, 
        description: `Job status updated to ${statusLabels[variables.status] || variables.status}` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update job status", variant: "destructive" });
    },
  });

  const onSubmit = (data: IntakeFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const hasQuote = linkedQuotes.length > 0;
  const hasJob = linkedJobs.length > 0;
  const jobAssigned = linkedJobs.some(j => j.assignedTechnicianId);
  const latestJob = linkedJobs.length > 0 ? linkedJobs[0] : null;
  const jobStatus = latestJob?.status || null;
  const isJobInProgress = jobStatus === "in_progress" || jobStatus === "on_site" || jobStatus === "en_route";
  const isJobCompleted = jobStatus === "completed";

  const getEffectiveStageIndex = () => {
    if (!lead) return 0;
    if (isJobCompleted) return WORKFLOW_STAGES.length - 1;
    if (isJobInProgress) return WORKFLOW_STAGES.findIndex(s => s.key === "in_progress");
    if (jobAssigned) return WORKFLOW_STAGES.findIndex(s => s.key === "assigned");
    if (hasJob) return WORKFLOW_STAGES.findIndex(s => s.key === "converted");
    if (hasQuote) return WORKFLOW_STAGES.findIndex(s => s.key === "quoted");
    const leadIdx = WORKFLOW_STAGES.findIndex(s => s.key === lead.status);
    return leadIdx >= 0 ? leadIdx : 0;
  };
  const currentStageIndex = getEffectiveStageIndex();

  return (
    <div className="space-y-6">
      {isEditing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Workflow Progress</h3>
              {lead && (
                <Badge variant="outline" data-testid="text-lead-status">
                  {isJobCompleted ? "COMPLETED" : isJobInProgress ? "IN PROGRESS" : lead.status?.toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-2" data-testid="section-workflow-stages">
              {WORKFLOW_STAGES.map((stage, index) => {
                const isActive = index <= currentStageIndex;
                const isCurrent = index === currentStageIndex;
                return (
                  <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                      isCurrent 
                        ? stage.key === "completed" ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"
                        : isActive 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {isActive && <CheckCircle2 className="w-3 h-3" />}
                      {stage.label}
                    </div>
                    {index < WORKFLOW_STAGES.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <Separator className="my-3" />

            <div className="flex items-center gap-2 flex-wrap">
              {lead && !isJobCompleted && (lead.status === "new" || lead.status === "contacted") && (
                <Button 
                  size="sm" 
                  onClick={() => setEstimateMutation.mutate()}
                  disabled={setEstimateMutation.isPending}
                  data-testid="button-set-estimate"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Mark as Estimated
                </Button>
              )}
              {lead && !isJobCompleted && !hasQuote && (
                <Button 
                  size="sm" 
                  onClick={() => setShowQuoteDialog(true)}
                  data-testid="button-create-quote"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Create Quote
                </Button>
              )}
              {lead && !isJobCompleted && !hasJob && (
                <Button 
                  size="sm" 
                  onClick={() => setShowJobDialog(true)}
                  data-testid="button-create-job"
                >
                  <ClipboardList className="w-4 h-4 mr-1" />
                  Create Job
                </Button>
              )}
              {hasJob && !jobAssigned && !isJobCompleted && (
                <Button 
                  size="sm" 
                  onClick={() => setShowAssignDialog(true)}
                  data-testid="button-assign-tech"
                >
                  <User className="w-4 h-4 mr-1" />
                  Assign Technician
                </Button>
              )}
              {hasJob && jobAssigned && !isJobInProgress && !isJobCompleted && latestJob && (
                <Button
                  size="sm"
                  onClick={() => updateJobStatusMutation.mutate({ 
                    jobId: latestJob.id, 
                    status: "in_progress" 
                  })}
                  disabled={updateJobStatusMutation.isPending}
                  data-testid="button-start-job"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start Job
                </Button>
              )}
              {hasJob && isJobInProgress && latestJob && (
                <Button
                  size="sm"
                  onClick={() => updateJobStatusMutation.mutate({ 
                    jobId: latestJob.id, 
                    status: "completed" 
                  })}
                  disabled={updateJobStatusMutation.isPending}
                  data-testid="button-complete-job"
                >
                  <Flag className="w-4 h-4 mr-1" />
                  Complete Job
                </Button>
              )}
            </div>

            {(hasQuote || hasJob) && (
              <>
                <Separator className="my-3" />
                <div className="flex items-center gap-2 flex-wrap">
                  {hasQuote && linkedQuotes[0] && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-quote-status">
                      Quote: {linkedQuotes[0].status}
                    </Badge>
                  )}
                  {hasJob && latestJob && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-job-status">
                      Job: {latestJob.status}
                    </Badge>
                  )}
                  {latestJob?.assignedTechnicianId && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-tech-assigned">
                      Tech: {technicians.find(t => t.id === latestJob.assignedTechnicianId)?.fullName || "Assigned"}
                    </Badge>
                  )}
                  {isJobCompleted && (
                    <Badge className="text-xs bg-green-600 text-white no-default-hover-elevate no-default-active-elevate" data-testid="badge-completed">
                      Workflow Complete
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="w-5 h-5" />
                Emergency Chicago Sewer Experts - Customer Intake
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Received By</FormLabel>
                      <FormControl>
                        <Input placeholder="Dispatcher name" {...field} data-testid="input-recipient" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name="nightWeekendCall"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-night-weekend"
                          />
                        </FormControl>
                        <FormLabel className="flex items-center gap-1 cursor-pointer">
                          <Moon className="w-3.5 h-3.5" />
                          Night/Weekend
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rehab"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-rehab"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">Rehab</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEAD_SOURCES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Customer name" {...field} data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input placeholder="(xxx) xxx-xxxx" {...field} data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} data-testid="input-customer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact / Tenant
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactTenantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact / Tenant Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Tenant or contact name" {...field} data-testid="input-tenant-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactTenantPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact / Tenant Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(xxx) xxx-xxxx" {...field} data-testid="input-tenant-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Service Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} data-testid="input-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="IL" {...field} data-testid="input-state" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip</FormLabel>
                          <FormControl>
                            <Input placeholder="60601" {...field} data-testid="input-zip" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-property-type">
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROPERTY_TYPES.map(p => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Service Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-service-type">
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_TYPES.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimateAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimate $</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              className="pl-8" 
                              {...field} 
                              data-testid="input-estimate-amount" 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the service needed..." 
                            className="resize-none" 
                            rows={3} 
                            {...field} 
                            data-testid="input-description" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Notes</h3>
                <FormField
                  control={form.control}
                  name="intakeNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes..." 
                          className="resize-none" 
                          rows={3} 
                          {...field} 
                          data-testid="input-notes" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-intake">
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-intake"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isEditing ? "Update Intake" : "Save Intake"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* ── What's Next panel (shown after a new intake is saved) ── */}
      {savedLead && (
        <Card className="border-green-500/40 bg-green-500/5" data-testid="section-whats-next">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  Intake saved for {savedLead.customerName}!
                </p>
                <p className="text-xs text-muted-foreground">Choose your next step:</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => buildQuoteMutation.mutate()}
                disabled={buildQuoteMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white"
                data-testid="button-build-quote-nextstep"
              >
                {buildQuoteMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                )}
                Build Quote / Estimate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowJobDialog(true)}
                data-testid="button-schedule-job-nextstep"
              >
                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                Schedule a Job
              </Button>
              {onClose && (
                <Button size="sm" variant="ghost" onClick={onClose} data-testid="button-done-intake">
                  Done
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Quote from Intake</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create a draft quote for <strong>{(savedLead || lead)?.customerName}</strong> using the information from this intake.
            {lead?.estimateAmount && (
              <span> Estimate amount: <strong>${lead.estimateAmount}</strong></span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createQuoteMutation.mutate()}
              disabled={createQuoteMutation.isPending}
              data-testid="button-confirm-create-quote"
            >
              {createQuoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Job from Intake</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create a new job for <strong>{lead?.customerName}</strong> at{" "}
            <strong>{lead?.address || "address pending"}</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createJobMutation.mutate()}
              disabled={createJobMutation.isPending}
              data-testid="button-confirm-create-job"
            >
              {createJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {technicians.map(tech => (
              <Button
                key={tech.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => assignTechMutation.mutate(tech.id)}
                disabled={assignTechMutation.isPending}
                data-testid={`button-assign-tech-${tech.id}`}
              >
                <User className="w-4 h-4 mr-2" />
                {tech.fullName}
                <Badge variant="outline" className="ml-auto text-xs">{tech.status}</Badge>
              </Button>
            ))}
            {technicians.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No technicians available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── QuoteBuilder Sheet (opened after "Build Quote" creates a pending job) ── */}
      <Sheet open={showQuoteBuilderSheet} onOpenChange={setShowQuoteBuilderSheet}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <SheetHeader className="p-6 pb-2 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Build Quote for {(savedLead || lead)?.customerName}
            </SheetTitle>
          </SheetHeader>
          {quoteBuilderJobId && (
            <div className="p-4 overflow-y-auto">
              <QuoteBuilder
                jobId={quoteBuilderJobId}
                customerName={(savedLead || lead)?.customerName || ""}
                customerPhone={(savedLead || lead)?.customerPhone || ""}
                onQuoteCreated={() => setShowQuoteBuilderSheet(false)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
