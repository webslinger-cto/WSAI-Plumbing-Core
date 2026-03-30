import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Clock,
  MapPin,
  User,
  Wrench,
  Phone,
  Mail,
  FileText,
  Edit3,
  Save,
  X,
  History,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  DollarSign,
  Calendar,
} from "lucide-react";
import type { Job, Quote, Technician, AuditLog } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import JobTimeline from "@/components/JobTimeline";
import { JobChat } from "@/components/JobChat";
import { PermitCenterCard } from "@/features/permits/PermitCenterCard";
import { MessageSquare, ListChecks, ShieldCheck, Camera, ClipboardList } from "lucide-react";
import { JobMediaTab } from "@/components/JobMediaTab";

const jobStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  assigned: { label: "Assigned", color: "bg-blue-500/20 text-blue-400" },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/20 text-emerald-400" },
  en_route: { label: "En Route", color: "bg-amber-500/20 text-amber-400" },
  on_site: { label: "On Site", color: "bg-purple-500/20 text-purple-400" },
  in_progress: { label: "In Progress", color: "bg-primary/20 text-primary" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive" },
  awaiting_permit: { label: "Awaiting Permit", color: "bg-orange-500/20 text-orange-400" },
  awaiting_inspection: { label: "Awaiting Inspection", color: "bg-cyan-500/20 text-cyan-400" },
};

const quoteStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", color: "bg-amber-500/20 text-amber-400" },
  viewed: { label: "Viewed", color: "bg-blue-500/20 text-blue-400" },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400" },
  declined: { label: "Declined", color: "bg-destructive/20 text-destructive" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

interface RecordDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string | null;
  quoteId?: string | null;
  customerId?: string | null;
  technicians?: Technician[];
  canEdit?: boolean;
  userId?: string;
}

export default function RecordDetailPanel({
  open,
  onOpenChange,
  jobId,
  quoteId,
  customerId,
  technicians = [],
  canEdit = false,
  userId,
}: RecordDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("details");

  const entityType = jobId ? "job" : quoteId ? "quote" : "customer";
  const entityId = jobId || quoteId || customerId || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg" data-testid="text-record-panel-title">
            Record Details
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="flex flex-wrap h-auto gap-1 shrink-0">
            <TabsTrigger value="details" className="text-xs sm:text-sm" data-testid="tab-record-details">
              <FileText className="w-3.5 h-3.5 mr-1" />
              Details
            </TabsTrigger>
            {jobId && (
              <TabsTrigger value="quotes" className="text-xs sm:text-sm" data-testid="tab-record-quotes">
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Quotes
              </TabsTrigger>
            )}
            {(jobId || customerId) && (
              <TabsTrigger value="customer" className="text-xs sm:text-sm" data-testid="tab-record-customer">
                <User className="w-3.5 h-3.5 mr-1" />
                Customer
              </TabsTrigger>
            )}
            {jobId && (
              <TabsTrigger value="timeline" className="text-xs sm:text-sm" data-testid="tab-record-timeline">
                <ListChecks className="w-3.5 h-3.5 mr-1" />
                Timeline
              </TabsTrigger>
            )}
            {jobId && (
              <TabsTrigger value="chat" className="text-xs sm:text-sm" data-testid="tab-record-chat">
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Chat
              </TabsTrigger>
            )}
            {jobId && (
              <TabsTrigger value="permits" className="text-xs sm:text-sm" data-testid="tab-record-permits">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Permits
              </TabsTrigger>
            )}
            {jobId && (
              <TabsTrigger value="estimate" className="text-xs sm:text-sm" data-testid="tab-record-estimate">
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Estimate
              </TabsTrigger>
            )}
            {jobId && (
              <TabsTrigger value="permit-inspection" className="text-xs sm:text-sm" data-testid="tab-record-permit-inspection">
                <Briefcase className="w-3.5 h-3.5 mr-1" />
                Permit/Inspect
              </TabsTrigger>
            )}
            {jobId && (
              <TabsTrigger value="media" className="text-xs sm:text-sm" data-testid="tab-record-media">
                <Camera className="w-3.5 h-3.5 mr-1" />
                Media
              </TabsTrigger>
            )}
            <TabsTrigger value="audit" className="text-xs sm:text-sm" data-testid="tab-record-audit">
              <History className="w-3.5 h-3.5 mr-1" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto mt-3">
            <TabsContent value="details" className="mt-0">
              {jobId ? (
                <JobDetailsTab jobId={jobId} technicians={technicians} canEdit={canEdit} />
              ) : quoteId ? (
                <QuoteDetailsTab quoteId={quoteId} canEdit={canEdit} />
              ) : customerId ? (
                <CustomerDetailsTab customerId={customerId} canEdit={canEdit} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">No record selected</div>
              )}
            </TabsContent>

            {jobId && (
              <TabsContent value="quotes" className="mt-0">
                <JobQuotesTab jobId={jobId} canEdit={canEdit} />
              </TabsContent>
            )}

            {(jobId || customerId) && (
              <TabsContent value="customer" className="mt-0">
                <CustomerInfoTab jobId={jobId} customerId={customerId} canEdit={canEdit} />
              </TabsContent>
            )}

            {jobId && (
              <TabsContent value="timeline" className="mt-0">
                <JobTimelineTab jobId={jobId} />
              </TabsContent>
            )}

            {jobId && (
              <TabsContent value="chat" className="mt-0">
                <JobChatTab jobId={jobId} userId={userId} />
              </TabsContent>
            )}

            {jobId && (
              <TabsContent value="permits" className="mt-0">
                <PermitCenterCard jobId={jobId} />
              </TabsContent>
            )}

            {jobId && (
              <TabsContent value="estimate" className="mt-0">
                <EstimateViewTab jobId={jobId} />
              </TabsContent>
            )}

            {jobId && (
              <TabsContent value="permit-inspection" className="mt-0">
                <PermitInspectionTab jobId={jobId} />
              </TabsContent>
            )}

            {jobId && (
              <TabsContent value="media" className="mt-0">
                <JobMediaTab jobId={jobId} />
              </TabsContent>
            )}

            <TabsContent value="audit" className="mt-0">
              {entityId ? (
                <AuditTrailTab entityType={entityType} entityId={entityId} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">No record selected</div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EditableField({
  label,
  value,
  field,
  isEditing,
  onChange,
  type = "text",
  options,
}: {
  label: string;
  value: string | number | null | undefined;
  field: string;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
  type?: "text" | "select" | "textarea" | "date" | "time";
  options?: { value: string; label: string }[];
}) {
  if (!isEditing) {
    return (
      <div className="space-y-1" data-testid={`field-${field}`}>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium text-sm">{value || "-"}</p>
      </div>
    );
  }

  if (type === "select" && options) {
    return (
      <div className="space-y-1.5" data-testid={`field-${field}`}>
        <Label className="text-sm">{label}</Label>
        <Select value={String(value || "")} onValueChange={v => onChange(field, v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className="space-y-1.5" data-testid={`field-${field}`}>
        <Label className="text-sm">{label}</Label>
        <Textarea
          value={String(value || "")}
          onChange={e => onChange(field, e.target.value)}
          rows={2}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid={`field-${field}`}>
      <Label className="text-sm">{label}</Label>
      <Input
        type={type}
        value={String(value || "")}
        onChange={e => onChange(field, e.target.value)}
      />
    </div>
  );
}

function JobDetailsTab({ jobId, technicians, canEdit }: { jobId: string; technicians: Technician[]; canEdit: boolean }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("PATCH", `/api/jobs/${jobId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs", "job", jobId] });
      setIsEditing(false);
      toast({ title: "Job Updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Update Failed", variant: "destructive" });
    },
  });

  const handleEdit = useCallback(() => {
    if (job) {
      setEditData({
        customerName: job.customerName || "",
        customerPhone: job.customerPhone || "",
        customerEmail: job.customerEmail || "",
        address: job.address || "",
        city: job.city || "",
        zipCode: job.zipCode || "",
        serviceType: job.serviceType || "",
        description: job.description || "",
        status: job.status || "pending",
        priority: job.priority || "normal",
        scheduledDate: job.scheduledDate ? format(new Date(job.scheduledDate), "yyyy-MM-dd") : "",
        scheduledTimeStart: job.scheduledTimeStart || "",
        scheduledTimeEnd: job.scheduledTimeEnd || "",
        assignedTechnicianId: job.assignedTechnicianId || "none",
      });
      setIsEditing(true);
    }
  }, [job]);

  const handleSave = useCallback(() => {
    const payload: Record<string, unknown> = { ...editData };
    if (payload.assignedTechnicianId === "none") payload.assignedTechnicianId = null;
    if (payload.scheduledDate && typeof payload.scheduledDate === "string") {
      payload.scheduledDate = new Date((payload.scheduledDate as string) + "T00:00:00").toISOString();
    }
    updateMutation.mutate(payload);
  }, [editData, updateMutation]);

  const handleChange = useCallback((field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  if (!job) return <div className="text-center py-4 text-muted-foreground">Job not found</div>;

  const techName = technicians.find(t => t.id === job.assignedTechnicianId)?.fullName;
  const statusConf = jobStatusConfig[job.status] || jobStatusConfig.pending;

  const displayData = isEditing ? editData : {
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    customerEmail: job.customerEmail || "",
    address: job.address,
    city: job.city || "",
    zipCode: job.zipCode || "",
    serviceType: job.serviceType,
    description: job.description || "",
    status: job.status,
    priority: job.priority || "normal",
    scheduledDate: job.scheduledDate ? format(new Date(job.scheduledDate), "yyyy-MM-dd") : "",
    scheduledTimeStart: job.scheduledTimeStart || "",
    scheduledTimeEnd: job.scheduledTimeEnd || "",
    assignedTechnicianId: job.assignedTechnicianId || "none",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className={statusConf.color}>{statusConf.label}</Badge>
          {job.priority && job.priority !== "normal" && (
            <Badge variant="outline" className="text-xs">{job.priority}</Badge>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-edit">
                  <Save className="w-3.5 h-3.5 mr-1" /> {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleEdit} data-testid="button-edit-record">
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <EditableField label="Customer" value={displayData.customerName} field="customerName" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Phone" value={displayData.customerPhone} field="customerPhone" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Email" value={displayData.customerEmail} field="customerEmail" isEditing={isEditing} onChange={handleChange} />
        <EditableField
          label="Status"
          value={isEditing ? displayData.status : statusConf.label}
          field="status"
          isEditing={isEditing}
          onChange={handleChange}
          type="select"
          options={Object.entries(jobStatusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <div className="sm:col-span-2">
          <EditableField label="Address" value={displayData.address} field="address" isEditing={isEditing} onChange={handleChange} />
        </div>
        <EditableField label="City" value={displayData.city} field="city" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Zip" value={displayData.zipCode} field="zipCode" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Service Type" value={displayData.serviceType} field="serviceType" isEditing={isEditing} onChange={handleChange} />
        <EditableField
          label="Priority"
          value={displayData.priority}
          field="priority"
          isEditing={isEditing}
          onChange={handleChange}
          type="select"
          options={[
            { value: "low", label: "Low" },
            { value: "normal", label: "Normal" },
            { value: "high", label: "High" },
            { value: "urgent", label: "Urgent" },
          ]}
        />
        <EditableField label="Scheduled Date" value={displayData.scheduledDate} field="scheduledDate" isEditing={isEditing} onChange={handleChange} type="date" />
        <div className="flex gap-2">
          <div className="flex-1">
            <EditableField label="Start Time" value={displayData.scheduledTimeStart} field="scheduledTimeStart" isEditing={isEditing} onChange={handleChange} type="time" />
          </div>
          <div className="flex-1">
            <EditableField label="End Time" value={displayData.scheduledTimeEnd} field="scheduledTimeEnd" isEditing={isEditing} onChange={handleChange} type="time" />
          </div>
        </div>
        {isEditing ? (
          <EditableField
            label="Technician"
            value={displayData.assignedTechnicianId}
            field="assignedTechnicianId"
            isEditing={true}
            onChange={handleChange}
            type="select"
            options={[
              { value: "none", label: "Unassigned" },
              ...technicians.map(t => ({ value: t.id, label: t.fullName })),
            ]}
          />
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Technician</p>
            <p className="font-medium text-sm">{techName || "Unassigned"}</p>
          </div>
        )}
        <div className="sm:col-span-2">
          <EditableField label="Notes" value={displayData.description} field="description" isEditing={isEditing} onChange={handleChange} type="textarea" />
        </div>
      </div>

      {!isEditing && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
          {job.createdAt && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-xs">{format(new Date(job.createdAt), "MMM d, yyyy h:mm a")}</p>
            </div>
          )}
          {job.assignedAt && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="text-xs">{format(new Date(job.assignedAt), "MMM d, yyyy h:mm a")}</p>
            </div>
          )}
          {job.startedAt && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="text-xs">{format(new Date(job.startedAt), "MMM d, yyyy h:mm a")}</p>
            </div>
          )}
          {job.completedAt && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xs">{format(new Date(job.completedAt), "MMM d, yyyy h:mm a")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuoteDetailsTab({ quoteId, canEdit }: { quoteId: string; canEdit: boolean }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});

  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ["/api/quotes", quoteId],
    enabled: !!quoteId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("PATCH", `/api/quotes/${quoteId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs", "quote", quoteId] });
      setIsEditing(false);
      toast({ title: "Quote Updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Update Failed", variant: "destructive" });
    },
  });

  const handleChange = useCallback((field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  if (!quote) return <div className="text-center py-4 text-muted-foreground">Quote not found</div>;

  const statusConf = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;

  const handleEdit = () => {
    setEditData({
      customerName: quote.customerName || "",
      customerPhone: quote.customerPhone || "",
      customerEmail: quote.customerEmail || "",
      address: quote.address || "",
      status: quote.status || "draft",
      notes: quote.notes || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const displayData = isEditing ? editData : {
    customerName: quote.customerName,
    customerPhone: quote.customerPhone || "",
    customerEmail: quote.customerEmail || "",
    address: quote.address || "",
    status: quote.status,
    notes: quote.notes || "",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className={statusConf.color}>{statusConf.label}</Badge>
          {quote.total && <span className="font-bold text-lg">${Number(quote.total).toFixed(2)}</span>}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" /> {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleEdit} data-testid="button-edit-quote">
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <EditableField label="Customer" value={displayData.customerName} field="customerName" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Phone" value={displayData.customerPhone} field="customerPhone" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Email" value={displayData.customerEmail} field="customerEmail" isEditing={isEditing} onChange={handleChange} />
        <EditableField
          label="Status"
          value={isEditing ? displayData.status : statusConf.label}
          field="status"
          isEditing={isEditing}
          onChange={handleChange}
          type="select"
          options={Object.entries(quoteStatusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <div className="sm:col-span-2">
          <EditableField label="Address" value={displayData.address} field="address" isEditing={isEditing} onChange={handleChange} />
        </div>
        <div className="sm:col-span-2">
          <EditableField label="Notes" value={displayData.notes} field="notes" isEditing={isEditing} onChange={handleChange} type="textarea" />
        </div>
      </div>

      {!isEditing && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {quote.subtotal && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="text-sm font-medium">${Number(quote.subtotal).toFixed(2)}</p>
            </div>
          )}
          {quote.taxAmount && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tax</p>
              <p className="text-sm font-medium">${Number(quote.taxAmount).toFixed(2)}</p>
            </div>
          )}
          {quote.createdAt && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-xs">{format(new Date(quote.createdAt), "MMM d, yyyy")}</p>
            </div>
          )}
          {quote.sentAt && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="text-xs">{format(new Date(quote.sentAt), "MMM d, yyyy")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerDetailsTab({ customerId, canEdit }: { customerId: string; canEdit: boolean }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});

  const { data: customer, isLoading } = useQuery<any>({
    queryKey: ["/api/customers", customerId],
    enabled: !!customerId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("PATCH", `/api/customers/${customerId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs", "customer", customerId] });
      setIsEditing(false);
      toast({ title: "Customer Updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Update Failed", variant: "destructive" });
    },
  });

  const handleChange = useCallback((field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  if (!customer) return <div className="text-center py-4 text-muted-foreground">Customer not found</div>;

  const handleEdit = () => {
    setEditData({
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phonePrimary: customer.phonePrimary || "",
      phoneAlt: customer.phoneAlt || "",
      email: customer.email || "",
      preferredContactMethod: customer.preferredContactMethod || "call",
      notes: customer.notes || "",
      status: customer.status || "active",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const displayData = isEditing ? editData : {
    firstName: customer.firstName,
    lastName: customer.lastName,
    phonePrimary: customer.phonePrimary || "",
    phoneAlt: customer.phoneAlt || "",
    email: customer.email || "",
    preferredContactMethod: customer.preferredContactMethod || "call",
    notes: customer.notes || "",
    status: customer.status || "active",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Badge className={customer.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}>
          {customer.status || "active"}
        </Badge>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" /> {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleEdit} data-testid="button-edit-customer">
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <EditableField label="First Name" value={displayData.firstName} field="firstName" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Last Name" value={displayData.lastName} field="lastName" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Phone" value={displayData.phonePrimary} field="phonePrimary" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Alt Phone" value={displayData.phoneAlt} field="phoneAlt" isEditing={isEditing} onChange={handleChange} />
        <EditableField label="Email" value={displayData.email} field="email" isEditing={isEditing} onChange={handleChange} />
        <EditableField
          label="Contact Method"
          value={displayData.preferredContactMethod}
          field="preferredContactMethod"
          isEditing={isEditing}
          onChange={handleChange}
          type="select"
          options={[
            { value: "call", label: "Call" },
            { value: "text", label: "Text" },
            { value: "email", label: "Email" },
          ]}
        />
        <EditableField
          label="Status"
          value={displayData.status}
          field="status"
          isEditing={isEditing}
          onChange={handleChange}
          type="select"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "do_not_service", label: "Do Not Service" },
          ]}
        />
        <div className="sm:col-span-2">
          <EditableField label="Notes" value={displayData.notes} field="notes" isEditing={isEditing} onChange={handleChange} type="textarea" />
        </div>
      </div>
    </div>
  );
}

function JobQuotesTab({ jobId, canEdit }: { jobId: string; canEdit: boolean }) {
  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const jobQuotes = quotes.filter(q => q.jobId === jobId);

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Loading quotes...</div>;

  if (jobQuotes.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No quotes associated with this job</div>;
  }

  return (
    <div className="space-y-3">
      {jobQuotes.map(quote => {
        const statusConf = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;
        return (
          <Card key={quote.id} data-testid={`quote-card-${quote.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge className={statusConf.color}>{statusConf.label}</Badge>
                {quote.total && <span className="font-bold">${Number(quote.total).toFixed(2)}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer: </span>
                  {quote.customerName}
                </div>
                {quote.createdAt && (
                  <div>
                    <span className="text-muted-foreground">Created: </span>
                    {format(new Date(quote.createdAt), "MMM d, yyyy")}
                  </div>
                )}
              </div>
              {quote.notes && (
                <p className="text-sm text-muted-foreground mt-2">{quote.notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CustomerInfoTab({ jobId, customerId: directCustomerId, canEdit }: { jobId?: string | null; customerId?: string | null; canEdit: boolean }) {
  const { data: job } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  const effectiveCustomerId = directCustomerId || (job as any)?.customerId;

  if (!effectiveCustomerId) {
    if (job) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">No linked customer record. Showing job contact info:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium text-sm">{job.customerName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium text-sm">{job.customerPhone}</p>
            </div>
            {job.customerEmail && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{job.customerEmail}</p>
              </div>
            )}
            <div className="space-y-1 sm:col-span-2">
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium text-sm">{job.address}{job.city ? `, ${job.city}` : ""}</p>
            </div>
          </div>
        </div>
      );
    }
    return <div className="text-center py-8 text-muted-foreground">No customer record linked</div>;
  }

  return <CustomerDetailsTab customerId={effectiveCustomerId} canEdit={canEdit} />;
}

function AuditTrailTab({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?entityType=${entityType}&entityId=${entityId}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    enabled: !!entityId,
  });

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Loading audit trail...</div>;

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No audit history yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {logs.map(log => (
          <Card key={log.id} data-testid={`audit-entry-${log.id}`}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    log.action === "create" ? "bg-green-500" :
                    log.action === "delete" ? "bg-red-500" :
                    log.action === "status_change" ? "bg-amber-500" : "bg-blue-500"
                  }`} />
                  <span className="text-sm font-medium truncate">{log.summary || `${log.action} ${log.entityType}`}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <User className="w-3 h-3" />
                <span>{log.userName || "System"}</span>
                {log.userRole && <Badge variant="outline" className="text-[10px] py-0">{log.userRole}</Badge>}
              </div>
              {log.changedFields && typeof log.changedFields === "object" && Object.keys(log.changedFields as Record<string, unknown>).length > 0 && (
                <div className="space-y-1 mt-2 pl-4 border-l-2 border-muted">
                  {Object.entries(log.changedFields as Record<string, { old: unknown; new: unknown }>).map(([field, change]) => (
                    <div key={field} className="text-xs">
                      <span className="font-medium text-muted-foreground">{field}:</span>{" "}
                      <span className="text-red-400 line-through">{String(change.old ?? "empty")}</span>
                      {" → "}
                      <span className="text-green-400">{String(change.new ?? "empty")}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

function JobTimelineTab({ jobId }: { jobId: string }) {
  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Loading timeline...</div>;
  if (!job) return <div className="text-center py-4 text-muted-foreground">Job not found</div>;

  return <JobTimeline job={job} />;
}

function JobChatTab({ jobId, userId }: { jobId: string; userId?: string }) {
  const { data: job } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  return <JobChat jobId={jobId} jobCustomerName={job?.customerName || "Customer"} userId={userId} />;
}

function EstimateViewTab({ jobId }: { jobId: string }) {
  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  if (!job) return <div className="text-center py-4 text-muted-foreground">Job not found</div>;

  if (!job.estimateSubmittedAt) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto opacity-50" />
          <p>No estimate submitted yet</p>
          <p className="text-sm">The technician has not submitted an on-site estimate for this job.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 text-green-400 mb-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">Estimate Received</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
          <div>
            <p className="text-sm text-muted-foreground">Estimated Amount</p>
            <p className="text-xl font-bold" data-testid="text-estimate-amount">
              ${job.estimateAmount || `${job.estimateRangeLow} - ${job.estimateRangeHigh}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="font-medium" data-testid="text-estimate-date">
              {format(new Date(job.estimateSubmittedAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Assessment Notes</p>
            <p className="font-medium whitespace-pre-wrap" data-testid="text-estimate-notes">{job.estimateNotes}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PermitInspectionTab({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  const [permitStatus, setPermitStatus] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [permitJurisdiction, setPermitJurisdiction] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [inspectionResult, setInspectionResult] = useState("");

  const permitMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("PATCH", `/api/jobs/${jobId}/permit`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Permit Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update permit.", variant: "destructive" });
    },
  });

  const inspectionMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("PATCH", `/api/jobs/${jobId}/inspection`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Inspection Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update inspection.", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  if (!job) return <div className="text-center py-4 text-muted-foreground">Job not found</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Permit Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.permitRequired && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                <Badge className={
                  job.permitStatus === "approved" ? "bg-green-500/20 text-green-400" :
                  job.permitStatus === "submitted" ? "bg-blue-500/20 text-blue-400" :
                  "bg-muted text-muted-foreground"
                } data-testid="badge-permit-status">
                  {job.permitStatus || "not_required"}
                </Badge>
              </div>
              {job.permitNumber && <p className="text-sm"><span className="text-muted-foreground">Permit #:</span> {job.permitNumber}</p>}
              {job.permitJurisdiction && <p className="text-sm"><span className="text-muted-foreground">Jurisdiction:</span> {job.permitJurisdiction}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Permit Status</Label>
              <Select value={permitStatus || job.permitStatus || ""} onValueChange={setPermitStatus}>
                <SelectTrigger data-testid="select-permit-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_required">Not Required</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Permit Number</Label>
              <Input
                placeholder="Enter permit #"
                defaultValue={job.permitNumber || ""}
                onChange={(e) => setPermitNumber(e.target.value)}
                data-testid="input-permit-number"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Jurisdiction</Label>
              <Input
                placeholder="e.g. City of Chicago"
                defaultValue={job.permitJurisdiction || ""}
                onChange={(e) => setPermitJurisdiction(e.target.value)}
                data-testid="input-permit-jurisdiction"
              />
            </div>
          </div>
          <Button
            onClick={() => permitMutation.mutate({
              permitRequired: true,
              permitStatus: permitStatus || job.permitStatus || "draft",
              permitNumber: permitNumber || job.permitNumber,
              permitJurisdiction: permitJurisdiction || job.permitJurisdiction,
            })}
            disabled={permitMutation.isPending}
            data-testid="button-save-permit"
          >
            <Save className="w-4 h-4 mr-2" />
            {permitMutation.isPending ? "Saving..." : "Save Permit Info"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Inspection Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.inspectionRequired && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Scheduled:</span>
                <span className="text-sm font-medium" data-testid="text-inspection-date">
                  {job.inspectionScheduledAt ? format(new Date(job.inspectionScheduledAt), "MMM d, yyyy h:mm a") : "Not scheduled"}
                </span>
              </div>
              {job.inspectionType && <p className="text-sm"><span className="text-muted-foreground">Type:</span> {job.inspectionType}</p>}
              {job.inspectionResult && (
                <Badge className={
                  job.inspectionResult === "passed" ? "bg-green-500/20 text-green-400" :
                  job.inspectionResult === "failed" ? "bg-destructive/20 text-destructive" :
                  "bg-amber-500/20 text-amber-400"
                } data-testid="badge-inspection-result">
                  {job.inspectionResult}
                </Badge>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Inspection Type</Label>
              <Input
                placeholder="e.g. Plumbing, Sewer"
                defaultValue={job.inspectionType || ""}
                onChange={(e) => setInspectionType(e.target.value)}
                data-testid="input-inspection-type"
              />
            </div>
            <div className="space-y-1">
              <Label>Scheduled Date/Time</Label>
              <Input
                type="datetime-local"
                defaultValue={job.inspectionScheduledAt ? format(new Date(job.inspectionScheduledAt), "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => setInspectionDate(e.target.value)}
                data-testid="input-inspection-date"
              />
            </div>
            <div className="space-y-1">
              <Label>Result</Label>
              <Select value={inspectionResult || job.inspectionResult || ""} onValueChange={setInspectionResult}>
                <SelectTrigger data-testid="select-inspection-result"><SelectValue placeholder="Pending" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                placeholder="Inspector notes..."
                defaultValue={job.inspectionNotes || ""}
                onChange={(e) => setInspectionNotes(e.target.value)}
                data-testid="input-inspection-notes"
              />
            </div>
          </div>
          <Button
            onClick={() => inspectionMutation.mutate({
              inspectionRequired: true,
              inspectionType: inspectionType || job.inspectionType,
              inspectionScheduledAt: inspectionDate || (job.inspectionScheduledAt ? new Date(job.inspectionScheduledAt).toISOString() : undefined),
              inspectionNotes: inspectionNotes || job.inspectionNotes,
              inspectionResult: inspectionResult || job.inspectionResult,
            })}
            disabled={inspectionMutation.isPending}
            data-testid="button-save-inspection"
          >
            <Save className="w-4 h-4 mr-2" />
            {inspectionMutation.isPending ? "Saving..." : "Save Inspection Info"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}