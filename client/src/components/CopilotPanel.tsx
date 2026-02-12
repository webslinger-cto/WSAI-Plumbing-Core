import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  X,
  Send,
  Sparkles,
  Check,
  XCircle,
  Loader2,
  AlertTriangle,
  Search,
  UserPlus,
  Calendar,
  ClipboardList,
  KeyRound,
  ShieldCheck,
  Mic,
  MicOff,
  AudioLines,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface ProposedAction {
  id: string;
  toolName: string;
  description: string;
  parameters: Record<string, any>;
  risk: "low" | "medium" | "high";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ProposedAction[];
  timestamp: Date;
}

interface PlanResponse {
  message: string;
  actions: ProposedAction[];
  context?: any;
}

interface ExecuteResponse {
  success: boolean;
  result?: any;
  error?: string;
  summary: string;
}

interface CopilotPanelProps {
  userId: string;
  role: string;
  isOpen: boolean;
  onClose: () => void;
}

const quickActions = [
  { label: "Show new leads", prompt: "Show me all new leads that haven't been contacted yet", icon: Search },
  { label: "Unassigned jobs", prompt: "List all pending jobs that don't have a technician assigned", icon: ClipboardList },
  { label: "Create a lead", prompt: "I need to create a new lead", icon: UserPlus },
  { label: "Today's schedule", prompt: "What jobs are scheduled for today?", icon: Calendar },
];

export default function CopilotPanel({ userId, role, isOpen, onClose }: CopilotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: licenseStatus, isLoading: licenseLoading } = useQuery<{ active: boolean; hasKey: boolean }>({
    queryKey: ["/api/agent/license"],
    queryFn: async () => {
      const res = await fetch("/api/agent/license", {
        headers: { "X-User-Id": userId },
      });
      if (!res.ok) throw new Error("Failed to check license");
      return res.json();
    },
    enabled: isOpen,
  });

  const activateMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch("/api/agent/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": userId },
        body: JSON.stringify({ licenseKey: key }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Activation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/license"] });
      setLicenseKeyInput("");
    },
  });

  useEffect(() => {
    if (isOpen && inputRef.current && licenseStatus?.active) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, licenseStatus?.active]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const planMutation = useMutation({
    mutationFn: async (message: string) => {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({ message, history }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get response");
      }
      return res.json() as Promise<PlanResponse>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          actions: data.actions.length > 0 ? data.actions : undefined,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (action: ProposedAction) => {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to execute action");
      }
      return res.json() as Promise<ExecuteResponse>;
    },
    onSuccess: (data, action) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.success
            ? `Done: ${data.summary}`
            : `Failed: ${data.error || data.summary}`,
          timestamp: new Date(),
        },
      ]);
      setExecutingActionId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Execution failed: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
      setExecutingActionId(null);
    },
  });

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Voice input is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.",
          timestamp: new Date(),
        },
      ]);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let recorderOptions: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        recorderOptions = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        recorderOptions = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        recorderOptions = { mimeType: "audio/mp4" };
      }
      const recorder = new MediaRecorder(stream, recorderOptions);
      const mimeType = recorder.mimeType || "audio/webm";
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingDuration(0);
        setIsRecording(false);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Recording was too short. Please hold the microphone button a bit longer and speak clearly.",
              timestamp: new Date(),
            },
          ]);
          return;
        }

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const res = await fetch("/api/call-recordings/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-User-Id": userId },
            body: JSON.stringify({ audio: base64 }),
          });

          if (!res.ok) throw new Error("Transcription failed");
          const data = await res.json();
          if (data.transcript && data.transcript.trim()) {
            handleSend(data.transcript.trim());
          }
        } catch (err) {
          console.error("Voice transcription error:", err);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Sorry, I couldn't understand the audio. Please try again or type your message.",
              timestamp: new Date(),
            },
          ]);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Microphone access was denied. Please allow microphone access in your browser to use voice input.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: msg,
        timestamp: new Date(),
      },
    ]);
    setInput("");
    planMutation.mutate(msg);
  };

  const handleApprove = (action: ProposedAction) => {
    setExecutingActionId(action.id);
    executeMutation.mutate(action);
  };

  const handleReject = (action: ProposedAction) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Cancelled: ${action.description}`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const riskColor = (risk: string) => {
    if (risk === "high") return "text-destructive";
    if (risk === "medium") return "text-yellow-500";
    return "text-green-500";
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col bg-background border rounded-md shadow-lg"
      style={{ width: "420px", height: "600px", maxHeight: "80vh" }}
      data-testid="copilot-panel"
    >
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">AI Copilot</span>
          <Badge variant="secondary" className="text-[10px]">Beta</Badge>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-copilot">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {licenseLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!licenseLoading && !licenseStatus?.active && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4" data-testid="copilot-license-gate">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-sm">License Required</h3>
            <p className="text-xs text-muted-foreground">
              The AI Copilot requires a valid software license from WebSlingerAI to activate.
            </p>
          </div>
          {role === "admin" ? (
            <div className="w-full space-y-2">
              <Input
                placeholder="Enter license key (WSA-...)"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                disabled={activateMutation.isPending}
                data-testid="input-license-key"
              />
              {activateMutation.isError && (
                <p className="text-xs text-destructive" data-testid="text-license-error">
                  {(activateMutation.error as Error).message}
                </p>
              )}
              <Button
                className="w-full gap-2"
                onClick={() => activateMutation.mutate(licenseKeyInput)}
                disabled={!licenseKeyInput.trim() || activateMutation.isPending}
                data-testid="button-activate-license"
              >
                {activateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Activate License
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Please ask your administrator to activate the AI Copilot license in Settings.
            </p>
          )}
        </div>
      )}

      {!licenseLoading && licenseStatus?.active && (<>
      <div className="flex-1 overflow-hidden" ref={scrollRef}>
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3" data-testid="copilot-welcome">
                <p className="text-sm text-muted-foreground">
                  I can help you manage leads, jobs, technicians, and more. Ask me anything or try a quick action below.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((qa, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 text-xs h-auto py-2 px-3"
                      onClick={() => handleSend(qa.prompt)}
                      disabled={planMutation.isPending}
                      data-testid={`button-quick-action-${i}`}
                    >
                      <qa.icon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{qa.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-md px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                  data-testid={`copilot-message-${msg.role}`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs font-medium opacity-80">Proposed actions:</p>
                      {msg.actions.map((action) => (
                        <Card key={action.id} className="p-2 space-y-1" data-testid={`action-card-${action.id}`}>
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-medium">{action.description}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <AlertTriangle className={`w-3 h-3 ${riskColor(action.risk)}`} />
                              <span className={`text-[10px] ${riskColor(action.risk)}`}>{action.risk}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {action.toolName}({Object.keys(action.parameters).join(", ")})
                          </p>
                          <div className="flex gap-1 pt-1">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-6 text-xs gap-1 px-2"
                              onClick={() => handleApprove(action)}
                              disabled={executingActionId === action.id || executeMutation.isPending}
                              data-testid={`button-approve-action-${action.id}`}
                            >
                              {executingActionId === action.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs gap-1 px-2"
                              onClick={() => handleReject(action)}
                              disabled={executeMutation.isPending}
                              data-testid={`button-reject-action-${action.id}`}
                            >
                              <XCircle className="w-3 h-3" />
                              Skip
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {planMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-md px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-3 border-t">
        {isRecording && (
          <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-medium text-destructive">Recording</span>
              <span className="text-xs text-muted-foreground font-mono">{formatDuration(recordingDuration)}</span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              data-testid="button-stop-voice"
            >
              <MicOff className="w-3 h-3 mr-1" />
              Stop
            </Button>
          </div>
        )}
        {isTranscribing && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/20">
            <AudioLines className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-xs text-primary">Transcribing your voice...</span>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : "Ask me anything..."}
            rows={1}
            className="flex-1 resize-none bg-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={planMutation.isPending || isRecording || isTranscribing}
            data-testid="input-copilot-message"
          />
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "ghost"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={planMutation.isPending || isTranscribing}
            data-testid="button-voice-copilot"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || planMutation.isPending || isRecording || isTranscribing}
            data-testid="button-send-copilot"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      </>)}
    </div>
  );
}
