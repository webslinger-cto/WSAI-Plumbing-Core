import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  FileText,
  Clock,
  Calendar,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Voicemail,
  User,
  MapPin,
  Mail,
  Wrench,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Call } from "@shared/schema";

const SERVICE_TYPES = [
  { value: "sewer_main", label: "Main Sewer Line" },
  { value: "drain_cleaning", label: "Drain Cleaning" },
  { value: "hydro_jetting", label: "Hydro Jetting" },
  { value: "camera_inspection", label: "Camera Inspection" },
  { value: "water_heater", label: "Water Heater" },
  { value: "plumbing", label: "General Plumbing" },
  { value: "emergency", label: "Emergency Service" },
  { value: "other", label: "Other" },
];

const CALL_OUTCOMES = [
  { value: "scheduled", label: "Scheduled", color: "bg-green-600" },
  { value: "quoted", label: "Quote Created", color: "bg-blue-600" },
  { value: "callback_requested", label: "Callback Requested", color: "bg-yellow-600" },
  { value: "not_interested", label: "Not Interested", color: "bg-gray-600" },
  { value: "wrong_number", label: "Wrong Number", color: "bg-red-600" },
  { value: "voicemail_left", label: "Voicemail Left", color: "bg-purple-600" },
];

const CALL_STATUSES = [
  { value: "answered", label: "Answered", icon: Phone },
  { value: "missed", label: "Missed", icon: PhoneMissed },
  { value: "voicemail", label: "Voicemail", icon: Voicemail },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
];

const PROVIDERS = [
  { value: "manual", label: "Manual Entry" },
  { value: "twilio", label: "Twilio" },
  { value: "signalwire", label: "SignalWire" },
  { value: "google_voice", label: "Google Voice" },
  { value: "zapier", label: "Zapier" },
];

export default function CallsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [showNewCallDialog, setShowNewCallDialog] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [newCall, setNewCall] = useState({
    callerName: "",
    callerPhone: "",
    callerEmail: "",
    callerAddress: "",
    serviceType: "",
    direction: "inbound" as "inbound" | "outbound",
    status: "answered",
    outcome: "",
    notes: "",
    priority: "normal",
    provider: "manual",
    scheduledCallback: "",
  });

  const { data: calls = [], isLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls"],
  });

  const createCallMutation = useMutation({
    mutationFn: async (callData: typeof newCall) => {
      const res = await apiRequest("POST", "/api/calls", {
        ...callData,
        scheduledCallback: callData.scheduledCallback ? new Date(callData.scheduledCallback) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      setShowNewCallDialog(false);
      setNewCall({
        callerName: "",
        callerPhone: "",
        callerEmail: "",
        callerAddress: "",
        serviceType: "",
        direction: "inbound",
        status: "answered",
        outcome: "",
        notes: "",
        priority: "normal",
        provider: "manual",
        scheduledCallback: "",
      });
      toast({ title: "Call logged successfully" });
    },
    onError: () => {
      toast({ title: "Failed to log call", variant: "destructive" });
    },
  });

  const updateCallMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Call> }) => {
      const res = await apiRequest("PATCH", `/api/calls/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      setSelectedCall(null);
      toast({ title: "Call updated" });
    },
  });

  const convertToQuoteMutation = useMutation({
    mutationFn: async (callId: string) => {
      const res = await apiRequest("POST", `/api/calls/${callId}/convert-to-quote`);
      return res.json();
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ 
        title: "Quote created", 
        description: `Quote #${quote.id.slice(0, 8)} has been created from this call.` 
      });
      setSelectedCall(null);
    },
    onError: () => {
      toast({ title: "Failed to create quote", variant: "destructive" });
    },
  });

  const filteredCalls = calls.filter((call) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !call.callerName?.toLowerCase().includes(query) &&
        !call.callerPhone?.toLowerCase().includes(query) &&
        !call.callerAddress?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (activeTab === "all") return true;
    if (activeTab === "inbound") return call.direction === "inbound";
    if (activeTab === "outbound") return call.direction === "outbound";
    if (activeTab === "missed") return call.status === "missed";
    if (activeTab === "callbacks") return call.scheduledCallback && new Date(call.scheduledCallback) > new Date();
    return true;
  });

  const getDirectionIcon = (direction: string, status: string) => {
    if (status === "missed") return <PhoneMissed className="w-4 h-4 text-red-500" />;
    if (status === "voicemail") return <Voicemail className="w-4 h-4 text-purple-500" />;
    if (direction === "inbound") return <PhoneIncoming className="w-4 h-4 text-green-500" />;
    return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;
    const config = CALL_OUTCOMES.find((o) => o.value === outcome);
    if (!config) return <Badge variant="outline">{outcome}</Badge>;
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority || priority === "normal") return null;
    const colors: Record<string, string> = {
      urgent: "bg-red-600 text-white",
      high: "bg-orange-600 text-white",
      low: "bg-gray-500 text-white",
    };
    return <Badge className={colors[priority] || ""}>{priority}</Badge>;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const callStats = {
    total: calls.length,
    today: calls.filter((c) => {
      const d = new Date(c.createdAt);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length,
    missed: calls.filter((c) => c.status === "missed").length,
    callbacks: calls.filter((c) => c.scheduledCallback && new Date(c.scheduledCallback) > new Date()).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="w-6 h-6" />
            Call Log
          </h1>
          <p className="text-sm text-muted-foreground">
            Log and manage incoming and outgoing calls
          </p>
        </div>
        <Button onClick={() => setShowNewCallDialog(true)} data-testid="button-new-call">
          <Plus className="w-4 h-4 mr-2" />
          Log Call
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Calls</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-calls">{callStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-today-calls">{callStats.today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <PhoneMissed className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Missed</span>
            </div>
            <p className="text-2xl font-bold text-red-500" data-testid="text-missed-calls">{callStats.missed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Callbacks</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500" data-testid="text-callbacks">{callStats.callbacks}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all-calls">All</TabsTrigger>
                <TabsTrigger value="inbound" data-testid="tab-inbound">Inbound</TabsTrigger>
                <TabsTrigger value="outbound" data-testid="tab-outbound">Outbound</TabsTrigger>
                <TabsTrigger value="missed" data-testid="tab-missed">Missed</TabsTrigger>
                <TabsTrigger value="callbacks" data-testid="tab-callbacks">Callbacks</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search-calls"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No calls found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCalls.map((call) => (
                    <TableRow 
                      key={call.id} 
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedCall(call)}
                      data-testid={`row-call-${call.id}`}
                    >
                      <TableCell>{getDirectionIcon(call.direction, call.status)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{call.callerName || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{call.callerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {call.serviceType && (
                          <Badge variant="outline">
                            {SERVICE_TYPES.find((s) => s.value === call.serviceType)?.label || call.serviceType}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{call.status}</Badge>
                          {getPriorityBadge(call.priority)}
                        </div>
                      </TableCell>
                      <TableCell>{getOutcomeBadge(call.outcome)}</TableCell>
                      <TableCell>{formatDuration(call.duration)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!call.quoteId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                convertToQuoteMutation.mutate(call.id);
                              }}
                              disabled={convertToQuoteMutation.isPending}
                              data-testid={`button-convert-quote-${call.id}`}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Quote
                            </Button>
                          )}
                          {call.quoteId && (
                            <Badge variant="outline" className="gap-1">
                              <FileText className="w-3 h-3" />
                              Quoted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Phone Integration Status
          </CardTitle>
          <CardDescription>
            Connect your phone system to automatically log calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium">Twilio</span>
              </div>
              <Badge variant="outline">Connected</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium">SignalWire</span>
              </div>
              <Badge variant="outline">Connected</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="font-medium">Google Voice</span>
              </div>
              <Badge variant="secondary">Via Zapier</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium">Zapier</span>
              </div>
              <Badge variant="outline">Ready</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Webhook URL: <code className="bg-muted px-2 py-1 rounded text-xs">/api/webhooks/calls/inbound</code>
          </p>
        </CardContent>
      </Card>

      <Dialog open={showNewCallDialog} onOpenChange={setShowNewCallDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log New Call</DialogTitle>
            <DialogDescription>Enter the details of the incoming or outgoing call</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select
                  value={newCall.direction}
                  onValueChange={(v) => setNewCall({ ...newCall, direction: v as "inbound" | "outbound" })}
                >
                  <SelectTrigger data-testid="select-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newCall.status}
                  onValueChange={(v) => setNewCall({ ...newCall, status: v })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="callerName">Caller Name</Label>
                <Input
                  id="callerName"
                  value={newCall.callerName}
                  onChange={(e) => setNewCall({ ...newCall, callerName: e.target.value })}
                  placeholder="John Smith"
                  data-testid="input-caller-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callerPhone">Phone Number *</Label>
                <Input
                  id="callerPhone"
                  value={newCall.callerPhone}
                  onChange={(e) => setNewCall({ ...newCall, callerPhone: e.target.value })}
                  placeholder="(708) 555-1234"
                  required
                  data-testid="input-caller-phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="callerEmail">Email</Label>
                <Input
                  id="callerEmail"
                  type="email"
                  value={newCall.callerEmail}
                  onChange={(e) => setNewCall({ ...newCall, callerEmail: e.target.value })}
                  placeholder="john@example.com"
                  data-testid="input-caller-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type</Label>
                <Select
                  value={newCall.serviceType}
                  onValueChange={(v) => setNewCall({ ...newCall, serviceType: v })}
                >
                  <SelectTrigger data-testid="select-service-type">
                    <SelectValue placeholder="Select service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="callerAddress">Address</Label>
              <Input
                id="callerAddress"
                value={newCall.callerAddress}
                onChange={(e) => setNewCall({ ...newCall, callerAddress: e.target.value })}
                placeholder="123 Main St, Chicago, IL"
                data-testid="input-caller-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="outcome">Outcome</Label>
                <Select
                  value={newCall.outcome}
                  onValueChange={(v) => setNewCall({ ...newCall, outcome: v })}
                >
                  <SelectTrigger data-testid="select-outcome">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_OUTCOMES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newCall.priority}
                  onValueChange={(v) => setNewCall({ ...newCall, priority: v })}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledCallback">Schedule Callback</Label>
              <Input
                id="scheduledCallback"
                type="datetime-local"
                value={newCall.scheduledCallback}
                onChange={(e) => setNewCall({ ...newCall, scheduledCallback: e.target.value })}
                data-testid="input-scheduled-callback"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newCall.notes}
                onChange={(e) => setNewCall({ ...newCall, notes: e.target.value })}
                placeholder="Enter call notes..."
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCallDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCallMutation.mutate(newCall)}
              disabled={!newCall.callerPhone || createCallMutation.isPending}
              data-testid="button-save-call"
            >
              Save Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCall && getDirectionIcon(selectedCall.direction, selectedCall.status)}
              Call Details
            </DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Caller</Label>
                  <p className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedCall.callerName || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {selectedCall.callerPhone}
                  </p>
                </div>
              </div>

              {selectedCall.callerEmail && (
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedCall.callerEmail}
                  </p>
                </div>
              )}

              {selectedCall.callerAddress && (
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedCall.callerAddress}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Direction</Label>
                  <Badge variant="outline" className="mt-1">
                    {selectedCall.direction}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="secondary" className="mt-1">
                    {selectedCall.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p className="font-medium">{formatDuration(selectedCall.duration)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Service Type</Label>
                  {selectedCall.serviceType ? (
                    <Badge variant="outline" className="mt-1">
                      {SERVICE_TYPES.find((s) => s.value === selectedCall.serviceType)?.label || selectedCall.serviceType}
                    </Badge>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Outcome</Label>
                  {selectedCall.outcome ? getOutcomeBadge(selectedCall.outcome) : <p className="text-muted-foreground">-</p>}
                </div>
              </div>

              {selectedCall.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm bg-muted p-2 rounded mt-1">{selectedCall.notes}</p>
                </div>
              )}

              {selectedCall.recordingUrl && (
                <div>
                  <Label className="text-muted-foreground">Recording</Label>
                  <a
                    href={selectedCall.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline mt-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Listen to Recording
                  </a>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Provider</Label>
                <Badge variant="outline" className="mt-1">
                  {PROVIDERS.find((p) => p.value === selectedCall.provider)?.label || selectedCall.provider || "Manual"}
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                Logged {format(new Date(selectedCall.createdAt), "PPp")}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedCall && !selectedCall.quoteId && (
              <Button
                onClick={() => convertToQuoteMutation.mutate(selectedCall.id)}
                disabled={convertToQuoteMutation.isPending}
                data-testid="button-convert-to-quote"
              >
                <FileText className="w-4 h-4 mr-2" />
                Convert to Quote
              </Button>
            )}
            {selectedCall?.quoteId && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Quote Created
              </Badge>
            )}
            <Button variant="outline" onClick={() => setSelectedCall(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
