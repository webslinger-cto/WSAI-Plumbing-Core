import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Send,
  Download,
  Loader2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  FileText,
  Briefcase,
  Search,
  Plus,
  Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import SignatureCanvas from "@/components/SignatureCanvas";
import type { Job, PricebookItem, PricebookCategory } from "@shared/schema";
import { format } from "date-fns";

interface EstimateFormProps {
  jobId?: string;
  technicianId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerZip?: string;
  technicianName?: string;
  showJobSelector?: boolean;
  onSave?: () => void;
  onQuoteCreated?: () => void;
}

const AUTHORIZATION_TEXT = "I authorize Chicago Sewer Experts to perform the described services and agree to pay the amount indicated. I understand that Chicago Sewer Experts is not responsible for broken, settled, rusted, deteriorated, or lead pipes, fixtures, or clean outs and any damage resulting from cleaning and repairing such lines. Chicago Sewer Experts, is not responsible for repair or replacement of walls, floors, concrete, or landscaping from work being done unless otherwise stated.";

const RIGHT_TO_CANCEL_TEXT = "RIGHT TO CANCEL: You, the consumer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. See the attached Notice of Cancellation for an explanation of this right.";

const COMPLETION_TEXT = "COMPLETION: I acknowledge completion of the above described work which has been done to my complete satisfaction.";

export default function EstimateForm({
  jobId: initialJobId,
  technicianId,
  customerName = "",
  customerPhone = "",
  customerEmail: initialCustomerEmail = "",
  customerAddress = "",
  customerCity = "",
  customerZip = "",
  technicianName = "",
  showJobSelector = false,
  onSave,
  onQuoteCreated,
}: EstimateFormProps) {
  const { toast } = useToast();

  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [email, setEmail] = useState(initialCustomerEmail);
  const [address, setAddress] = useState(customerAddress);
  const [city, setCity] = useState(customerCity);
  const [zip, setZip] = useState(customerZip);
  const [datePromised, setDatePromised] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [printedName, setPrintedName] = useState("");
  const [authSignature, setAuthSignature] = useState<string | null>(null);

  const [workDescription, setWorkDescription] = useState("");
  const [warrantyYears, setWarrantyYears] = useState("1");

  const [price, setPrice] = useState<number>(0);
  const [discounts, setDiscounts] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositCheckNumber, setDepositCheckNumber] = useState("");
  const [balanceCheckNumber, setBalanceCheckNumber] = useState("");

  const [cardholderSig, setCardholderSig] = useState<string | null>(null);
  const [ccDescription, setCcDescription] = useState("");

  const [completionSignature, setCompletionSignature] = useState<string | null>(null);

  const [showCreditCard, setShowCreditCard] = useState(false);
  const [showPricebook, setShowPricebook] = useState(false);
  const [pricebookSearch, setPricebookSearch] = useState("");
  const [selectedPricebookCategory, setSelectedPricebookCategory] = useState<string>("all");

  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || "");

  const totalPrice = price - discounts;
  const balanceAmount = totalPrice - depositAmount;

  const { data: pricebookItems = [], isLoading: pricebookLoading } = useQuery<PricebookItem[]>({
    queryKey: ["/api/pricebook/items"],
  });

  const { data: pricebookCategories = [] } = useQuery<PricebookCategory[]>({
    queryKey: ["/api/pricebook/categories"],
  });

  const filteredPricebookItems = pricebookItems.filter((item) => {
    if (!item.isActive) return false;
    const matchesSearch = pricebookSearch === "" ||
      item.name.toLowerCase().includes(pricebookSearch.toLowerCase()) ||
      item.description?.toLowerCase().includes(pricebookSearch.toLowerCase()) ||
      item.serviceCode?.toLowerCase().includes(pricebookSearch.toLowerCase());
    const matchesCategory = selectedPricebookCategory === "all" || item.category === selectedPricebookCategory;
    return matchesSearch && matchesCategory;
  });

  const addPricebookItemToDescription = (item: PricebookItem) => {
    const itemPrice = parseFloat(item.basePrice || "0");
    const itemText = `${item.name} - $${itemPrice.toFixed(2)}`;
    setWorkDescription(prev => prev ? `${prev}\n${itemText}` : itemText);
    setPrice(prev => prev + itemPrice);
    toast({ title: "Item Added", description: `${item.name} added to estimate` });
  };

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: showJobSelector || !initialJobId,
  });

  const activeJobs = jobs.filter(j =>
    ["pending", "assigned", "confirmed", "en_route", "on_site", "in_progress"].includes(j.status)
  );

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setName(job.customerName);
      setPhone(job.customerPhone || "");
      if (job.customerEmail) setEmail(job.customerEmail);
      setAddress(job.address || "");
      setCity(job.city || "");
      setZip(job.zipCode || "");
    }
  };

  useEffect(() => {
    setName(customerName);
    setPhone(customerPhone);
    setEmail(initialCustomerEmail);
    setAddress(customerAddress);
    setCity(customerCity);
    setZip(customerZip);
  }, [customerName, customerPhone, initialCustomerEmail, customerAddress, customerCity, customerZip]);

  const saveQuoteMutation = useMutation({
    mutationFn: async (data: { status: "draft" | "sent" }) => {
      const jobIdToUse = selectedJobId || initialJobId;
      if (!jobIdToUse) throw new Error("Please select a job first");

      return apiRequest("POST", "/api/quotes", {
        jobId: jobIdToUse,
        technicianId: technicianId || undefined,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || undefined,
        address,
        city,
        zipCode: zip,
        datePromised,
        workDescription,
        warrantyYears,
        price: String(price),
        discounts: String(discounts),
        totalPrice: String(totalPrice),
        depositAmount: String(depositAmount),
        depositCheckNumber,
        balanceAmount: String(balanceAmount),
        balanceCheckNumber,
        authorizationSignature: authSignature || undefined,
        authorizationPrintedName: printedName || undefined,
        completionSignature: completionSignature || undefined,
        cardholderSignature: cardholderSig || undefined,
        serviceTechName: technicianName,
        formType: "estimate",
        subtotal: String(price),
        total: String(totalPrice),
        taxRate: "0",
        taxAmount: "0",
        status: data.status,
        notes: ccDescription ? `${workDescription}\n\nCC Description: ${ccDescription}` : workDescription,
        sentAt: data.status === "sent" ? new Date().toISOString() : undefined,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      if (technicianId) {
        queryClient.invalidateQueries({ queryKey: ["/api/jobs", { technicianId }] });
      }
      toast({
        title: variables.status === "sent" ? "Estimate Sent" : "Estimate Saved",
        description: variables.status === "sent"
          ? "Estimate has been sent to the customer and saved."
          : "Estimate has been saved as a draft.",
      });
      onQuoteCreated?.();
      onSave?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save estimate",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => saveQuoteMutation.mutate({ status: "draft" });
  const handleSend = () => saveQuoteMutation.mutate({ status: "sent" });

  const currentJobId = selectedJobId || initialJobId;

  const handlePrintPDF = () => {
    const today = format(new Date(), "MMMM d, yyyy");
    const htmlContent = `<!DOCTYPE html>
<html><head><title>Estimate - Chicago Sewer Experts</title>
<style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;font-size:12px;color:#000}
.header{text-align:center;margin-bottom:10px;border-bottom:2px solid #000;padding-bottom:10px}
.header h1{font-size:22px;margin:0}
.header p{margin:2px 0;font-size:11px}
.row{display:flex;gap:10px;margin-bottom:6px}
.field{flex:1}
.field label{font-weight:bold;font-size:10px;text-transform:uppercase}
.field .val{border-bottom:1px solid #000;min-height:18px;padding:2px 4px}
.auth-text{font-size:10px;margin:10px 0;line-height:1.4}
.work-desc{border:1px solid #000;min-height:150px;padding:8px;white-space:pre-wrap;margin:10px 0}
.sig-line{border-bottom:1px solid #000;min-height:40px;margin-top:5px}
.pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:15px 0}
.pricing-right .row-item{display:flex;justify-content:space-between;border-bottom:1px solid #ccc;padding:4px 0}
.pricing-right .row-item label{font-weight:bold;font-size:11px}
.footer{text-align:center;font-size:10px;margin-top:20px;border-top:1px solid #000;padding-top:10px}
@media print{body{margin:0;padding:10px}}
</style></head><body>
<div class="header">
<h1>CHICAGO SEWER EXPERTS</h1>
<p>7741 Mason Ave. Burbank, IL 60459</p>
<p>312-391-6503 | chicagosewerexperts1@gmail.com</p>
<p><strong>LICENSED &bull; BONDED &bull; INSURED</strong></p>
</div>
<div class="row">
<div class="field"><label>Date Promised</label><div class="val">${datePromised}</div></div>
<div class="field"><label>Date</label><div class="val">${today}</div></div>
<div class="field"><label>Email</label><div class="val">${email}</div></div>
</div>
<div class="row">
<div class="field" style="flex:2"><label>Name</label><div class="val">${name}</div></div>
<div class="field"><label>Phone</label><div class="val">${phone}</div></div>
</div>
<div class="row">
<div class="field" style="flex:2"><label>Address</label><div class="val">${address}</div></div>
<div class="field"><label>City</label><div class="val">${city}</div></div>
<div class="field" style="flex:0.3"><label>IL</label><div class="val">IL</div></div>
<div class="field" style="flex:0.5"><label>Zip</label><div class="val">${zip}</div></div>
</div>
<p class="auth-text">${AUTHORIZATION_TEXT}</p>
<p class="auth-text"><strong>${RIGHT_TO_CANCEL_TEXT}</strong></p>
<div class="row">
<div class="field"><label>Print Name</label><div class="val">${printedName}</div></div>
<div class="field"><label>Signature</label><div class="sig-line">${authSignature ? `<img src="${authSignature}" style="max-height:35px" />` : ""}</div></div>
</div>
<h3 style="margin:15px 0 5px;text-transform:uppercase;font-size:13px">Description of Work to Be Performed</h3>
<div class="work-desc">${workDescription}</div>
<p class="auth-text">We guarantee all repair work performed by Chicago Sewer Experts for <strong>${warrantyYears}</strong> year(s) against defects in labor materials or workmanship.</p>
<div class="pricing-grid">
<div></div>
<div class="pricing-right">
<div class="row-item"><label>Service Tech</label><span>${technicianName}</span></div>
<div class="row-item"><label>Price</label><span>$${price.toFixed(2)}</span></div>
<div class="row-item"><label>Discounts</label><span>$${discounts.toFixed(2)}</span></div>
<div class="row-item"><label>Total Price</label><span><strong>$${totalPrice.toFixed(2)}</strong></span></div>
<div class="row-item"><label>Deposit</label><span>$${depositAmount.toFixed(2)}${depositCheckNumber ? ` (Check #${depositCheckNumber})` : ""}</span></div>
<div class="row-item"><label>Balance</label><span>$${balanceAmount.toFixed(2)}${balanceCheckNumber ? ` (Check #${balanceCheckNumber})` : ""}</span></div>
</div>
</div>
<p class="auth-text"><strong>${COMPLETION_TEXT}</strong></p>
<div class="row">
<div class="field"><label>Customer Signature</label><div class="sig-line">${completionSignature ? `<img src="${completionSignature}" style="max-height:35px" />` : ""}</div></div>
</div>
<div class="footer"><p>See back for Terms and Conditions</p><p>Thank you for choosing Chicago Sewer Experts!</p></div>
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 250);
    }
  };

  return (
    <div className="space-y-4">
      {(showJobSelector || !initialJobId) && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Select Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading jobs...</span>
              </div>
            ) : activeJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active jobs available.
              </p>
            ) : (
              <Select value={selectedJobId} onValueChange={handleJobSelect}>
                <SelectTrigger data-testid="select-job-for-estimate">
                  <SelectValue placeholder="Select a job to create estimate for..." />
                </SelectTrigger>
                <SelectContent>
                  {activeJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{job.customerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {job.serviceType} - {job.address}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col items-center text-center space-y-1 mb-4">
            <p className="text-xl font-bold tracking-tight">CHICAGO SEWER EXPERTS</p>
            <p className="text-xs text-muted-foreground">7741 Mason Ave. Burbank, IL 60459</p>
            <p className="text-xs text-muted-foreground">312-391-6503 | chicagosewerexperts1@gmail.com</p>
            <Badge variant="outline" className="text-[10px]">LICENSED &bull; BONDED &bull; INSURED</Badge>
          </div>
          <Separator className="mb-4" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Date Promised</Label>
              <Input
                type="date"
                value={datePromised}
                onChange={(e) => setDatePromised(e.target.value)}
                data-testid="input-date-promised"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                data-testid="input-form-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
                data-testid="input-estimate-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                data-testid="input-estimate-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(xxx) xxx-xxxx"
                data-testid="input-estimate-phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 mb-4">
            <div className="col-span-6 sm:col-span-3 space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                data-testid="input-estimate-address"
              />
            </div>
            <div className="col-span-3 sm:col-span-1 space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Chicago"
                data-testid="input-estimate-city"
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input value="IL" disabled />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label className="text-xs">Zip</Label>
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="60xxx"
                data-testid="input-estimate-zip"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground leading-relaxed">{AUTHORIZATION_TEXT}</p>
          </div>
          <div>
            <p className="text-xs font-semibold leading-relaxed">{RIGHT_TO_CANCEL_TEXT}</p>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Print Name</Label>
              <Input
                value={printedName}
                onChange={(e) => setPrintedName(e.target.value)}
                placeholder="Customer printed name"
                data-testid="input-printed-name"
              />
            </div>
            <div>
              <SignatureCanvas
                onSignatureChange={setAuthSignature}
                label="Customer Authorization Signature"
                height={100}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description of Work to Be Performed
            </CardTitle>
            <Button
              variant={showPricebook ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPricebook(!showPricebook)}
              data-testid="button-toggle-pricebook-estimate"
            >
              <Package className="w-4 h-4 mr-1" />
              Pricebook
            </Button>
          </div>
        </CardHeader>
        {showPricebook && (
          <div className="px-6 pb-4">
            <div className="p-4 rounded-lg border bg-muted/20 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={pricebookSearch}
                    onChange={(e) => setPricebookSearch(e.target.value)}
                    placeholder="Search pricebook items..."
                    className="pl-9"
                    data-testid="input-pricebook-search-estimate"
                  />
                </div>
                <Select value={selectedPricebookCategory} onValueChange={setSelectedPricebookCategory}>
                  <SelectTrigger className="w-[180px]" data-testid="select-pricebook-category-estimate">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {pricebookCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-[200px]">
                {pricebookLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPricebookItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No items found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPricebookItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border bg-background hover-elevate cursor-pointer"
                        onClick={() => addPricebookItemToDescription(item)}
                        data-testid={`pricebook-estimate-item-${item.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{item.name}</span>
                            {item.serviceCode && (
                              <Badge variant="outline" className="text-xs shrink-0">{item.serviceCode}</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary">{item.category}</Badge>
                          <span className="font-semibold text-green-500">${parseFloat(item.basePrice || "0").toFixed(2)}</span>
                          <Button size="icon" variant="ghost">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
        <CardContent>
          <Textarea
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder="Describe the work to be performed..."
            className="min-h-[160px] font-mono text-sm"
            data-testid="input-work-description"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              We guarantee all repair work performed by Chicago Sewer Experts for
            </p>
            <Input
              value={warrantyYears}
              onChange={(e) => setWarrantyYears(e.target.value)}
              className="w-16 text-center"
              data-testid="input-warranty-years"
            />
            <p className="text-xs text-muted-foreground">
              year(s) against defects in labor materials or workmanship.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowCreditCard(!showCreditCard)}>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Credit Card Authorization
              </div>
              {showCreditCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
          {showCreditCard && (
            <CardContent className="space-y-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                I hereby authorize Chicago Sewer Experts, to put through a charge to my credit card.
                A 4% processing fee will be added to total.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Description of charges sold above</Label>
                  <Input
                    value={ccDescription}
                    onChange={(e) => setCcDescription(e.target.value)}
                    placeholder="Service description"
                    data-testid="input-cc-description"
                  />
                </div>
                <SignatureCanvas
                  onSignatureChange={setCardholderSig}
                  label="Cardholder Signature"
                  height={80}
                />
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
              Service Tech Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Service Tech</Label>
              <Input
                value={technicianName}
                disabled
                data-testid="input-service-tech"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={price || ""}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="pl-7"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  data-testid="input-estimate-price"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Discounts</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={discounts || ""}
                  onChange={(e) => setDiscounts(Number(e.target.value))}
                  className="pl-7"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  data-testid="input-estimate-discounts"
                />
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold">Total Price</Label>
              <span className="text-lg font-bold text-green-500" data-testid="text-estimate-total">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Deposit $</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={depositAmount || ""}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="pl-7"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    data-testid="input-deposit-amount"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Check #</Label>
                <Input
                  value={depositCheckNumber}
                  onChange={(e) => setDepositCheckNumber(e.target.value)}
                  placeholder="Check number"
                  data-testid="input-deposit-check"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Balance $</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={balanceAmount.toFixed(2)}
                    disabled
                    className="pl-7"
                    data-testid="input-balance-amount"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Check #</Label>
                <Input
                  value={balanceCheckNumber}
                  onChange={(e) => setBalanceCheckNumber(e.target.value)}
                  placeholder="Check number"
                  data-testid="input-balance-check"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <p className="text-xs font-semibold">{COMPLETION_TEXT}</p>
          <SignatureCanvas
            onSignatureChange={setCompletionSignature}
            label="Customer Completion Signature"
            height={100}
          />
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-[11px] text-center text-muted-foreground">See back for Terms and Conditions</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={saveQuoteMutation.isPending || (!currentJobId && !selectedJobId)}
          data-testid="button-save-estimate"
        >
          {saveQuoteMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Draft
        </Button>
        <Button
          variant="outline"
          onClick={handlePrintPDF}
          disabled={!name || price <= 0}
          data-testid="button-print-estimate"
        >
          <Download className="w-4 h-4 mr-2" />
          Print / PDF
        </Button>
        <Button
          onClick={handleSend}
          disabled={!name || price <= 0 || saveQuoteMutation.isPending || (!currentJobId && !selectedJobId)}
          data-testid="button-send-estimate"
        >
          {saveQuoteMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Send Estimate
        </Button>
      </div>
    </div>
  );
}