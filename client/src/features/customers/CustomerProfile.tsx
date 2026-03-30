import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Phone, Mail, MapPin, Receipt, Briefcase, Users, MessageSquare, Plus,
  PhoneIncoming, PhoneOutgoing, PhoneCall, Send, Image, Video, Clock, CalendarDays,
  FileText, Shield, AlertCircle, ChevronDown, ChevronUp, Wrench, DollarSign, History
} from "lucide-react";
import { format } from "date-fns";
import type { Customer, CustomerAddress, Job, Quote, Lead, Call, ContactAttempt, AuditLog, JobMedia } from "@shared/schema";

interface CustomerWithDetails extends Customer {
  addresses: CustomerAddress[];
  paymentProfiles: any[];
  jobCount?: number;
  quoteCount?: number;
  leadCount?: number;
}

interface ChatThreadWithMessages {
  id: string;
  subject: string | null;
  status: string;
  createdAt: string;
  lastMessageAt: string | null;
  messages: Array<{
    id: string;
    body: string;
    senderType: string;
    senderDisplayName: string | null;
    createdAt: string;
  }>;
}

interface MessagesResponse {
  chatThreads: ChatThreadWithMessages[];
  contactAttempts: ContactAttempt[];
}

interface MediaWithJob extends JobMedia {
  job: { id: string; customerName: string; serviceType: string; address: string };
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "MMM d, yyyy h:mm a");
  } catch {
    return "-";
  }
}

function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "MMM d, yyyy");
  } catch {
    return "-";
  }
}

function getJobStatusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    pending: { variant: "outline" },
    assigned: { variant: "secondary" },
    confirmed: { variant: "default", className: "bg-blue-600" },
    en_route: { variant: "default", className: "bg-indigo-600" },
    on_site: { variant: "default", className: "bg-purple-600" },
    in_progress: { variant: "default", className: "bg-amber-600" },
    completed: { variant: "default", className: "bg-green-600" },
    cancelled: { variant: "destructive" },
  };
  const config = map[status] || { variant: "outline" as const };
  return <Badge variant={config.variant} className={config.className}>{status.replace(/_/g, " ")}</Badge>;
}

function getQuoteStatusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    draft: { variant: "outline" },
    sent: { variant: "default", className: "bg-blue-600" },
    viewed: { variant: "default", className: "bg-indigo-600" },
    accepted: { variant: "default", className: "bg-green-600" },
    declined: { variant: "destructive" },
    expired: { variant: "secondary" },
  };
  const config = map[status] || { variant: "outline" as const };
  return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
}

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const customerQuery = useQuery<CustomerWithDetails>({
    queryKey: ["/api/customers", id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error("Failed to load customer");
      return res.json();
    },
    enabled: !!id,
  });

  const jobsQuery = useQuery<Job[]>({
    queryKey: ["/api/customers", id, "jobs"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/jobs`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const quotesQuery = useQuery<Quote[]>({
    queryKey: ["/api/customers", id, "quotes"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/quotes`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const leadsQuery = useQuery<Lead[]>({
    queryKey: ["/api/customers", id, "leads"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/leads`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const callsQuery = useQuery<Call[]>({
    queryKey: ["/api/customers", id, "calls"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/calls`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const messagesQuery = useQuery<MessagesResponse>({
    queryKey: ["/api/customers", id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/messages`);
      if (!res.ok) return { chatThreads: [], contactAttempts: [] };
      return res.json();
    },
    enabled: !!id,
  });

  const mediaQuery = useQuery<MediaWithJob[]>({
    queryKey: ["/api/customers", id, "media"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/media`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const auditQuery = useQuery<AuditLog[]>({
    queryKey: ["/api/customers", id, "audit-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/audit-logs`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/customers/${id}/chat-thread`);
    },
    onSuccess: (data: any) => {
      toast({ title: data.existing ? "Opened existing chat thread" : "Chat thread created" });
    },
    onError: () => {
      toast({ title: "Failed to create chat thread", variant: "destructive" });
    },
  });

  const customer = customerQuery.data;
  const primaryAddress = customer?.addresses?.find((a) => a.isPrimary) || customer?.addresses?.[0];

  const toggleJob = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case "do_not_service":
        return <Badge variant="destructive">Do Not Service</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSendSms = () => {
    toast({ title: "SMS queued", description: `Message to ${customer?.phonePrimary || "customer"}` });
    setSmsMessage("");
    setSmsDialogOpen(false);
  };

  const handleSendEmail = () => {
    toast({ title: "Email queued", description: `Email to ${customer?.email || "customer"}` });
    setEmailSubject("");
    setEmailBody("");
    setEmailDialogOpen(false);
  };

  const parseLineItems = (lineItems: any) => {
    if (!lineItems) return [];
    if (Array.isArray(lineItems)) return lineItems;
    if (typeof lineItems === "string") {
      try {
        const parsed = JSON.parse(lineItems);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  if (customerQuery.isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading customer...</div>;
  }

  if (!customer) {
    return <div className="p-6 text-center text-destructive">Customer not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/customers">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-customer-name">
            {customer.firstName} {customer.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {getStatusBadge(customer.status)}
            {customer.customerNumber && (
              <Badge variant="outline">#{customer.customerNumber}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setSmsDialogOpen(true)} disabled={!customer.phonePrimary && !customer.phoneAlt} data-testid="button-send-sms">
            <Send className="w-4 h-4 mr-2" />
            SMS
          </Button>
          <Button variant="outline" onClick={() => setEmailDialogOpen(true)} disabled={!customer.email} data-testid="button-send-email">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" onClick={() => createChatMutation.mutate()} disabled={createChatMutation.isPending} data-testid="button-start-chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Link href={`/quote?customerId=${id}`}>
            <Button variant="outline" data-testid="button-create-quote">
              <Receipt className="w-4 h-4 mr-2" />
              Create Quote
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="card-contact-info">
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.phonePrimary && (
              <div className="flex items-center gap-2 flex-wrap">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phonePrimary}</span>
                {customer.preferredContactMethod === "call" && (
                  <Badge variant="secondary" className="text-xs">Preferred</Badge>
                )}
              </div>
            )}
            {customer.phoneAlt && (
              <div className="flex items-center gap-2 flex-wrap">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phoneAlt}</span>
                <Badge variant="outline" className="text-xs">Alt</Badge>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 flex-wrap">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
                {customer.preferredContactMethod === "email" && (
                  <Badge variant="secondary" className="text-xs">Preferred</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-address">
          <CardHeader>
            <CardTitle className="text-lg">Primary Address</CardTitle>
          </CardHeader>
          <CardContent>
            {primaryAddress ? (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div>{primaryAddress.street1}</div>
                  {primaryAddress.street2 && <div>{primaryAddress.street2}</div>}
                  <div>{primaryAddress.city}, {primaryAddress.state} {primaryAddress.zip}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No address on file</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-summary">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Jobs</span>
              <Badge variant="secondary">{customer.jobCount || 0}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Quotes</span>
              <Badge variant="secondary">{customer.quoteCount || 0}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Leads</span>
              <Badge variant="secondary">{customer.leadCount || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="jobs" data-testid="tab-jobs">
            <Briefcase className="w-4 h-4 mr-2" />
            Jobs ({jobsQuery.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <DollarSign className="w-4 h-4 mr-2" />
            Quotes ({quotesQuery.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads">
            <Users className="w-4 h-4 mr-2" />
            Leads ({leadsQuery.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="addresses" data-testid="tab-addresses">
            <MapPin className="w-4 h-4 mr-2" />
            Addresses ({customer.addresses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="calls" data-testid="tab-calls">
            <PhoneCall className="w-4 h-4 mr-2" />
            Calls ({callsQuery.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="media" data-testid="tab-media">
            <Image className="w-4 h-4 mr-2" />
            Media ({mediaQuery.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <Shield className="w-4 h-4 mr-2" />
            Audit ({auditQuery.data?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          {jobsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading jobs...</div>
          ) : (jobsQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No jobs for this customer</div>
          ) : (
            <div className="space-y-3">
              {(jobsQuery.data || []).map((job) => (
                <Collapsible key={job.id} open={expandedJobs.has(job.id)} onOpenChange={() => toggleJob(job.id)}>
                  <Card data-testid={`card-job-${job.id}`}>
                    <CollapsibleTrigger asChild>
                      <CardContent className="flex items-center justify-between gap-4 py-4 cursor-pointer">
                        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                          <Wrench className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium">{job.serviceType}</div>
                            <div className="text-sm text-muted-foreground">
                              {job.address}{job.city ? `, ${job.city}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getJobStatusBadge(job.status)}
                          {expandedJobs.has(job.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3 border-t border-border">
                        <div className="grid gap-3 sm:grid-cols-2 pt-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Created:</span>
                            <span className="text-sm">{formatShortDate(job.createdAt)}</span>
                          </div>
                          {job.scheduledDate && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Scheduled:</span>
                              <span className="text-sm">{formatShortDate(job.scheduledDate)}</span>
                            </div>
                          )}
                          {job.completedAt && (
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Completed:</span>
                              <span className="text-sm">{formatShortDate(job.completedAt)}</span>
                            </div>
                          )}
                          {job.assignedTechnicianId && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Tech:</span>
                              <span className="text-sm">{job.assignedTechnicianId}</span>
                            </div>
                          )}
                        </div>
                        {job.description && (
                          <div>
                            <span className="text-sm text-muted-foreground">Description:</span>
                            <p className="text-sm mt-1">{job.description}</p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          {quotesQuery.isLoading ? (
            <div className="text-muted-foreground">Loading quotes...</div>
          ) : (quotesQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No quotes for this customer</div>
          ) : (
            <div className="space-y-3">
              {(quotesQuery.data || []).map((quote) => {
                const lineItems = parseLineItems(quote.lineItems);
                return (
                  <Card key={quote.id} className="hover-elevate" data-testid={`card-quote-${quote.id}`}>
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-lg">${Number(quote.total || 0).toFixed(2)}</span>
                          {getQuoteStatusBadge(quote.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatShortDate(quote.createdAt)}
                        </div>
                      </div>
                      {lineItems.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}
                          {lineItems.length <= 3 && (
                            <span>: {lineItems.map((li: any) => li.description || li.name).join(", ")}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {quote.sentAt && (
                          <span>Sent: {formatShortDate(quote.sentAt)}</span>
                        )}
                        {quote.acceptedAt && (
                          <span>Accepted: {formatShortDate(quote.acceptedAt)}</span>
                        )}
                        {quote.declinedAt && (
                          <span>Declined: {formatShortDate(quote.declinedAt)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          {leadsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading leads...</div>
          ) : (leadsQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No leads for this customer</div>
          ) : (
            <div className="space-y-2">
              {(leadsQuery.data || []).map((lead) => (
                <Card key={lead.id} className="hover-elevate" data-testid={`card-lead-${lead.id}`}>
                  <CardContent className="flex items-center justify-between gap-4 py-3 flex-wrap">
                    <div>
                      <div className="font-medium">{lead.serviceType || "General Inquiry"}</div>
                      <div className="text-sm text-muted-foreground">{lead.source}</div>
                    </div>
                    <Badge variant="outline">{lead.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          {(customer.addresses || []).length === 0 ? (
            <div className="text-muted-foreground">No addresses on file</div>
          ) : (
            <div className="space-y-2">
              {(customer.addresses || []).map((addr) => (
                <Card key={addr.id} data-testid={`card-address-${addr.id}`}>
                  <CardContent className="flex items-center justify-between gap-4 py-3 flex-wrap">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div>{addr.street1}</div>
                        {addr.street2 && <div>{addr.street2}</div>}
                        <div>{addr.city}, {addr.state} {addr.zip}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {addr.label && <Badge variant="outline">{addr.label}</Badge>}
                      {addr.isPrimary && <Badge variant="secondary">Primary</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calls" className="mt-4">
          {callsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading calls...</div>
          ) : (callsQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No call history for this customer</div>
          ) : (
            <div className="space-y-3">
              {(callsQuery.data || []).map((call) => (
                <Card key={call.id} data-testid={`card-call-${call.id}`}>
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="w-4 h-4 text-green-500" />
                        ) : (
                          <PhoneOutgoing className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="font-medium">{call.callerName || call.callerPhone}</span>
                        {call.callerName && (
                          <span className="text-sm text-muted-foreground">{call.callerPhone}</span>
                        )}
                      </div>
                      <Badge variant="outline">{call.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(call.duration)}
                      </span>
                      {call.outcome && (
                        <Badge variant="secondary" className="text-xs">{call.outcome}</Badge>
                      )}
                      <span>{formatDate(call.createdAt)}</span>
                    </div>
                    {call.handledBy && (
                      <div className="text-sm text-muted-foreground">
                        Handled by: {call.handledBy}
                      </div>
                    )}
                    {call.notes && (
                      <div className="text-sm mt-1">{call.notes}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          {messagesQuery.isLoading ? (
            <div className="text-muted-foreground">Loading messages...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Chat Threads</h3>
                {(messagesQuery.data?.chatThreads || []).length === 0 ? (
                  <div className="text-muted-foreground">No chat threads</div>
                ) : (
                  <div className="space-y-2">
                    {(messagesQuery.data?.chatThreads || []).map((thread) => {
                      const lastMsg = thread.messages?.[0];
                      return (
                        <Card key={thread.id} className="hover-elevate" data-testid={`card-thread-${thread.id}`}>
                          <CardContent className="py-4 space-y-2">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{thread.subject || "Chat Thread"}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {thread.messages?.length || 0} messages
                                </Badge>
                                <Badge variant="outline">{thread.status}</Badge>
                              </div>
                            </div>
                            {lastMsg && (
                              <div className="text-sm text-muted-foreground truncate">
                                {lastMsg.senderDisplayName && (
                                  <span className="font-medium">{lastMsg.senderDisplayName}: </span>
                                )}
                                {lastMsg.body}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Outreach History</h3>
                {(messagesQuery.data?.contactAttempts || []).length === 0 ? (
                  <div className="text-muted-foreground">No outreach history</div>
                ) : (
                  <div className="space-y-2">
                    {(messagesQuery.data?.contactAttempts || []).map((attempt) => (
                      <Card key={attempt.id} data-testid={`card-attempt-${attempt.id}`}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3 flex-wrap">
                              {attempt.type === "sms" && <Send className="w-4 h-4 text-muted-foreground" />}
                              {attempt.type === "email" && <Mail className="w-4 h-4 text-muted-foreground" />}
                              {attempt.type === "call" && <PhoneCall className="w-4 h-4 text-muted-foreground" />}
                              {!["sms", "email", "call"].includes(attempt.type) && <FileText className="w-4 h-4 text-muted-foreground" />}
                              <Badge variant="outline" className="text-xs">{attempt.type}</Badge>
                              <Badge variant="secondary" className="text-xs">{attempt.direction}</Badge>
                              <Badge variant="outline" className="text-xs">{attempt.status}</Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(attempt.sentAt || attempt.createdAt)}
                            </span>
                          </div>
                          {attempt.content && (
                            <div className="text-sm text-muted-foreground mt-2 truncate">
                              {attempt.content}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          {mediaQuery.isLoading ? (
            <div className="text-muted-foreground">Loading media...</div>
          ) : (mediaQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No media for this customer</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(mediaQuery.data || []).map((media) => (
                <Card key={media.id} data-testid={`card-media-${media.id}`}>
                  <CardContent className="py-4 space-y-3">
                    <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
                      {media.mediaType?.startsWith("image") ? (
                        <img
                          src={media.objectPath}
                          alt={media.caption || media.fileName}
                          className="w-full h-full object-cover rounded-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.parentElement!.innerHTML = '<div class="flex flex-col items-center gap-2 text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs">Image unavailable</span></div>';
                          }}
                        />
                      ) : media.mediaType?.startsWith("video") ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Video className="w-8 h-8" />
                          <span className="text-xs">Video</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="w-8 h-8" />
                          <span className="text-xs">{media.mediaType || "File"}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium truncate">{media.fileName}</div>
                      {media.caption && (
                        <div className="text-xs text-muted-foreground mt-1">{media.caption}</div>
                      )}
                    </div>
                    {media.job && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <Wrench className="w-3 h-3" />
                        <span>{media.job.serviceType}</span>
                        <span>-</span>
                        <span>{media.job.address}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          {auditQuery.isLoading ? (
            <div className="text-muted-foreground">Loading audit logs...</div>
          ) : (auditQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No audit history</div>
          ) : (
            <div className="space-y-3">
              {(auditQuery.data || []).map((log) => {
                const changes = (log.changedFields && typeof log.changedFields === "object") ? log.changedFields as Record<string, { old: unknown; new: unknown }> : {};
                const changeKeys = Object.keys(changes);
                return (
                  <Card key={log.id} data-testid={`card-audit-${log.id}`}>
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <History className="w-4 h-4 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">{log.action}</Badge>
                          <Badge variant="secondary" className="text-xs">{log.entityType}</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      {log.summary && (
                        <div className="text-sm">{log.summary}</div>
                      )}
                      {log.userName && (
                        <div className="text-xs text-muted-foreground">
                          By: {log.userName}{log.userRole ? ` (${log.userRole})` : ""}
                        </div>
                      )}
                      {changeKeys.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {changeKeys.map((field) => (
                            <div key={field} className="text-xs bg-muted rounded-md p-2">
                              <span className="font-medium">{field}:</span>{" "}
                              <span className="text-destructive line-through">
                                {String(changes[field]?.old ?? "null")}
                              </span>{" "}
                              <span className="text-green-600 dark:text-green-400">
                                {String(changes[field]?.new ?? "null")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent data-testid="dialog-sms">
          <DialogHeader>
            <DialogTitle>Send SMS</DialogTitle>
            <DialogDescription>
              Send a text message to {customer.phonePrimary || "the customer"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Input value={customer.phonePrimary || ""} disabled data-testid="input-sms-to" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message..."
                data-testid="input-sms-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendSms} disabled={!smsMessage.trim()} data-testid="button-sms-send">
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent data-testid="dialog-email">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send an email to {customer.email || "the customer"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Input value={customer.email || ""} disabled data-testid="input-email-to" />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
                data-testid="input-email-subject"
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Type your email..."
                className="min-h-[120px]"
                data-testid="input-email-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={!emailSubject.trim() || !emailBody.trim()} data-testid="button-email-send">
              <Mail className="w-4 h-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}