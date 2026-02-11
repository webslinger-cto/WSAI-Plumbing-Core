import { useState } from "react";
import LeadsTable, { type Lead } from "@/components/LeadsTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Download, Upload, Phone, Mail, MapPin, Calendar, DollarSign, PhoneCall, Loader2, TrendingUp, RefreshCw, Copy, Link, History, Wifi, WifiOff, Plus, Building2, Globe, Users, Trash2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SlaTimer } from "@/components/SlaTimer";
import { CustomerTimeline } from "@/components/CustomerTimeline";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertLeadSchema, type Lead as ApiLead } from "@shared/schema";

const LEAD_SOURCES = [
  { value: "Direct", label: "Direct / Phone Call", icon: Phone },
  { value: "Website", label: "Website Form", icon: Globe },
  { value: "website_chat", label: "Website Chat", icon: Globe },
  { value: "Referral", label: "Customer Referral", icon: Users },
  { value: "Thumbtack", label: "Thumbtack", icon: Building2 },
  { value: "Angi", label: "Angi", icon: Building2 },
  { value: "HomeAdvisor", label: "HomeAdvisor", icon: Building2 },
  { value: "eLocal", label: "eLocal", icon: Building2 },
  { value: "Networx", label: "Networx", icon: Building2 },
  { value: "Inquirly", label: "Inquirly", icon: Building2 },
];

const SERVICE_TYPES = [
  "Drain Cleaning",
  "Sewer Main Line",
  "Sewer Repair",
  "Camera Inspection",
  "Hydro Jetting",
  "Water Heater",
  "Plumbing Repair",
  "Emergency Service",
  "Other",
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface CompanySettingsData {
  id?: string;
  leadApiEnabled?: boolean;
  [key: string]: unknown;
}

function mapApiLeadToTableLead(lead: ApiLead): Lead & { slaBreach?: boolean } {
  return {
    id: lead.id,
    name: lead.customerName,
    phone: lead.customerPhone,
    email: lead.customerEmail || undefined,
    address: lead.address || "",
    city: lead.city || "",
    state: "IL",
    zipCode: lead.zipCode || "",
    source: lead.source,
    service: lead.serviceType || "Not specified",
    status: (lead.status as Lead["status"]) || "new",
    cost: lead.cost ? Number(lead.cost) : 0,
    date: lead.createdAt ? new Date(lead.createdAt).toISOString().split("T")[0] : "",
    slaDeadline: lead.slaDeadline ? String(lead.slaDeadline) : null,
    contactedAt: lead.contactedAt ? String(lead.contactedAt) : null,
    priority: lead.priority || "normal",
    slaBreach: lead.slaBreach || false,
    leadScore: lead.leadScore || 50,
    isDuplicate: lead.isDuplicate || false,
    duplicateOfId: lead.duplicateOfId || null,
  };
}

// Form schema with proper type transformations for UI input
const newLeadFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  customerEmail: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("Invalid email address").optional()
  ),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  source: z.string().default("Direct"),
  serviceType: z.string().optional(),
  description: z.string().optional(),
  priority: z.string().default("normal"),
  cost: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional()
  ),
});

type NewLeadFormData = z.infer<typeof newLeadFormSchema>;

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form for new lead creation
  const form = useForm<NewLeadFormData>({
    resolver: zodResolver(newLeadFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      address: "",
      city: "",
      zipCode: "",
      source: "Direct",
      serviceType: "",
      description: "",
      priority: "normal",
      cost: "",
    },
  });

  const { data: apiLeads = [], isLoading } = useQuery<ApiLead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: settings } = useQuery<CompanySettingsData>({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettingsData>) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Lead API integration setting has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const leadApiEnabled = settings?.leadApiEnabled !== false;

  const leads = apiLeads.map(mapApiLeadToTableLead);

  const markContactedMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/contact`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: data.slaBreached ? "SLA Breached" : "Lead Contacted",
        description: data.slaBreached 
          ? `Response time: ${data.responseTimeMinutes} minutes (SLA exceeded)`
          : `Lead marked as contacted. Response time: ${data.responseTimeMinutes} minutes`,
        variant: data.slaBreached ? "destructive" : "default",
      });
      setSelectedLead(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark lead as contacted",
        variant: "destructive",
      });
    },
  });

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/leads/${leadId}`, { status });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Status Updated",
        description: `Lead status changed to "${variables.status}"`,
      });
      setStatusDialogOpen(false);
      setSelectedLead(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createQuoteFromLeadMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const fullAddress = [lead.address, lead.city, "IL", lead.zipCode].filter(Boolean).join(", ");
      const response = await apiRequest("POST", "/api/quotes", {
        leadId: lead.id,
        customerName: lead.name,
        customerPhone: lead.phone,
        address: fullAddress,
        status: "draft",
        subtotal: "0",
        total: "0",
        notes: `Quote created from lead: ${lead.service || "Service inquiry"}`,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote Created",
        description: "A new draft quote has been created from this lead.",
      });
      setSelectedLead(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createJobFromLeadMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const fullAddress = [lead.address, lead.city, "IL", lead.zipCode].filter(Boolean).join(", ");
      const response = await apiRequest("POST", "/api/jobs", {
        leadId: lead.id,
        customerName: lead.name,
        customerPhone: lead.phone,
        address: fullAddress || lead.city || "",
        city: lead.city || "",
        zipCode: lead.zipCode || "",
        serviceType: lead.service || "General",
        description: lead.service || "Service from lead",
        status: "pending",
        priority: lead.priority || "normal",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Created",
        description: "A new job has been created from this lead.",
      });
      setSelectedLead(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return apiRequest("DELETE", `/api/leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLead(null);
      setDeleteConfirmOpen(false);
      toast({ title: "Lead Deleted", description: "The lead and all related data have been removed." });
    },
    onError: () => {
      toast({ title: "Delete Failed", description: "Could not delete the lead.", variant: "destructive" });
    },
  });

  const recalculateScoresMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/leads/recalculate-scores");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Scores Recalculated",
        description: `Updated scores for ${data.updated} leads`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recalculate scores",
        variant: "destructive",
      });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: NewLeadFormData) => {
      const response = await apiRequest("POST", "/api/leads", {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || null,
        address: data.address || null,
        city: data.city || null,
        zipCode: data.zipCode || null,
        source: data.source,
        serviceType: data.serviceType || null,
        description: data.description || null,
        priority: data.priority,
        cost: data.cost ? data.cost : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Created",
        description: "New lead has been added successfully.",
      });
      setIsNewLeadDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitNewLead = (data: NewLeadFormData) => {
    createLeadMutation.mutate(data);
  };

  const handleMarkContacted = () => {
    if (selectedLead) {
      markContactedMutation.mutate(selectedLead.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Manage and track all incoming leads from your sources
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={() => setIsNewLeadDialogOpen(true)}
            data-testid="button-new-lead"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
          <Button 
            variant="outline" 
            onClick={() => recalculateScoresMutation.mutate()}
            disabled={recalculateScoresMutation.isPending}
            data-testid="button-recalculate-scores"
          >
            {recalculateScoresMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Recalculate Scores
          </Button>
          <Button variant="outline" data-testid="button-export-leads">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" data-testid="button-import-leads">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <div className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${leadApiEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
        <div className="flex items-center gap-3">
          {leadApiEnabled ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-yellow-400" />
          )}
          <div>
            <Label htmlFor="leadApiToggle" className="text-sm font-medium cursor-pointer">
              Lead API Integration
            </Label>
            <p className="text-xs text-muted-foreground">
              {leadApiEnabled 
                ? "Receiving leads from Thumbtack, Angi, Zapier & other sources" 
                : "Lead webhooks are paused - no new leads will be created"
              }
            </p>
          </div>
        </div>
        <Switch
          id="leadApiToggle"
          checked={leadApiEnabled}
          onCheckedChange={(checked) => updateSettingsMutation.mutate({ leadApiEnabled: checked })}
          disabled={updateSettingsMutation.isPending}
          data-testid="switch-lead-api-toggle"
        />
      </div>

      <LeadsTable leads={leads} onLeadClick={setSelectedLead} />

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedLead.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">
                      {selectedLead.source}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={`${
                        (selectedLead.leadScore || 50) >= 80 ? "bg-green-500/10 text-green-400 border-green-500/30" :
                        (selectedLead.leadScore || 50) >= 60 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                        (selectedLead.leadScore || 50) >= 40 ? "bg-sky-500/10 text-sky-400 border-sky-500/30" :
                        "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                      data-testid="badge-lead-score"
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Score: {selectedLead.leadScore || 50}
                    </Badge>
                    <SlaTimer
                      slaDeadline={selectedLead.slaDeadline || null}
                      contactedAt={selectedLead.contactedAt || null}
                    />
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="capitalize"
                >
                  {selectedLead.status}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedLead.phone}</span>
                  </div>
                  {selectedLead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedLead.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {[selectedLead.address, selectedLead.city, selectedLead.state, selectedLead.zipCode].filter(Boolean).join(", ") || "No address"}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedLead.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>Lead Cost: ${selectedLead.cost}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-1">Service Requested</p>
                <p className="text-sm text-muted-foreground">{selectedLead.service}</p>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Customer History</p>
                </div>
                <CustomerTimeline phone={selectedLead.phone} />
              </div>

              {selectedLead.isDuplicate && (
                <>
                  <Separator />
                  <div className="p-3 rounded-md bg-purple-500/10 border border-purple-500/30" data-testid="duplicate-alert">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Copy className="w-4 h-4" />
                      <span className="font-medium">Duplicate Lead Detected</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      This lead has the same phone number as an existing lead.
                    </p>
                    {selectedLead.duplicateOfId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const originalLead = leads.find(l => l.id === selectedLead.duplicateOfId);
                          if (originalLead) {
                            setSelectedLead(originalLead);
                          }
                        }}
                        data-testid="button-view-original"
                      >
                        <Link className="w-3 h-3 mr-1" />
                        View Original Lead
                      </Button>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2 flex-wrap">
                {!selectedLead.contactedAt && selectedLead.status === "new" && (
                  <Button 
                    variant="outline"
                    onClick={handleMarkContacted}
                    disabled={markContactedMutation.isPending}
                    data-testid="button-mark-contacted"
                  >
                    {markContactedMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <PhoneCall className="w-4 h-4 mr-2" />
                    )}
                    Mark Contacted
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (selectedLead) createQuoteFromLeadMutation.mutate(selectedLead);
                  }}
                  disabled={createQuoteFromLeadMutation.isPending}
                  data-testid="button-create-quote"
                >
                  {createQuoteFromLeadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Create Quote
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (selectedLead) createJobFromLeadMutation.mutate(selectedLead);
                  }}
                  disabled={createJobFromLeadMutation.isPending}
                  data-testid="button-create-job"
                >
                  {createJobFromLeadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Create Job
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStatusDialogOpen(true)}
                  data-testid="button-update-status"
                >
                  Update Status
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/50"
                  onClick={() => setDeleteConfirmOpen(true)}
                  data-testid="button-delete-lead"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Lead Status</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {["new", "contacted", "estimated", "quoted", "converted", "assigned", "in_progress", "completed", "lost", "dead"].map((status) => (
              <Button
                key={status}
                variant="outline"
                className="capitalize"
                onClick={() => {
                  if (selectedLead) {
                    updateLeadStatusMutation.mutate({ leadId: selectedLead.id, status });
                  }
                }}
                disabled={updateLeadStatusMutation.isPending}
                data-testid={`button-status-${status}`}
              >
                {status.replace("_", " ")}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Lead
            </DialogTitle>
            <DialogDescription>
              This will permanently delete "{selectedLead?.name}" and all related quotes, timeline events, and communications. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedLead) deleteLeadMutation.mutate(selectedLead.id);
              }}
              disabled={deleteLeadMutation.isPending}
              data-testid="button-confirm-delete-lead"
            >
              {deleteLeadMutation.isPending ? "Deleting..." : "Delete Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewLeadDialogOpen} onOpenChange={(open) => {
          setIsNewLeadDialogOpen(open);
          if (!open) form.reset();
        }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewLead)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {LEAD_SOURCES.map((source) => {
                          const Icon = source.icon;
                          return (
                            <Button
                              key={source.value}
                              type="button"
                              variant={field.value === source.value ? "default" : "outline"}
                              className="justify-start h-auto py-2"
                              onClick={() => field.onChange(source.value)}
                              data-testid={`button-source-${source.value.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <Icon className="w-4 h-4 mr-2 shrink-0" />
                              <span className="truncate">{source.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Smith"
                          data-testid="input-customer-name"
                          {...field}
                        />
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
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(312) 555-1234"
                          data-testid="input-customer-phone"
                          {...field}
                        />
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
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          data-testid="input-customer-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          data-testid="input-lead-cost"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main Street"
                          data-testid="input-address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Chicago"
                          data-testid="input-city"
                          {...field}
                        />
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
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="60601"
                          data-testid="input-zip-code"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-service-type">
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the issue or service needed..."
                        rows={3}
                        data-testid="textarea-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewLeadDialogOpen(false);
                    form.reset();
                  }}
                  data-testid="button-cancel-new-lead"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  data-testid="button-submit-new-lead"
                >
                  {createLeadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Lead
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
