import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  FileText,
  UserPlus,
  Phone,
  MapPin,
  User,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  History,
  Sparkles,
} from "lucide-react";
import type { CallRecording, Lead } from "@shared/schema";

interface CallRecorderProps {
  userId: string;
  userName: string;
  onLeadCreated?: (lead: Lead) => void;
}

type RecorderStep = "idle" | "recording" | "transcribing" | "analyzing" | "review" | "creating_lead" | "done";

const SERVICE_TYPES = [
  { value: "sewer_main", label: "Sewer Main" },
  { value: "drain_cleaning", label: "Drain Cleaning" },
  { value: "plumbing", label: "Plumbing" },
  { value: "water_heater", label: "Water Heater" },
  { value: "sump_pump", label: "Sump Pump" },
  { value: "ejector_pit", label: "Ejector Pit" },
  { value: "rodding", label: "Rodding" },
  { value: "camera_inspection", label: "Camera Inspection" },
  { value: "hydro_jetting", label: "Hydro Jetting" },
  { value: "excavation", label: "Excavation" },
  { value: "other", label: "Other" },
];

const PROPERTY_TYPES = [
  { value: "SFH", label: "Single Family Home" },
  { value: "Townhome", label: "Townhome" },
  { value: "2-3 Flat", label: "2-3 Flat" },
  { value: "Condo/Multi-Unit", label: "Condo/Multi-Unit" },
  { value: "Business/Commercial", label: "Business/Commercial" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function CallRecorder({ userId, userName, onLeadCreated }: CallRecorderProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<RecorderStep>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [editedAnalysis, setEditedAnalysis] = useState<any>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [createdLead, setCreatedLead] = useState<Lead | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastAudioBase64Ref = useRef<string | null>(null);

  const { data: recordings } = useQuery<CallRecording[]>({
    queryKey: ["/api/call-recordings"],
    enabled: showHistory,
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        toast({
          title: "Not Supported",
          description: "Audio recording is not supported in this browser. Please use Chrome, Firefox, or Edge.",
          variant: "destructive",
        });
        return;
      }

      const res = await apiRequest("POST", "/api/call-recordings", {
        recordedBy: userId,
        recordedByName: userName,
        status: "recording",
      });
      const rec = await res.json();
      setRecordingId(rec.id);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let recorderOptions: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        recorderOptions = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        recorderOptions = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        recorderOptions = { mimeType: "audio/mp4" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        recorderOptions = { mimeType: "audio/ogg" };
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      const actualMimeType = mediaRecorder.mimeType || recorderOptions.mimeType || "audio/webm";
      (mediaRecorder as any)._actualMimeType = actualMimeType;
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setStep("recording");
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      toast({
        title: "Recording Failed",
        description: err?.message || "Please allow microphone access to record calls.",
        variant: "destructive",
      });
      setStep("idle");
    }
  }, [userId, userName, toast]);

  const processAudio = useCallback(async (base64: string) => {
    try {
      setStep("transcribing");
      const transcribeRes = await apiRequest("POST", "/api/call-recordings/transcribe", {
        audio: base64,
        recordingId,
      });
      const { transcript: t } = await transcribeRes.json();
      setTranscript(t);

      if (recordingId) {
        await apiRequest("PATCH", `/api/call-recordings/${recordingId}`, {
          duration: recordingTime,
        });
      }

      setStep("analyzing");
      const analyzeRes = await apiRequest("POST", "/api/call-recordings/analyze", {
        transcript: t,
        recordingId,
      });
      const { analysis: a } = await analyzeRes.json();
      setAnalysis(a);
      setEditedAnalysis({ ...a });
      setStep("review");
    } catch (err: any) {
      console.error("Processing error:", err);
      toast({
        title: "Processing Error",
        description: "Failed to process recording. Use the Retry button to try again.",
        variant: "destructive",
      });
      setStep("idle");
    }
  }, [recordingId, recordingTime, toast]);

  const retryProcessing = useCallback(async () => {
    if (lastAudioBase64Ref.current) {
      await processAudio(lastAudioBase64Ref.current);
    } else if (transcript) {
      try {
        setStep("analyzing");
        const analyzeRes = await apiRequest("POST", "/api/call-recordings/analyze", {
          transcript,
          recordingId,
        });
        const { analysis: a } = await analyzeRes.json();
        setAnalysis(a);
        setEditedAnalysis({ ...a });
        setStep("review");
      } catch {
        toast({
          title: "Retry Failed",
          description: "Could not reprocess. Please record again.",
          variant: "destructive",
        });
        setStep("idle");
      }
    }
  }, [transcript, recordingId, processAudio, toast]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        setStep("transcribing");

        const actualMimeType = (mediaRecorderRef.current as any)?._actualMimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          lastAudioBase64Ref.current = base64;
          await processAudio(base64);
        };
        reader.readAsDataURL(audioBlob);
        resolve();
      };
      mediaRecorderRef.current!.stop();
    });
  }, [recordingId, recordingTime, toast]);

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/call-recordings/create-lead", {
        analysis: editedAnalysis,
        recordingId,
        recordedBy: userId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedLead(data.lead);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-recordings"] });
      toast({
        title: "Lead Created",
        description: `New lead created for ${data.lead.customerName}`,
      });
      if (onLeadCreated) onLeadCreated(data.lead);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create lead from recording.",
        variant: "destructive",
      });
    },
  });

  const resetRecorder = () => {
    setStep("idle");
    setTranscript("");
    setAnalysis(null);
    setEditedAnalysis(null);
    setRecordingId(null);
    setCreatedLead(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStepBadge = () => {
    switch (step) {
      case "idle":
        return <Badge variant="secondary" data-testid="badge-recorder-status">Ready</Badge>;
      case "recording":
        return <Badge variant="destructive" data-testid="badge-recorder-status">Recording</Badge>;
      case "transcribing":
        return <Badge variant="outline" data-testid="badge-recorder-status">Transcribing</Badge>;
      case "analyzing":
        return <Badge variant="outline" data-testid="badge-recorder-status">AI Analyzing</Badge>;
      case "review":
        return <Badge variant="default" data-testid="badge-recorder-status">Review Intake</Badge>;
      case "creating_lead":
        return <Badge variant="outline" data-testid="badge-recorder-status">Creating Lead</Badge>;
      case "done":
        return <Badge variant="default" data-testid="badge-recorder-status">Complete</Badge>;
    }
  };

  return (
    <Card data-testid="card-call-recorder">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Phone className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Call Recorder</CardTitle>
          {getStepBadge()}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowHistory(!showHistory)}
          data-testid="button-recording-history"
        >
          <History className="h-4 w-4 mr-1" />
          History
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "idle" && (
          <div className="flex flex-col items-center gap-3 py-4" data-testid="section-recorder-idle">
            <p className="text-sm text-muted-foreground text-center">
              Record a dispatcher call and AI will automatically extract customer details to create a new lead intake form.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={startRecording}
                className="gap-2"
                data-testid="button-start-recording"
              >
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
              {lastAudioBase64Ref.current && (
                <Button
                  variant="outline"
                  onClick={retryProcessing}
                  className="gap-2"
                  data-testid="button-retry-processing"
                >
                  <Loader2 className="h-4 w-4" />
                  Retry Last Recording
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "recording" && (
          <div className="flex flex-col items-center gap-4 py-4" data-testid="section-recording">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                <Mic className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="text-2xl font-mono font-semibold" data-testid="text-recording-time">
              {formatTime(recordingTime)}
            </div>
            <p className="text-sm text-muted-foreground">Recording in progress...</p>
            <Button
              variant="destructive"
              onClick={stopRecording}
              className="gap-2"
              data-testid="button-stop-recording"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
          </div>
        )}

        {(step === "transcribing" || step === "analyzing") && (
          <div className="flex flex-col items-center gap-3 py-6" data-testid="section-processing">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {step === "transcribing" ? "Transcribing audio..." : "AI is extracting customer details..."}
            </p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        )}

        {step === "review" && editedAnalysis && (
          <div className="space-y-4" data-testid="section-intake-review">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Call Transcript</Label>
              </div>
              <div className="bg-muted/50 rounded-md p-3 max-h-32 overflow-auto">
                <p className="text-xs whitespace-pre-wrap" data-testid="text-transcript">{transcript}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Customer Intake Form</span>
              <Badge variant="secondary">AI-Generated</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <User className="h-3 w-3" /> Customer Name
                </Label>
                <Input
                  value={editedAnalysis.customerName || ""}
                  onChange={(e) => setEditedAnalysis({ ...editedAnalysis, customerName: e.target.value })}
                  data-testid="input-customer-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <Input
                  value={editedAnalysis.customerPhone || ""}
                  onChange={(e) => setEditedAnalysis({ ...editedAnalysis, customerPhone: e.target.value })}
                  data-testid="input-customer-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  value={editedAnalysis.customerEmail || ""}
                  onChange={(e) => setEditedAnalysis({ ...editedAnalysis, customerEmail: e.target.value })}
                  data-testid="input-customer-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Address
                </Label>
                <Input
                  value={editedAnalysis.address || ""}
                  onChange={(e) => setEditedAnalysis({ ...editedAnalysis, address: e.target.value })}
                  data-testid="input-address"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input
                  value={editedAnalysis.city || "Chicago"}
                  onChange={(e) => setEditedAnalysis({ ...editedAnalysis, city: e.target.value })}
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ZIP Code</Label>
                <Input
                  value={editedAnalysis.zipCode || ""}
                  onChange={(e) => setEditedAnalysis({ ...editedAnalysis, zipCode: e.target.value })}
                  data-testid="input-zip-code"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Service Type
                </Label>
                <Select
                  value={editedAnalysis.serviceType || "other"}
                  onValueChange={(v) => setEditedAnalysis({ ...editedAnalysis, serviceType: v })}
                >
                  <SelectTrigger data-testid="select-service-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Priority
                </Label>
                <Select
                  value={editedAnalysis.priority || "normal"}
                  onValueChange={(v) => setEditedAnalysis({ ...editedAnalysis, priority: v })}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Property Type</Label>
                <Select
                  value={editedAnalysis.propertyType || ""}
                  onValueChange={(v) => setEditedAnalysis({ ...editedAnalysis, propertyType: v })}
                >
                  <SelectTrigger data-testid="select-property-type">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tenant Contact Name</Label>
                <Input
                  value={editedAnalysis.contactTenantName || ""}
                  onChange={(e) => setEditedAnalysis({ ...editedAnalysis, contactTenantName: e.target.value })}
                  data-testid="input-tenant-name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Problem Description</Label>
              <Textarea
                value={editedAnalysis.description || ""}
                onChange={(e) => setEditedAnalysis({ ...editedAnalysis, description: e.target.value })}
                className="text-sm"
                rows={3}
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Additional Notes</Label>
              <Textarea
                value={editedAnalysis.notes || ""}
                onChange={(e) => setEditedAnalysis({ ...editedAnalysis, notes: e.target.value })}
                className="text-sm"
                rows={2}
                data-testid="textarea-notes"
              />
            </div>

            {editedAnalysis.aiRecommendations && (
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">AI Recommendations</span>
                </div>
                <p className="text-xs text-muted-foreground" data-testid="text-ai-recommendations">
                  {editedAnalysis.aiRecommendations}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => createLeadMutation.mutate()}
                disabled={createLeadMutation.isPending}
                className="flex-1 gap-2"
                data-testid="button-create-lead"
              >
                {createLeadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Create Lead
              </Button>
              <Button
                variant="outline"
                onClick={resetRecorder}
                data-testid="button-discard"
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        {step === "done" && createdLead && (
          <div className="flex flex-col items-center gap-3 py-4" data-testid="section-done">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <div className="text-center">
              <p className="font-medium">Lead Created Successfully</p>
              <p className="text-sm text-muted-foreground mt-1">
                {createdLead.customerName} - {createdLead.serviceType}
              </p>
              <p className="text-xs text-muted-foreground">
                Lead ID: {createdLead.id}
              </p>
            </div>
            <Button
              onClick={resetRecorder}
              className="gap-2"
              data-testid="button-new-recording"
            >
              <Mic className="h-4 w-4" />
              New Recording
            </Button>
          </div>
        )}

        {showHistory && (
          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recording History
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-2">
                  {recordings && recordings.length > 0 ? (
                    recordings.map((rec) => (
                      <Card key={rec.id} className="hover-elevate" data-testid={`card-recording-${rec.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {rec.customerName || "Unknown Caller"}
                              </span>
                              {rec.customerPhone && (
                                <span className="text-xs text-muted-foreground">{rec.customerPhone}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                rec.status === "lead_created" ? "default" :
                                rec.status === "analyzed" ? "secondary" :
                                "outline"
                              }>
                                {rec.status === "lead_created" ? "Lead Created" :
                                 rec.status === "analyzed" ? "Analyzed" :
                                 rec.status === "transcribed" ? "Transcribed" :
                                 rec.status}
                              </Badge>
                              {rec.duration && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(rec.duration)}
                                </span>
                              )}
                            </div>
                          </div>
                          {rec.transcript && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {rec.transcript}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(rec.createdAt).toLocaleString()} by {rec.recordedByName || rec.recordedBy}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recordings yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
