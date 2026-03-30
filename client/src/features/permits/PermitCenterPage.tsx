import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  FileStack, Settings, AlertCircle, CheckCircle, Clock, Wand2,
  Download, Send, RefreshCw, Sparkles, Mail, ClipboardCheck,
  ExternalLink, Search, FileText, AlertTriangle, Loader2, Brain,
  Shield, DollarSign, Timer, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import type { Job } from "@shared/schema";

type PermitPacketItem = {
  packet: {
    id: string;
    jobId: string;
    jurisdictionId: string;
    permitTypeId: string;
    status: string;
    required: boolean;
    detectedReason: string | null;
    generatedAt: string | null;
    submittedAt: string | null;
    createdAt: string;
    errorMessage: string | null;
  };
  jurisdiction: { id: string; name: string; portalUrl: string | null; submissionMethod: string | null; submissionEmail: string | null };
  permitType: { id: string; code: string; name: string };
  documents: Array<{ id: string; docType: string; filename: string; url: string | null; downloadUrl?: string }>;
  job: Job;
};

type PermitStats = Record<string, number>;

type AIAnalysis = {
  summary: string;
  permits: Array<{
    permitType: string;
    confidence: string;
    reason: string;
    required: boolean;
    estimatedCost?: string;
    estimatedTimeline?: string;
  }>;
  jurisdiction: { name: string; city: string; state: string; county: string; confidence: string };
  scopeOfWork: string;
  notes: string[];
};

type AIDraft = {
  scopeOfWork: string;
  projectDescription: string;
  justification: string;
  estimatedDuration: string;
  specialConditions: string[];
};

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["ready_for_review", "ready_to_submit"].includes(status)) return "default";
  if (["submitted", "closed"].includes(status)) return "secondary";
  if (status === "error") return "destructive";
  return "outline";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "detected", label: "Detected" },
  { value: "ready_for_review", label: "Review" },
  { value: "ready_to_submit", label: "Ready" },
  { value: "submitted", label: "Submitted" },
  { value: "error", label: "Errors" },
];

export default function PermitCenterPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<PermitPacketItem | null>(null);
  const [submitMethod, setSubmitMethod] = useState<"email" | "assisted">("assisted");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [submissionEmail, setSubmissionEmail] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiDraft, setAiDraft] = useState<AIDraft | null>(null);
  const [expandedPackets, setExpandedPackets] = useState<Set<string>>(new Set());

  const settingsQuery = useQuery<{ permitCenterEnabled: boolean }>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return { permitCenterEnabled: false };
      return res.json();
    },
  });

  const statsQuery = useQuery<PermitStats>({
    queryKey: ["/api/permits/stats"],
    queryFn: async () => {
      const res = await fetch("/api/permits/stats", { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!settingsQuery.data?.permitCenterEnabled,
  });

  const packetsQuery = useQuery<PermitPacketItem[]>({
    queryKey: ["/api/permits/all", activeTab],
    queryFn: async () => {
      const url = activeTab === "all" ? "/api/permits/all" : `/api/permits/all?status=${activeTab}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!settingsQuery.data?.permitCenterEnabled,
  });

  const jobsQuery = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!settingsQuery.data?.permitCenterEnabled,
  });

  const generateMutation = useMutation({
    mutationFn: async ({ jobId, packetId }: { jobId: string; packetId: string }) =>
      apiRequest("POST", `/api/jobs/${jobId}/permits/${packetId}/generate`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/permits/all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      toast({ title: "PDF Generated", description: "Permit packet PDF is ready for review." });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err?.message || "Could not generate PDF.", variant: "destructive" });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async ({ jobId, packetId }: { jobId: string; packetId: string }) =>
      apiRequest("PATCH", `/api/jobs/${jobId}/permits/${packetId}/finalize`, { customerFields: {}, doNotStorePII: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/permits/all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      toast({ title: "Finalized", description: "Permit is ready to submit." });
    },
    onError: (err: any) => {
      toast({ title: "Finalize failed", description: err?.message || "Could not finalize.", variant: "destructive" });
    },
  });

  const detectMutation = useMutation({
    mutationFn: async (jobId: string) => apiRequest("POST", `/api/jobs/${jobId}/permits/detect`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/permits/all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      toast({ title: "Detection complete", description: "Permits have been detected for this job." });
    },
    onError: (err: any) => {
      toast({ title: "Detection failed", description: err?.message || "Could not detect permits.", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ jobId, packetId, method, email, confirmation }: { jobId: string; packetId: string; method: string; email?: string; confirmation?: string }) =>
      apiRequest("POST", `/api/jobs/${jobId}/permits/${packetId}/submit`, { method, destinationEmail: email, confirmationNumber: confirmation }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/permits/all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      toast({ title: "Submitted", description: "Permit application has been submitted." });
      setSubmitDialogOpen(false);
      setSelectedPacket(null);
      setConfirmationNumber("");
      setSubmissionEmail("");
    },
    onError: (err: any) => {
      toast({ title: "Submit failed", description: err?.message || "Could not submit.", variant: "destructive" });
    },
  });

  const aiAnalyzeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch("/api/permits/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error("AI analysis failed");
      return res.json() as Promise<AIAnalysis>;
    },
    onSuccess: (data) => {
      setAiAnalysis(data);
    },
    onError: () => {
      toast({ title: "AI Analysis failed", description: "Could not analyze job for permits.", variant: "destructive" });
    },
  });

  const aiDraftMutation = useMutation({
    mutationFn: async ({ jobId, permitType, jurisdictionName }: { jobId: string; permitType: string; jurisdictionName: string }) => {
      const res = await fetch("/api/permits/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId, permitType, jurisdictionName }),
      });
      if (!res.ok) throw new Error("AI draft failed");
      return res.json() as Promise<AIDraft>;
    },
    onSuccess: (data) => {
      setAiDraft(data);
    },
    onError: () => {
      toast({ title: "AI Draft failed", description: "Could not generate draft.", variant: "destructive" });
    },
  });

  const openSubmitDialog = (item: PermitPacketItem) => {
    setSelectedPacket(item);
    setSubmissionEmail(item.jurisdiction.submissionEmail || "");
    setSubmitMethod(item.jurisdiction.submissionMethod === "email" ? "email" : "assisted");
    setSubmitDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedPacket) return;
    submitMutation.mutate({
      jobId: selectedPacket.packet.jobId,
      packetId: selectedPacket.packet.id,
      method: submitMethod,
      email: submitMethod === "email" ? submissionEmail : undefined,
      confirmation: submitMethod === "assisted" ? confirmationNumber : undefined,
    });
  };

  const openAiDialog = (jobId: string) => {
    setAiJobId(jobId);
    setAiAnalysis(null);
    setAiDraft(null);
    setAiDialogOpen(true);
    aiAnalyzeMutation.mutate(jobId);
  };

  const toggleExpanded = (packetId: string) => {
    setExpandedPackets(prev => {
      const next = new Set(prev);
      if (next.has(packetId)) next.delete(packetId);
      else next.add(packetId);
      return next;
    });
  };

  const isEnabled = settingsQuery.data?.permitCenterEnabled;

  if (settingsQuery.isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground" data-testid="text-permit-loading">
        Loading permit center...
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Permit Center Disabled</h2>
            <p className="text-muted-foreground text-center max-w-md">
              The Permit Center module is currently disabled. Enable it in Settings to start detecting and managing permits for your jobs.
            </p>
            <Link href="/settings">
              <span className="text-primary hover:underline cursor-pointer" data-testid="link-enable-permits">
                Go to Settings
              </span>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = statsQuery.data || {};
  const packets = packetsQuery.data || [];
  const filteredPackets = searchTerm
    ? packets.filter(p =>
        p.job.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.job.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.permitType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.jurisdiction.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : packets;

  const activeJobs = (jobsQuery.data || []).filter(j => j.status !== "cancelled" && j.status !== "completed");

  const pendingCount = (stats.detected || 0) + (stats.needs_customer_info || 0) + (stats.ready_for_review || 0);
  const readyCount = stats.ready_to_submit || 0;
  const submittedCount = stats.submitted || 0;
  const errorCount = stats.error || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-permit-center-title">
            <FileStack className="w-6 h-6" />
            Permit Center
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered permit detection, generation, and submission
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/settings">
            <Badge variant="outline" className="cursor-pointer hover-elevate">
              <Settings className="w-3 h-3 mr-1" />
              Configure
            </Badge>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-permit-stats-pending">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-yellow-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-pending-count">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card data-testid="card-permit-stats-ready">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Ready to Submit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-ready-count">{readyCount}</div>
            <p className="text-xs text-muted-foreground">Ready for filing</p>
          </CardContent>
        </Card>

        <Card data-testid="card-permit-stats-submitted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <FileStack className="w-4 h-4 text-blue-500" />
              Submitted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-submitted-count">{submittedCount}</div>
            <p className="text-xs text-muted-foreground">Filed with jurisdictions</p>
          </CardContent>
        </Card>

        <Card data-testid="card-permit-stats-errors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-error-count">{errorCount}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList data-testid="tabs-permit-status">
            {STATUS_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} data-testid={`tab-${tab.value}`}>
                {tab.label}
                {tab.value !== "all" && stats[tab.value] ? (
                  <Badge variant="secondary" className="ml-1 text-xs">{stats[tab.value]}</Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search permits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
              data-testid="input-permit-search"
            />
          </div>
        </div>

        {STATUS_TABS.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {packetsQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading permit packets...</div>
            ) : filteredPackets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No permits match your search." : "No permit packets found."}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use AI Analyze on a job below to detect permit requirements.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredPackets.map((item) => {
                  const pdf = item.documents.find(d => d.docType === "application_pdf" && (d.url || d.downloadUrl));
                  const pdfUrl = pdf?.downloadUrl || pdf?.url;
                  const status = item.packet.status;
                  const canGenerate = !["submitted", "closed"].includes(status);
                  const canFinalize = ["needs_customer_info", "ready_for_review"].includes(status);
                  const canSubmit = status === "ready_to_submit";
                  const isSubmitted = status === "submitted";
                  const isExpanded = expandedPackets.has(item.packet.id);

                  return (
                    <Card key={item.packet.id} data-testid={`card-permit-packet-${item.packet.id}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{item.permitType.name}</span>
                              <Badge variant={statusBadgeVariant(status)} data-testid={`badge-status-${item.packet.id}`}>
                                {statusLabel(status)}
                              </Badge>
                              {item.packet.required && <Badge variant="destructive">required</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {item.job.customerName} - {item.job.address}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{item.jurisdiction.name}</span>
                              {item.jurisdiction.portalUrl && (
                                <a href={item.jurisdiction.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                                  <ExternalLink className="h-3 w-3" />Portal
                                </a>
                              )}
                              {item.packet.submittedAt && (
                                <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                  <CheckCircle className="h-3 w-3" />
                                  Submitted {new Date(item.packet.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                            {canGenerate && (
                              <Button
                                size="sm"
                                variant={pdf ? "outline" : "default"}
                                onClick={() => generateMutation.mutate({ jobId: item.packet.jobId, packetId: item.packet.id })}
                                disabled={generateMutation.isPending}
                                data-testid={`button-generate-${item.packet.id}`}
                              >
                                <Wand2 className="h-3 w-3 mr-1" />
                                {pdf ? "Regen" : "Generate"}
                              </Button>
                            )}
                            {canFinalize && pdf && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => finalizeMutation.mutate({ jobId: item.packet.jobId, packetId: item.packet.id })}
                                disabled={finalizeMutation.isPending}
                                data-testid={`button-finalize-${item.packet.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Finalize
                              </Button>
                            )}
                            {canSubmit && pdf && (
                              <Button
                                size="sm"
                                onClick={() => openSubmitDialog(item)}
                                data-testid={`button-submit-${item.packet.id}`}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Submit
                              </Button>
                            )}
                            {pdf && pdfUrl && (
                              <Button asChild size="sm" variant="outline">
                                <a href={pdfUrl} download={pdf.filename} target="_blank" rel="noreferrer" data-testid={`button-download-${item.packet.id}`}>
                                  <Download className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleExpanded(item.packet.id)}
                              data-testid={`button-expand-${item.packet.id}`}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            {item.packet.detectedReason && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Detection:</span> {item.packet.detectedReason}
                              </div>
                            )}
                            {item.packet.errorMessage && (
                              <div className="text-xs text-destructive">
                                <span className="font-medium">Error:</span> {item.packet.errorMessage}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Job:</span> {item.job.serviceType} - {item.job.status}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Created:</span> {new Date(item.packet.createdAt).toLocaleString()}
                            </div>
                            {item.documents.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Documents:</span> {item.documents.length} file(s)
                              </div>
                            )}
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAiDialog(item.packet.jobId)}
                                data-testid={`button-ai-analyze-${item.packet.id}`}
                              >
                                <Brain className="h-3 w-3 mr-1" />
                                AI Analysis
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Permit Detection
            </CardTitle>
            <CardDescription>
              Select a job to run AI-powered permit analysis. The AI will identify required permits, jurisdiction, and generate application content.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading jobs...</div>
          ) : activeJobs.length === 0 ? (
            <div className="text-muted-foreground">No active jobs found</div>
          ) : (
            <div className="space-y-2">
              {activeJobs.slice(0, 15).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border hover-elevate"
                  data-testid={`card-job-permit-${job.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{job.customerName}</div>
                    <div className="text-sm text-muted-foreground truncate">{job.address}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Badge variant="outline">{job.serviceType}</Badge>
                    <Badge variant="secondary">{job.status}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => detectMutation.mutate(job.id)}
                      disabled={detectMutation.isPending}
                      data-testid={`button-detect-${job.id}`}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Detect
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openAiDialog(job.id)}
                      data-testid={`button-ai-${job.id}`}
                    >
                      <Brain className="h-3 w-3 mr-1" />
                      AI Analyze
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Permit Application</DialogTitle>
            <DialogDescription>
              Choose how to submit the permit for {selectedPacket?.permitType.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={submitMethod === "assisted" ? "default" : "outline"}
                size="sm"
                onClick={() => setSubmitMethod("assisted")}
                data-testid="button-submit-method-assisted"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Assisted
              </Button>
              <Button
                variant={submitMethod === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setSubmitMethod("email")}
                data-testid="button-submit-method-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
            {submitMethod === "assisted" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Submit manually through the jurisdiction portal, then enter the confirmation number.</p>
                {selectedPacket?.jurisdiction.portalUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedPacket.jurisdiction.portalUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />Open Portal
                    </a>
                  </Button>
                )}
                <div className="space-y-2">
                  <Label htmlFor="confirmationNumber">Confirmation Number</Label>
                  <Input id="confirmationNumber" value={confirmationNumber} onChange={(e) => setConfirmationNumber(e.target.value)} placeholder="Enter confirmation number" data-testid="input-confirmation-number" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Send the permit application via email to the jurisdiction.</p>
                <div className="space-y-2">
                  <Label htmlFor="submissionEmail">Destination Email</Label>
                  <Input id="submissionEmail" type="email" value={submissionEmail} onChange={(e) => setSubmissionEmail(e.target.value)} placeholder="permits@city.gov" data-testid="input-submission-email" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || (submitMethod === "assisted" && !confirmationNumber) || (submitMethod === "email" && !submissionEmail)}
              data-testid="button-confirm-submit-permit"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Permit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Permit Analysis
            </DialogTitle>
            <DialogDescription>
              AI-powered analysis of permit requirements for this job.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-2 pr-4">
              {aiAnalyzeMutation.isPending ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing job for permit requirements...</p>
                </div>
              ) : aiAnalysis ? (
                <>
                  <div className="p-3 rounded-lg bg-muted">
                    <h4 className="font-medium text-sm mb-1">Summary</h4>
                    <p className="text-sm" data-testid="text-ai-summary">{aiAnalysis.summary}</p>
                  </div>

                  {aiAnalysis.jurisdiction && (
                    <div className="p-3 rounded-lg border">
                      <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Jurisdiction
                      </h4>
                      <div className="text-sm">
                        <span className="font-medium">{aiAnalysis.jurisdiction.name}</span>
                        <span className="text-muted-foreground ml-2">
                          ({aiAnalysis.jurisdiction.city}, {aiAnalysis.jurisdiction.state})
                        </span>
                        <Badge variant="outline" className="ml-2">{aiAnalysis.jurisdiction.confidence} confidence</Badge>
                      </div>
                    </div>
                  )}

                  {aiAnalysis.permits.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Recommended Permits</h4>
                      {aiAnalysis.permits.map((p, i) => (
                        <div key={i} className="p-3 rounded-lg border space-y-1" data-testid={`card-ai-permit-${i}`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm capitalize">{p.permitType.replace(/_/g, " ")} Permit</span>
                            <Badge variant={p.required ? "destructive" : "outline"}>
                              {p.required ? "Required" : "Recommended"}
                            </Badge>
                            <Badge variant="secondary">{p.confidence}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{p.reason}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {p.estimatedCost && (
                              <span className="flex items-center gap-0.5">
                                <DollarSign className="h-3 w-3" />{p.estimatedCost}
                              </span>
                            )}
                            {p.estimatedTimeline && (
                              <span className="flex items-center gap-0.5">
                                <Timer className="h-3 w-3" />{p.estimatedTimeline}
                              </span>
                            )}
                          </div>
                          {aiJobId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1"
                              onClick={() => aiDraftMutation.mutate({
                                jobId: aiJobId,
                                permitType: p.permitType,
                                jurisdictionName: aiAnalysis.jurisdiction?.name || "City of Chicago",
                              })}
                              disabled={aiDraftMutation.isPending}
                              data-testid={`button-ai-draft-${i}`}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Draft Application
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {aiAnalysis.scopeOfWork && (
                    <div className="p-3 rounded-lg border">
                      <h4 className="font-medium text-sm mb-1">Scope of Work</h4>
                      <p className="text-sm text-muted-foreground">{aiAnalysis.scopeOfWork}</p>
                    </div>
                  )}

                  {aiAnalysis.notes.length > 0 && (
                    <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        Important Notes
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {aiAnalysis.notes.map((note, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-muted-foreground mt-1">-</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiDraftMutation.isPending && (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Generating application draft...</span>
                    </div>
                  )}

                  {aiDraft && (
                    <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                      <h4 className="font-medium text-sm flex items-center gap-1">
                        <FileText className="h-3 w-3 text-primary" />
                        AI-Generated Application Draft
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-xs text-muted-foreground">Project Description:</span>
                          <p className="mt-0.5">{aiDraft.projectDescription}</p>
                        </div>
                        <div>
                          <span className="font-medium text-xs text-muted-foreground">Scope of Work:</span>
                          <p className="mt-0.5">{aiDraft.scopeOfWork}</p>
                        </div>
                        <div>
                          <span className="font-medium text-xs text-muted-foreground">Justification:</span>
                          <p className="mt-0.5">{aiDraft.justification}</p>
                        </div>
                        <div>
                          <span className="font-medium text-xs text-muted-foreground">Duration:</span>
                          <p className="mt-0.5">{aiDraft.estimatedDuration}</p>
                        </div>
                        {aiDraft.specialConditions.length > 0 && (
                          <div>
                            <span className="font-medium text-xs text-muted-foreground">Special Conditions:</span>
                            <ul className="mt-0.5 list-disc pl-4">
                              {aiDraft.specialConditions.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {aiJobId && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          detectMutation.mutate(aiJobId);
                          setAiDialogOpen(false);
                          toast({ title: "Permits being detected", description: "Rule-based detection is running with AI recommendations applied." });
                        }}
                        disabled={detectMutation.isPending}
                        data-testid="button-apply-ai-detect"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Detect & Create Permits
                      </Button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
