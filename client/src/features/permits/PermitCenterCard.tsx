import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, RefreshCw, Wand2, Download, Send, CheckCircle, Mail, ClipboardCheck, ExternalLink } from "lucide-react";

type PermitListItem = {
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
  };
  jurisdiction: { id: string; name: string; portalUrl: string | null; submissionMethod: string | null; submissionEmail: string | null };
  permitType: { id: string; code: string; name: string };
  documents: Array<{ id: string; docType: string; filename: string; url: string | null; downloadUrl?: string }>;
};

function statusBadgeVariant(status: string) {
  if (["ready_for_review", "ready_to_submit"].includes(status)) return "default";
  if (["submitted", "closed"].includes(status)) return "secondary";
  if (status === "error") return "destructive";
  return "outline";
}

export function PermitCenterCard({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<PermitListItem | null>(null);
  const [submitMethod, setSubmitMethod] = useState<"email" | "assisted">("assisted");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [submissionEmail, setSubmissionEmail] = useState("");

  const permitsQuery = useQuery<PermitListItem[]>({
    queryKey: ["/api/jobs", jobId, "permits"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/permits`, { credentials: "include" });
      if (!res.ok) {
        const err = new Error("Failed to fetch permits") as any;
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    retry: false,
  });

  const detectMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/jobs/${jobId}/permits/detect`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "permits"] });
      toast({ title: "Permits detected", description: "Permit packets have been created (if applicable)." });
    },
    onError: (err: any) => {
      toast({ title: "Detection failed", description: err?.message || "Could not detect permits.", variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (packetId: string) => apiRequest("POST", `/api/jobs/${jobId}/permits/${packetId}/generate`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "permits"] });
      toast({ title: "Permit packet generated", description: "A PDF packet is ready for review." });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err?.message || "Could not generate PDF.", variant: "destructive" });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (packetId: string) => apiRequest("PATCH", `/api/jobs/${jobId}/permits/${packetId}/finalize`, { customerFields: {}, doNotStorePII: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "permits"] });
      toast({ title: "Packet finalized", description: "The permit packet is ready to submit." });
    },
    onError: (err: any) => {
      toast({ title: "Finalize failed", description: err?.message || "Could not finalize packet.", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ packetId, method, email, confirmation }: { packetId: string; method: string; email?: string; confirmation?: string }) => 
      apiRequest("POST", `/api/jobs/${jobId}/permits/${packetId}/submit`, { 
        method, 
        destinationEmail: email, 
        confirmationNumber: confirmation 
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "permits"] });
      toast({ title: "Permit submitted", description: "The permit application has been submitted." });
      setSubmitDialogOpen(false);
      setSelectedPacket(null);
      setConfirmationNumber("");
      setSubmissionEmail("");
    },
    onError: (err: any) => {
      toast({ title: "Submit failed", description: err?.message || "Could not submit permit.", variant: "destructive" });
    },
  });

  const openSubmitDialog = (item: PermitListItem) => {
    setSelectedPacket(item);
    setSubmissionEmail(item.jurisdiction.submissionEmail || "");
    setSubmitMethod(item.jurisdiction.submissionMethod === "email" ? "email" : "assisted");
    setSubmitDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedPacket) return;
    submitMutation.mutate({
      packetId: selectedPacket.packet.id,
      method: submitMethod,
      email: submitMethod === "email" ? submissionEmail : undefined,
      confirmation: submitMethod === "assisted" ? confirmationNumber : undefined,
    });
  };

  const isForbidden = (permitsQuery.error as any)?.status === 403;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Permit Center
          </CardTitle>
          <CardDescription>
            Detect required permits by jurisdiction and generate pre-filled packets.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => detectMutation.mutate()}
          disabled={detectMutation.isPending || permitsQuery.isLoading}
          data-testid="button-detect-permits"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Detect
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isForbidden ? (
          <div className="text-sm text-muted-foreground">
            Permit Center is disabled. Enable it in Admin Settings.
          </div>
        ) : permitsQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading permits...</div>
        ) : permitsQuery.data && permitsQuery.data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No permit packets yet. Click Detect to create them.</div>
        ) : (
          <div className="space-y-2">
            {(permitsQuery.data || []).map((item) => {
              const pdf = item.documents.find((d) => d.docType === "application_pdf" && (d.url || d.downloadUrl));
              const pdfUrl = pdf?.downloadUrl || pdf?.url;
              const status = item.packet.status;
              const canFinalize = ["needs_customer_info", "ready_for_review"].includes(status);
              const canSubmit = status === "ready_to_submit";
              const isSubmitted = status === "submitted";
              
              return (
                <div key={item.packet.id} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium">{item.permitType.name}</div>
                          <Badge variant={statusBadgeVariant(status)}>{status.replace(/_/g, " ")}</Badge>
                          {item.packet.required ? <Badge variant="destructive">required</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.jurisdiction.name}
                          {item.jurisdiction.portalUrl ? (
                            <a href={item.jurisdiction.portalUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />Portal
                            </a>
                          ) : null}
                        </div>
                        {item.packet.detectedReason ? (
                          <div className="text-xs text-muted-foreground">{item.packet.detectedReason}</div>
                        ) : null}
                        {item.packet.submittedAt ? (
                          <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Submitted {new Date(item.packet.submittedAt).toLocaleDateString()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {!isSubmitted && (
                        <Button
                          size="sm"
                          variant={pdf ? "secondary" : "default"}
                          onClick={() => generateMutation.mutate(item.packet.id)}
                          disabled={generateMutation.isPending}
                          data-testid={`button-generate-permit-${item.packet.id}`}
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          {pdf ? "Regenerate" : "Generate PDF"}
                        </Button>
                      )}
                      
                      {pdf && pdfUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={pdfUrl} download={pdf.filename} target="_blank" rel="noreferrer" data-testid={`button-download-permit-${item.packet.id}`}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      ) : null}
                      
                      {canFinalize && pdf && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => finalizeMutation.mutate(item.packet.id)}
                          disabled={finalizeMutation.isPending}
                          data-testid={`button-finalize-permit-${item.packet.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Finalize
                        </Button>
                      )}
                      
                      {canSubmit && pdf && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openSubmitDialog(item)}
                          data-testid={`button-submit-permit-${item.packet.id}`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Permit Application</DialogTitle>
            <DialogDescription>
              Choose how to submit the permit application for {selectedPacket?.permitType.name}.
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
                Assisted (Manual)
              </Button>
              <Button
                variant={submitMethod === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setSubmitMethod("email")}
                data-testid="button-submit-method-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Submit
              </Button>
            </div>

            {submitMethod === "assisted" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Submit the permit manually through the jurisdiction portal, then enter the confirmation number below.
                </p>
                {selectedPacket?.jurisdiction.portalUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedPacket.jurisdiction.portalUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Permit Portal
                    </a>
                  </Button>
                )}
                <div className="space-y-2">
                  <Label htmlFor="confirmationNumber">Confirmation Number</Label>
                  <Input
                    id="confirmationNumber"
                    value={confirmationNumber}
                    onChange={(e) => setConfirmationNumber(e.target.value)}
                    placeholder="Enter confirmation number from portal"
                    data-testid="input-confirmation-number"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send the permit application via email to the jurisdiction.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="submissionEmail">Destination Email</Label>
                  <Input
                    id="submissionEmail"
                    type="email"
                    value={submissionEmail}
                    onChange={(e) => setSubmissionEmail(e.target.value)}
                    placeholder="permits@city.gov"
                    data-testid="input-submission-email"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
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
    </Card>
  );
}
