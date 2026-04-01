import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Phone,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Link as LinkIcon,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ── Step 1 validation ────────────────────────────────────────────────────────
const step1Schema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  ownerName: z.string().min(1, "Your name is required"),
  businessPhone: z.string().min(10, "Valid phone number required"),
  businessEmail: z.string().email("Valid email required").or(z.literal("")),
  businessZip: z.string().optional(),
  phoneType: z.enum(["cell", "landline", "voip", "google_voice"]),
});
type Step1Data = z.infer<typeof step1Schema>;

// ── Step 2 validation ────────────────────────────────────────────────────────
const step2Schema = z.object({
  businessDisplayName: z.string().min(1, "Display name is required"),
  autoTextTemplate: z.string().min(1, "Auto-reply message is required"),
  autoTextLinkUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  followUpEnabled: z.boolean(),
  followUpMessage: z.string().optional(),
  followUpDelayHours: z.number().optional(),
});
type Step2Data = z.infer<typeof step2Schema>;

// ── Default messages ─────────────────────────────────────────────────────────
const DEFAULT_AUTO_TEXT = (name: string) =>
  `Hey! This is ${name} — sorry we missed your call. Tell us what you need and we'll get back to you ASAP. Reply to this text or call us back.`;

const DEFAULT_FOLLOWUP = "Just following up — did you still need help? Reply here or call us back anytime.";

// ── Phone type labels ────────────────────────────────────────────────────────
const PHONE_TYPE_OPTIONS = [
  { value: "cell", label: "Cell Phone" },
  { value: "landline", label: "Landline" },
  { value: "voip", label: "VoIP (Vonage, Ooma, etc.)" },
  { value: "google_voice", label: "Google Voice" },
];

// ── Forwarding instructions by phone type ────────────────────────────────────
function getForwardingSteps(phoneType: string, twilioNumber: string): string[] {
  const formatted = twilioNumber.replace(/^\+1/, "");
  switch (phoneType) {
    case "cell":
      return [
        `Open your Phone app`,
        `Dial *72${formatted} and press Call`,
        `Wait for confirmation tone or message`,
        `Hang up — forwarding is active`,
        `To cancel later: dial *73 and press Call`,
      ];
    case "landline":
      return [
        `Pick up your landline phone`,
        `Dial *72`,
        `When you hear the dial tone, dial ${formatted}`,
        `Wait for confirmation tone`,
        `Hang up — forwarding is active`,
        `To cancel later: dial *73`,
      ];
    case "google_voice":
      return [
        `Go to voice.google.com → Settings`,
        `Under "Calls", find "Call forwarding"`,
        `Add ${formatted} as a forwarding number`,
        `Verify the number when prompted`,
      ];
    case "voip":
      return [
        `Log into your VoIP provider's admin panel`,
        `Find "Call Forwarding" or "Routing" settings`,
        `Set unanswered calls to forward to: ${formatted}`,
        `Save and test`,
      ];
    default:
      return [`Forward unanswered calls to: ${formatted}`];
  }
}

// ── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ["Business Info", "Customize", "Forwarding", "Test", "Done"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-orange-500 text-white"
                  : isDone
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-neutral-800 text-neutral-500"
              }`}
            >
              {isDone ? <Check className="w-4 h-4" /> : step}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                isActive ? "text-orange-400" : isDone ? "text-neutral-400" : "text-neutral-600"
              }`}
            >
              {labels[i]}
            </span>
            {i < total - 1 && <div className="w-6 h-px bg-neutral-700" />}
          </div>
        );
      })}
    </div>
  );
}

// ── SMS Preview bubble ───────────────────────────────────────────────────────
function SmsPreview({ message, linkUrl }: { message: string; linkUrl?: string }) {
  const fullMessage = linkUrl ? `${message} ${linkUrl}` : message;
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <p className="text-xs text-neutral-500 mb-3 text-center">Preview — what your caller will see</p>
      <div className="max-w-[280px] mx-auto">
        <div className="bg-neutral-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-neutral-100 leading-relaxed">
          {fullMessage}
        </div>
        <p className="text-[10px] text-neutral-600 mt-1 ml-2">BossMan Auto-Text</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MctbActivatePage() {
  const [step, setStep] = useState(1);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [twilioNumber, setTwilioNumber] = useState<string | null>(null);
  const [provisioningPending, setProvisioningPending] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // ── Step 1 form ──────────────────────────────────────────────────────────
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      businessName: "",
      ownerName: "",
      businessPhone: "",
      businessEmail: "",
      businessZip: "",
      phoneType: "cell",
    },
  });

  // ── Step 2 form ──────────────────────────────────────────────────────────
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      businessDisplayName: "",
      autoTextTemplate: "",
      autoTextLinkUrl: "",
      followUpEnabled: false,
      followUpMessage: DEFAULT_FOLLOWUP,
      followUpDelayHours: 2,
    },
  });

  // Pre-fill step 2 display name when step 1 business name changes
  const businessName = step1Form.watch("businessName");
  useEffect(() => {
    const current = step2Form.getValues("businessDisplayName");
    if (!current || current === "") {
      step2Form.setValue("businessDisplayName", businessName);
      step2Form.setValue("autoTextTemplate", DEFAULT_AUTO_TEXT(businessName || "Your Business"));
    }
  }, [businessName]);

  // Watch step 2 fields for live preview
  const watchedTemplate = step2Form.watch("autoTextTemplate");
  const watchedLink = step2Form.watch("autoTextLinkUrl");
  const watchedDisplayName = step2Form.watch("businessDisplayName");
  const watchedFollowUp = step2Form.watch("followUpEnabled");

  // Update template when display name changes
  const handleDisplayNameChange = (name: string) => {
    step2Form.setValue("businessDisplayName", name);
    const currentTemplate = step2Form.getValues("autoTextTemplate");
    // Only auto-update if they haven't customized the message much
    if (
      currentTemplate === DEFAULT_AUTO_TEXT(businessName) ||
      currentTemplate === DEFAULT_AUTO_TEXT(step2Form.getValues("businessDisplayName"))
    ) {
      step2Form.setValue("autoTextTemplate", DEFAULT_AUTO_TEXT(name));
    }
  };

  // ── Onboard mutation (called after step 2) ───────────────────────────────
  const onboardMutation = useMutation({
    mutationFn: async (data: Step1Data & Step2Data) => {
      const res = await apiRequest("POST", "/api/mctb/onboard", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAccountId(data.accountId);
      if (data.twilioNumber) {
        setTwilioNumber(data.twilioNumber);
      } else {
        setProvisioningPending(true);
      }
      setStep(3);
    },
    onError: (err: Error) => {
      toast({ title: "Setup failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Test call mutation ───────────────────────────────────────────────────
  const testCallMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/mctb/test-call/${accountId}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setTestSent(true);
        toast({ title: "Test call sent!", description: "Don't answer — check for the auto-text." });
      } else {
        toast({ title: "Test failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Mark forwarding verified ─────────────────────────────────────────────
  const verifyForwardingMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/mctb/accounts/${accountId}`, {
        forwardingVerified: true,
      });
    },
    onSuccess: () => setStep(4),
  });

  // ── Step navigation ──────────────────────────────────────────────────────
  const handleStep1Next = step1Form.handleSubmit(() => {
    // Pre-fill step 2 defaults
    const name = step1Form.getValues("businessName");
    if (!step2Form.getValues("businessDisplayName")) {
      step2Form.setValue("businessDisplayName", name);
    }
    if (!step2Form.getValues("autoTextTemplate")) {
      step2Form.setValue("autoTextTemplate", DEFAULT_AUTO_TEXT(name));
    }
    setStep(2);
  });

  const handleStep2Submit = step2Form.handleSubmit((step2Data) => {
    const step1Data = step1Form.getValues();
    onboardMutation.mutate({ ...step1Data, ...step2Data });
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Activate <span className="text-orange-400">BossMan</span>
          </h1>
          <p className="text-neutral-400">
            Never miss a customer again. Set up auto-textback in 5 minutes.
          </p>
        </div>

        <StepIndicator current={step} total={5} />

        {/* ── STEP 1: Business Info ─────────────────────────────────────── */}
        {step === 1 && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-100">
                <Building2 className="w-5 h-5 text-orange-400" />
                Tell us about your business
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Smith Plumbing"
                    {...step1Form.register("businessName")}
                    className="bg-neutral-800 border-neutral-700"
                  />
                  {step1Form.formState.errors.businessName && (
                    <p className="text-red-400 text-xs">{step1Form.formState.errors.businessName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Your Name *</Label>
                  <Input
                    id="ownerName"
                    placeholder="John Smith"
                    {...step1Form.register("ownerName")}
                    className="bg-neutral-800 border-neutral-700"
                  />
                  {step1Form.formState.errors.ownerName && (
                    <p className="text-red-400 text-xs">{step1Form.formState.errors.ownerName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Business Phone *</Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    placeholder="(312) 555-1234"
                    {...step1Form.register("businessPhone")}
                    className="bg-neutral-800 border-neutral-700"
                  />
                  {step1Form.formState.errors.businessPhone && (
                    <p className="text-red-400 text-xs">{step1Form.formState.errors.businessPhone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    placeholder="john@smithplumbing.com"
                    {...step1Form.register("businessEmail")}
                    className="bg-neutral-800 border-neutral-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessZip">Zip Code</Label>
                  <Input
                    id="businessZip"
                    placeholder="60605"
                    maxLength={5}
                    {...step1Form.register("businessZip")}
                    className="bg-neutral-800 border-neutral-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Type *</Label>
                  <Select
                    value={step1Form.watch("phoneType")}
                    onValueChange={(v) => step1Form.setValue("phoneType", v as Step1Data["phoneType"])}
                  >
                    <SelectTrigger className="bg-neutral-800 border-neutral-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHONE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleStep1Next}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4"
              >
                Next — Customize Your Response
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: Customize Response ────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-neutral-100">
                  <MessageSquare className="w-5 h-5 text-orange-400" />
                  Customize your auto-reply
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Display name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Business name in text</Label>
                  <Input
                    id="displayName"
                    placeholder="Smith Plumbing"
                    value={watchedDisplayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    className="bg-neutral-800 border-neutral-700"
                  />
                  <p className="text-xs text-neutral-500">This is how your business appears in the text message</p>
                </div>

                {/* Auto-reply message */}
                <div className="space-y-2">
                  <Label htmlFor="autoText">Auto-reply message</Label>
                  <Textarea
                    id="autoText"
                    rows={3}
                    {...step2Form.register("autoTextTemplate")}
                    className="bg-neutral-800 border-neutral-700 resize-none"
                  />
                  <p className="text-xs text-neutral-500">
                    Sent instantly when you miss a call. Keep it short and friendly.
                  </p>
                </div>

                {/* Optional link */}
                <div className="space-y-2">
                  <Label htmlFor="linkUrl" className="flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5" />
                    Booking / website link
                    <span className="text-neutral-500 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="linkUrl"
                    type="url"
                    placeholder="https://yourbookingpage.com"
                    {...step2Form.register("autoTextLinkUrl")}
                    className="bg-neutral-800 border-neutral-700"
                  />
                  <p className="text-xs text-neutral-500">Added to the end of your auto-reply</p>
                </div>

                {/* Follow-up toggle */}
                <div className="border-t border-neutral-800 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Follow-up message
                      </Label>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Send a second text if they don't reply
                      </p>
                    </div>
                    <Switch
                      checked={watchedFollowUp}
                      onCheckedChange={(v) => step2Form.setValue("followUpEnabled", v)}
                    />
                  </div>

                  {watchedFollowUp && (
                    <div className="space-y-3 pl-0 mt-3">
                      <Textarea
                        rows={2}
                        {...step2Form.register("followUpMessage")}
                        className="bg-neutral-800 border-neutral-700 resize-none"
                      />
                      <div className="space-y-1">
                        <Label className="text-xs">Send after</Label>
                        <Select
                          value={String(step2Form.watch("followUpDelayHours") || 2)}
                          onValueChange={(v) => step2Form.setValue("followUpDelayHours", Number(v))}
                        >
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="2">2 hours</SelectItem>
                            <SelectItem value="4">4 hours</SelectItem>
                            <SelectItem value="8">8 hours</SelectItem>
                            <SelectItem value="24">24 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live preview */}
                <div className="border-t border-neutral-800 pt-5">
                  <SmsPreview
                    message={watchedTemplate || DEFAULT_AUTO_TEXT(watchedDisplayName || "Your Business")}
                    linkUrl={watchedLink || undefined}
                  />
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-neutral-700 text-neutral-300"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleStep2Submit}
                    disabled={onboardMutation.isPending}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {onboardMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Activate BossMan
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STEP 3: Forwarding Setup ──────────────────────────────────── */}
        {step === 3 && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-100">
                <Phone className="w-5 h-5 text-orange-400" />
                Set up call forwarding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {provisioningPending ? (
                <div className="text-center py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto mb-3" />
                  <p className="text-neutral-300">We're setting up your number...</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    This usually takes a few minutes. We'll email you when it's ready.
                  </p>
                </div>
              ) : (
                <>
                  {/* Twilio number display */}
                  <div className="bg-neutral-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-neutral-500 mb-1">Your BossMan Number</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-mono font-bold text-orange-400">
                        {twilioNumber?.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3") || twilioNumber}
                      </span>
                      <button
                        onClick={() => copyToClipboard(twilioNumber || "")}
                        className="text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <p className="text-sm text-neutral-300 mb-3">
                      Forward unanswered calls from your business phone to BossMan:
                    </p>
                    <ol className="space-y-2">
                      {getForwardingSteps(
                        step1Form.getValues("phoneType"),
                        twilioNumber || ""
                      ).map((instruction, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-medium">
                            {i + 1}
                          </span>
                          <span className="text-neutral-300 pt-0.5">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="border-neutral-700 text-neutral-300"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => verifyForwardingMutation.mutate()}
                      disabled={verifyForwardingMutation.isPending}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {verifyForwardingMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4 mr-2" />
                      )}
                      I've Set Up Forwarding
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 4: Test It ───────────────────────────────────────────── */}
        {step === 4 && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-100">
                <Smartphone className="w-5 h-5 text-orange-400" />
                Test your auto-textback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-neutral-800 rounded-lg p-4 text-center">
                <p className="text-sm text-neutral-300 mb-1">
                  Call your business number and <strong>don't answer</strong>.
                </p>
                <p className="text-xs text-neutral-500">
                  The call will forward to BossMan, and you should receive an auto-text within seconds.
                </p>
              </div>

              {!testSent ? (
                <div className="space-y-3">
                  <Button
                    onClick={() => testCallMutation.mutate()}
                    disabled={testCallMutation.isPending}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {testCallMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Calling...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 mr-2" />
                        Send Test Call
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-neutral-500 text-center">
                    Or call your business number yourself from another phone
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-neutral-800/50 rounded-lg p-3">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-300">Waiting for auto-text...</p>
                      <p className="text-xs text-neutral-500">Check your phone. It should arrive within 30 seconds.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setStep(5)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      I Got the Text!
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTestSent(false);
                        testCallMutation.reset();
                      }}
                      className="border-neutral-700 text-neutral-300"
                    >
                      Try Again
                    </Button>
                  </div>

                  <button
                    onClick={() => setStep(5)}
                    className="text-xs text-neutral-500 hover:text-neutral-400 underline w-full text-center"
                  >
                    Skip — I'll test later
                  </button>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                className="text-neutral-500 hover:text-neutral-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to forwarding setup
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 5: Done ──────────────────────────────────────────────── */}
        {step === 5 && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-neutral-100 mb-2">You're live!</h2>
                <p className="text-neutral-400">
                  BossMan is now catching missed calls for{" "}
                  <span className="text-orange-400 font-medium">
                    {step2Form.getValues("businessDisplayName") || step1Form.getValues("businessName")}
                  </span>
                </p>
              </div>

              {/* Summary */}
              <div className="bg-neutral-800 rounded-lg p-4 text-left space-y-3 max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-neutral-300">Missed calls get auto-texted</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-neutral-300">Customer replies forward to your phone</span>
                </div>
                {step2Form.getValues("followUpEnabled") && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-neutral-300">
                      Follow-up sends after {step2Form.getValues("followUpDelayHours")} hours
                    </span>
                  </div>
                )}
                {twilioNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-neutral-300 font-mono text-xs">
                      {twilioNumber.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}
                    </span>
                  </div>
                )}
              </div>

              {/* Preview of their message */}
              <SmsPreview
                message={step2Form.getValues("autoTextTemplate")}
                linkUrl={step2Form.getValues("autoTextLinkUrl") || undefined}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
