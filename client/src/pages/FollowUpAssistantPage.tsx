import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  MessageSquare,
  Phone,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  Send,
  Sparkles,
  Loader2,
  FileText,
  RefreshCw,
  ChevronRight,
  History,
  Target,
  Filter,
} from "lucide-react";

interface StaleQuote {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string | null;
  status: string;
  total: string | null;
  daysSinceCreated: number;
  daysSinceLastActivity: number;
  lastActivityType: string;
  lastActivityDate: string;
  urgency: "low" | "medium" | "high" | "critical";
  serviceType?: string;
}

interface UnconvertedLead {
  id: string;
  customerName: string;
  phone: string | null;
  customerEmail: string | null;
  address: string | null;
  status: string;
  source: string | null;
  serviceType: string | null;
  priority: string | null;
  description: string | null;
  daysSinceCreated: number;
  daysSinceLastUpdate: number;
  urgency: "low" | "medium" | "high" | "critical";
}

interface Metrics {
  openQuotes: number;
  unconvertedLeads: number;
  criticalQuotes: number;
  criticalLeads: number;
  totalQuoteValue: string;
  recentConversions: number;
  totalQuotes: number;
  conversionRate: string;
}

interface ContactAttempt {
  id: string;
  leadId: string | null;
  jobId: string | null;
  type: string;
  direction: string;
  status: string;
  subject: string | null;
  content: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  sentBy: string | null;
  sentAt: string | null;
  createdAt: string;
}

const urgencyConfig = {
  critical: { label: "Critical", variant: "destructive" as const },
  high: { label: "High", variant: "destructive" as const },
  medium: { label: "Medium", variant: "secondary" as const },
  low: { label: "Low", variant: "outline" as const },
};

export default function FollowUpAssistantPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("quotes");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<"quote" | "lead">("quote");
  const [followUpChannel, setFollowUpChannel] = useState<"sms" | "email">("sms");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [editedMessage, setEditedMessage] = useState("");
  const [editedSubject, setEditedSubject] = useState("");

  const { data: metrics, isLoading: metricsLoading } = useQuery<Metrics>({
    queryKey: ["/api/follow-up/metrics"],
  });

  const { data: staleQuotes = [], isLoading: quotesLoading } = useQuery<StaleQuote[]>({
    queryKey: ["/api/follow-up/stale-quotes"],
  });

  const { data: unconvertedLeads = [], isLoading: leadsLoading } = useQuery<UnconvertedLead[]>({
    queryKey: ["/api/follow-up/unconverted-leads"],
  });

  const historyLeadId = historyDialog && selectedItem ? (selectedItemType === "lead" ? selectedItem.id : selectedItem.leadId) : null;
  const { data: followUpHistory = [] } = useQuery<ContactAttempt[]>({
    queryKey: ["/api/follow-up/history", selectedItemType, selectedItem?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (historyLeadId) params.set("leadId", historyLeadId);
      const res = await fetch(`/api/follow-up/history?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: historyDialog && !!selectedItem?.id,
  });

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/follow-up/generate-message", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedMessage(data.message);
      setGeneratedSubject(data.subject || "");
      setEditedMessage(data.message);
      setEditedSubject(data.subject || "");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate message", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/follow-up/send", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Sent", description: "Follow-up message sent successfully" });
        setFollowUpDialog(false);
        queryClient.invalidateQueries({ queryKey: ["/api/follow-up/stale-quotes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/follow-up/unconverted-leads"] });
        queryClient.invalidateQueries({ queryKey: ["/api/follow-up/metrics"] });
      } else {
        toast({ title: "Failed", description: data.error || "Failed to send message", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send follow-up", variant: "destructive" });
    },
  });

  const openFollowUp = (item: any, type: "quote" | "lead") => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setGeneratedMessage("");
    setGeneratedSubject("");
    setEditedMessage("");
    setEditedSubject("");

    const hasPhone = type === "quote" ? item.customerPhone : item.phone;
    const hasEmail = type === "quote" ? item.customerEmail : item.customerEmail;
    setFollowUpChannel(hasPhone ? "sms" : hasEmail ? "email" : "sms");
    setFollowUpDialog(true);
  };

  const openHistory = (item: any, type: "quote" | "lead") => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setHistoryDialog(true);
  };

  const handleGenerate = () => {
    if (!selectedItem) return;
    generateMutation.mutate({
      type: selectedItemType,
      customerName: selectedItem.customerName,
      customerPhone: selectedItemType === "quote" ? selectedItem.customerPhone : selectedItem.phone,
      customerEmail: selectedItem.customerEmail,
      address: selectedItem.address,
      serviceType: selectedItem.serviceType,
      description: selectedItem.description,
      quoteTotal: selectedItem.total,
      status: selectedItem.status,
      daysSinceLastActivity: selectedItemType === "quote" ? selectedItem.daysSinceLastActivity : selectedItem.daysSinceLastUpdate,
      channel: followUpChannel,
    });
  };

  const handleSend = () => {
    if (!selectedItem || !editedMessage) return;
    const recipient = followUpChannel === "sms"
      ? (selectedItemType === "quote" ? selectedItem.customerPhone : selectedItem.phone)
      : selectedItem.customerEmail;
    if (!recipient) {
      toast({ title: "Error", description: `No ${followUpChannel === "sms" ? "phone number" : "email"} for this customer`, variant: "destructive" });
      return;
    }
    sendMutation.mutate({
      channel: followUpChannel,
      to: recipient,
      message: editedMessage,
      subject: editedSubject,
      leadId: selectedItemType === "lead" ? selectedItem.id : selectedItem.leadId || null,
      customerName: selectedItem.customerName,
    });
  };

  const filteredQuotes = urgencyFilter === "all" ? staleQuotes : staleQuotes.filter(q => q.urgency === urgencyFilter);
  const filteredLeads = urgencyFilter === "all" ? unconvertedLeads : unconvertedLeads.filter(l => l.urgency === urgencyFilter);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Follow-Up Assistant</h1>
          <p className="text-sm text-muted-foreground">AI-powered follow-up for open quotes and unconverted leads</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/follow-up/stale-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/follow-up/unconverted-leads"] });
            queryClient.invalidateQueries({ queryKey: ["/api/follow-up/metrics"] });
          }}
          data-testid="button-refresh"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Open Quotes</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-open-quotes">{metricsLoading ? "-" : metrics?.openQuotes ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Unconverted Leads</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-unconverted-leads">{metricsLoading ? "-" : metrics?.unconvertedLeads ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Critical Items</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-critical-items">{metricsLoading ? "-" : (metrics?.criticalQuotes ?? 0) + (metrics?.criticalLeads ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Quote Value at Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-quote-value">{metricsLoading ? "-" : `$${Number(metrics?.totalQuoteValue ?? 0).toLocaleString()}`}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Urgency:</span>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-32" data-testid="select-urgency-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-follow-up">
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <FileText className="w-4 h-4 mr-1" />
            Open Quotes ({filteredQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads">
            <Target className="w-4 h-4 mr-1" />
            Unconverted Leads ({filteredLeads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          {quotesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredQuotes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No open quotes found matching the selected filter.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="max-h-[calc(100vh-420px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Days Idle</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id} data-testid={`row-quote-${quote.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{quote.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {quote.customerPhone || quote.customerEmail || "No contact"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{quote.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {quote.total ? `$${Number(quote.total).toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>{quote.daysSinceLastActivity}d</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={urgencyConfig[quote.urgency].variant} className="text-xs">
                            {urgencyConfig[quote.urgency].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {quote.lastActivityType}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openFollowUp(quote, "quote")}
                              data-testid={`button-followup-quote-${quote.id}`}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              Follow Up
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openHistory(quote, "quote")}
                              data-testid={`button-history-quote-${quote.id}`}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leads">
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No unconverted leads found matching the selected filter.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="max-h-[calc(100vh-420px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Days Idle</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{lead.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {lead.phone || lead.customerEmail || "No contact"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{lead.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{lead.source || "-"}</TableCell>
                        <TableCell className="text-sm">{lead.serviceType || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.daysSinceLastUpdate}d</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={urgencyConfig[lead.urgency].variant} className="text-xs">
                            {urgencyConfig[lead.urgency].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openFollowUp(lead, "lead")}
                              data-testid={`button-followup-lead-${lead.id}`}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              Follow Up
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openHistory(lead, "lead")}
                              data-testid={`button-history-lead-${lead.id}`}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Follow-Up
            </DialogTitle>
            <DialogDescription>
              Generate and send a personalized follow-up to {selectedItem?.customerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedItem?.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedItemType === "quote" ? `Quote: $${Number(selectedItem?.total || 0).toLocaleString()}` : `Lead: ${selectedItem?.status}`}
                  {" | "}
                  {selectedItemType === "quote" ? `${selectedItem?.daysSinceLastActivity}d idle` : `${selectedItem?.daysSinceLastUpdate}d idle`}
                </p>
              </div>
              <Badge variant={urgencyConfig[(selectedItem?.urgency || "low") as keyof typeof urgencyConfig].variant} className="text-xs">
                {urgencyConfig[(selectedItem?.urgency || "low") as keyof typeof urgencyConfig].label}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Channel:</span>
              <Select value={followUpChannel} onValueChange={(v) => setFollowUpChannel(v as "sms" | "email")}>
                <SelectTrigger className="w-40" data-testid="select-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                data-testid="button-generate-message"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Generate
              </Button>
            </div>

            {followUpChannel === "email" && (
              <Input
                placeholder="Email subject line..."
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                data-testid="input-subject"
              />
            )}

            <Textarea
              placeholder={generateMutation.isPending ? "Generating message..." : "Click Generate to create an AI-powered follow-up message, or type your own..."}
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={followUpChannel === "email" ? 8 : 4}
              data-testid="textarea-message"
            />

            <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              <span>To:</span>
              <span className="font-medium">
                {followUpChannel === "sms"
                  ? (selectedItemType === "quote" ? selectedItem?.customerPhone : selectedItem?.phone) || "No phone"
                  : selectedItem?.customerEmail || "No email"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialog(false)} data-testid="button-cancel-followup">
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!editedMessage || sendMutation.isPending}
              data-testid="button-send-followup"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Send {followUpChannel === "sms" ? "SMS" : "Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Follow-Up History
            </DialogTitle>
            <DialogDescription>
              Contact history for {selectedItem?.customerName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {followUpHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No follow-up history found for this customer.
              </p>
            ) : (
              <div className="space-y-3">
                {followUpHistory.map((attempt) => (
                  <div key={attempt.id} className="p-3 rounded-md border space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {attempt.type === "sms" ? <MessageSquare className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                        <span className="text-sm font-medium capitalize">{attempt.type}</span>
                        <Badge variant={attempt.status === "sent" ? "secondary" : "destructive"} className="text-xs">
                          {attempt.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {attempt.sentAt ? new Date(attempt.sentAt).toLocaleString() : new Date(attempt.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {attempt.subject && <p className="text-xs font-medium">{attempt.subject}</p>}
                    <p className="text-xs text-muted-foreground line-clamp-2">{attempt.content}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent by: {attempt.sentBy || "unknown"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}