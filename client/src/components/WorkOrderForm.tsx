import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import SignatureCanvas from "@/components/SignatureCanvas";
import {
  FileText,
  Save,
  Send,
  CheckCircle,
  Loader2,
  Phone,
  MapPin,
  Mail,
  Calendar,
  DollarSign,
  CreditCard,
  Shield,
  Wrench,
} from "lucide-react";
import type { WorkOrder, Job } from "@shared/schema";
import { format } from "date-fns";

interface WorkOrderFormProps {
  jobId: string;
  technicianId: string;
  technicianName: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  city?: string;
  zip?: string;
}

export default function WorkOrderForm({
  jobId,
  technicianId,
  technicianName,
  customerName = "",
  customerPhone = "",
  customerEmail = "",
  address = "",
  city = "",
  zip = "",
}: WorkOrderFormProps) {
  const { toast } = useToast();

  const { data: existingOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders", { jobId }],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders?jobId=${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch work orders");
      return res.json();
    },
  });

  const existingOrder = existingOrders[0];

  const [formData, setFormData] = useState({
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: customerEmail,
    address: address,
    city: city,
    state: "IL",
    zip: zip,
    datePromised: "",
    serviceDate: format(new Date(), "yyyy-MM-dd"),
    workDescription: "",
    warrantyYears: "1",
    price: "",
    discounts: "",
    totalPrice: "",
    depositAmount: "",
    depositCheckNumber: "",
    balanceAmount: "",
    balanceCheckNumber: "",
    paymentMethod: "",
    cardLast4: "",
    cardExpiration: "",
    cardholderName: "",
    serviceTechName: technicianName,
    customerPrintName: "",
    authorizationAccepted: false,
    rightToCancelAccepted: false,
    completionAcknowledged: false,
  });

  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [cardholderSignature, setCardholderSignature] = useState<string | null>(null);
  const [completionSignature, setCompletionSignature] = useState<string | null>(null);

  useEffect(() => {
    if (existingOrder) {
      setFormData({
        customerName: existingOrder.customerName || customerName,
        customerPhone: existingOrder.customerPhone || customerPhone,
        customerEmail: existingOrder.customerEmail || customerEmail,
        address: existingOrder.address || address,
        city: existingOrder.city || city,
        state: existingOrder.state || "IL",
        zip: existingOrder.zip || zip,
        datePromised: existingOrder.datePromised || "",
        serviceDate: existingOrder.serviceDate || format(new Date(), "yyyy-MM-dd"),
        workDescription: existingOrder.workDescription || "",
        warrantyYears: existingOrder.warrantyYears || "1",
        price: existingOrder.price || "",
        discounts: existingOrder.discounts || "",
        totalPrice: existingOrder.totalPrice || "",
        depositAmount: existingOrder.depositAmount || "",
        depositCheckNumber: existingOrder.depositCheckNumber || "",
        balanceAmount: existingOrder.balanceAmount || "",
        balanceCheckNumber: existingOrder.balanceCheckNumber || "",
        paymentMethod: existingOrder.paymentMethod || "",
        cardLast4: existingOrder.cardLast4 || "",
        cardExpiration: existingOrder.cardExpiration || "",
        cardholderName: existingOrder.cardholderName || "",
        serviceTechName: existingOrder.serviceTechName || technicianName,
        customerPrintName: existingOrder.customerPrintName || "",
        authorizationAccepted: existingOrder.authorizationAccepted || false,
        rightToCancelAccepted: existingOrder.rightToCancelAccepted || false,
        completionAcknowledged: existingOrder.completionAcknowledged || false,
      });
      setCustomerSignature(existingOrder.customerSignature || null);
      setCardholderSignature(existingOrder.cardholderSignature || null);
      setCompletionSignature(existingOrder.completionSignature || null);
    }
  }, [existingOrder]);

  useEffect(() => {
    const p = parseFloat(formData.price) || 0;
    const d = parseFloat(formData.discounts) || 0;
    const total = p - d;
    const dep = parseFloat(formData.depositAmount) || 0;
    const balance = total - dep;
    setFormData((prev) => ({
      ...prev,
      totalPrice: total > 0 ? total.toFixed(2) : "",
      balanceAmount: balance > 0 ? balance.toFixed(2) : "",
    }));
  }, [formData.price, formData.discounts, formData.depositAmount]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/work-orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", { jobId }] });
      toast({ title: "Work Order Saved", description: "The work order has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save work order.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/work-orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", { jobId }] });
      toast({ title: "Work Order Updated", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update work order.", variant: "destructive" });
    },
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (status: string = "draft") => {
    const payload = {
      ...formData,
      jobId,
      technicianId,
      status,
      customerSignature,
      cardholderSignature,
      completionSignature,
    };

    if (existingOrder) {
      updateMutation.mutate({ id: existingOrder.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isCompleted = existingOrder?.status === "completed" || existingOrder?.status === "signed";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[70vh]">
      <div className="space-y-6 pr-4">
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold tracking-tight" data-testid="text-company-name">
            EMERGENCY CHICAGO SEWER EXPERTS
          </h2>
          <p className="text-sm text-muted-foreground">7741 Mason Ave. Burbank, IL 60459</p>
          <p className="text-sm text-muted-foreground">312-391-6503</p>
          <p className="text-xs text-muted-foreground">chicagosewerexperts1@gmail.com</p>
          <p className="text-xs font-medium mt-1">LICENSED &middot; BONDED &middot; INSURED</p>
          {existingOrder && (
            <Badge className="mt-2" data-testid="badge-work-order-status">
              {existingOrder.status === "draft" ? "Draft" :
                existingOrder.status === "signed" ? "Signed" :
                existingOrder.status === "completed" ? "Completed" :
                existingOrder.status}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wo-date-promised" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Date Promised
            </Label>
            <Input
              id="wo-date-promised"
              type="date"
              value={formData.datePromised}
              onChange={(e) => handleChange("datePromised", e.target.value)}
              disabled={isCompleted}
              data-testid="input-date-promised"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wo-service-date" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Service Date
            </Label>
            <Input
              id="wo-service-date"
              type="date"
              value={formData.serviceDate}
              onChange={(e) => handleChange("serviceDate", e.target.value)}
              disabled={isCompleted}
              data-testid="input-service-date"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <MapPin className="w-4 h-4" />
            Customer Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wo-customer-name">Name</Label>
              <Input
                id="wo-customer-name"
                value={formData.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                disabled={isCompleted}
                data-testid="input-customer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wo-phone" className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Phone
              </Label>
              <Input
                id="wo-phone"
                value={formData.customerPhone}
                onChange={(e) => handleChange("customerPhone", e.target.value)}
                disabled={isCompleted}
                data-testid="input-customer-phone"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wo-email" className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email
              </Label>
              <Input
                id="wo-email"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleChange("customerEmail", e.target.value)}
                disabled={isCompleted}
                data-testid="input-customer-email"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wo-address">Address</Label>
              <Input
                id="wo-address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                disabled={isCompleted}
                data-testid="input-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wo-city">City</Label>
              <Input
                id="wo-city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                disabled={isCompleted}
                data-testid="input-city"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wo-state">State</Label>
                <Input
                  id="wo-state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  disabled={isCompleted}
                  data-testid="input-state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wo-zip">ZIP</Label>
                <Input
                  id="wo-zip"
                  value={formData.zip}
                  onChange={(e) => handleChange("zip", e.target.value)}
                  disabled={isCompleted}
                  data-testid="input-zip"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            Authorization
          </h3>
          <div className="bg-muted/50 rounded-md p-4 text-sm leading-relaxed">
            <p>
              I authorize Emergency Chicago Sewer Experts to perform the described services and agree to pay the amount indicated. I understand that Emergency Chicago Sewer Experts is not responsible for broken, settled, rusted, deteriorated, or lead pipes, fixtures, or clean outs and any damage resulting from cleaning and repairing such lines. Emergency Chicago Sewer Experts is not responsible for repair or replacement of walls, floors, concrete, or landscaping or work being done unless otherwise stated.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="wo-auth-accepted"
              checked={formData.authorizationAccepted}
              onCheckedChange={(checked) => handleChange("authorizationAccepted", !!checked)}
              disabled={isCompleted}
              data-testid="checkbox-authorization"
            />
            <Label htmlFor="wo-auth-accepted" className="text-sm leading-normal cursor-pointer">
              Customer authorizes the above terms
            </Label>
          </div>

          <div className="bg-muted/50 rounded-md p-4 text-sm leading-relaxed">
            <p>
              <strong>RIGHT TO CANCEL:</strong> You, the consumer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. See the attached Notice of Cancellation for an explanation of this right.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="wo-cancel-accepted"
              checked={formData.rightToCancelAccepted}
              onCheckedChange={(checked) => handleChange("rightToCancelAccepted", !!checked)}
              disabled={isCompleted}
              data-testid="checkbox-right-to-cancel"
            />
            <Label htmlFor="wo-cancel-accepted" className="text-sm leading-normal cursor-pointer">
              Customer acknowledges right to cancel
            </Label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="wo-print-name">Print Name</Label>
              <Input
                id="wo-print-name"
                value={formData.customerPrintName}
                onChange={(e) => handleChange("customerPrintName", e.target.value)}
                disabled={isCompleted}
                data-testid="input-print-name"
              />
            </div>
            <div>
              <SignatureCanvas
                label="Customer Signature"
                onSignatureChange={setCustomerSignature}
                initialSignature={customerSignature}
                disabled={isCompleted}
                height={120}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Wrench className="w-4 h-4" />
            Description of Work to Be Performed
          </h3>
          <Textarea
            value={formData.workDescription}
            onChange={(e) => handleChange("workDescription", e.target.value)}
            placeholder="Describe the work performed..."
            className="min-h-[160px] text-base"
            disabled={isCompleted}
            data-testid="textarea-work-description"
          />
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="wo-warranty">Warranty Period</Label>
              <Select
                value={formData.warrantyYears}
                onValueChange={(val) => handleChange("warrantyYears", val)}
                disabled={isCompleted}
              >
                <SelectTrigger data-testid="select-warranty-years">
                  <SelectValue placeholder="Select warranty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Warranty</SelectItem>
                  <SelectItem value="1">1 Year</SelectItem>
                  <SelectItem value="2">2 Years</SelectItem>
                  <SelectItem value="3">3 Years</SelectItem>
                  <SelectItem value="5">5 Years</SelectItem>
                  <SelectItem value="10">10 Years</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground pb-2">
              against defects in labor materials or workmanship
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              Payment Information
            </h3>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(val) => handleChange("paymentMethod", val)}
                disabled={isCompleted}
              >
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="financing">Financing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.paymentMethod === "credit_card" || formData.paymentMethod === "debit_card") && (
              <div className="space-y-3 bg-muted/30 rounded-md p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  CREDIT CARD AUTHORIZATION AGREEMENT
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I hereby authorize Emergency Chicago Sewer Experts to put through a charge to my credit card. A 4% processing fee will be added to total.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Last 4 Digits</Label>
                    <Input
                      value={formData.cardLast4}
                      onChange={(e) => handleChange("cardLast4", e.target.value.slice(0, 4))}
                      placeholder="1234"
                      maxLength={4}
                      disabled={isCompleted}
                      data-testid="input-card-last4"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Expiration</Label>
                    <Input
                      value={formData.cardExpiration}
                      onChange={(e) => handleChange("cardExpiration", e.target.value)}
                      placeholder="MM/YY"
                      disabled={isCompleted}
                      data-testid="input-card-expiration"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cardholder Name</Label>
                  <Input
                    value={formData.cardholderName}
                    onChange={(e) => handleChange("cardholderName", e.target.value)}
                    disabled={isCompleted}
                    data-testid="input-cardholder-name"
                  />
                </div>
                <SignatureCanvas
                  label="Cardholder Signature"
                  onSignatureChange={setCardholderSignature}
                  initialSignature={cardholderSignature}
                  disabled={isCompleted}
                  height={100}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              Service Summary
            </h3>
            <div className="space-y-2">
              <Label htmlFor="wo-tech-name">Service Tech</Label>
              <Input
                id="wo-tech-name"
                value={formData.serviceTechName}
                onChange={(e) => handleChange("serviceTechName", e.target.value)}
                disabled={isCompleted}
                data-testid="input-service-tech"
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="wo-price">Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="wo-price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    className="pl-8"
                    disabled={isCompleted}
                    data-testid="input-price"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="wo-discounts">Discounts</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="wo-discounts"
                    type="number"
                    step="0.01"
                    value={formData.discounts}
                    onChange={(e) => handleChange("discounts", e.target.value)}
                    className="pl-8"
                    disabled={isCompleted}
                    data-testid="input-discounts"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="wo-total" className="font-semibold">Total Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="wo-total"
                    value={formData.totalPrice}
                    readOnly
                    className="pl-8 font-bold text-lg bg-muted/30"
                    data-testid="input-total-price"
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Deposit</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.depositAmount}
                      onChange={(e) => handleChange("depositAmount", e.target.value)}
                      className="pl-8"
                      disabled={isCompleted}
                      data-testid="input-deposit"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Check #</Label>
                  <Input
                    value={formData.depositCheckNumber}
                    onChange={(e) => handleChange("depositCheckNumber", e.target.value)}
                    disabled={isCompleted}
                    data-testid="input-deposit-check"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Balance</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={formData.balanceAmount}
                      readOnly
                      className="pl-8 font-semibold bg-muted/30"
                      data-testid="input-balance"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Check #</Label>
                  <Input
                    value={formData.balanceCheckNumber}
                    onChange={(e) => handleChange("balanceCheckNumber", e.target.value)}
                    disabled={isCompleted}
                    data-testid="input-balance-check"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <CheckCircle className="w-4 h-4" />
            Completion Acknowledgment
          </h3>
          <div className="bg-muted/50 rounded-md p-4 text-sm leading-relaxed">
            <p>
              COMPLETION: I acknowledge completion of the above described work which has been done to my complete satisfaction.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="wo-completion"
              checked={formData.completionAcknowledged}
              onCheckedChange={(checked) => handleChange("completionAcknowledged", !!checked)}
              disabled={isCompleted}
              data-testid="checkbox-completion"
            />
            <Label htmlFor="wo-completion" className="text-sm leading-normal cursor-pointer">
              Customer acknowledges work completion and satisfaction
            </Label>
          </div>
          <SignatureCanvas
            label="Completion Signature"
            onSignatureChange={setCompletionSignature}
            initialSignature={completionSignature}
            disabled={isCompleted}
            height={120}
          />
        </div>

        {!isCompleted && (
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button
              onClick={() => handleSave("draft")}
              variant="outline"
              disabled={isSaving}
              data-testid="button-save-draft"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave("signed")}
              disabled={isSaving || !customerSignature || !formData.authorizationAccepted}
              data-testid="button-submit-work-order"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Work Order
            </Button>
            {existingOrder && formData.completionAcknowledged && completionSignature && (
              <Button
                onClick={() => handleSave("completed")}
                disabled={isSaving}
                className="bg-emerald-600"
                data-testid="button-complete-work-order"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Mark Completed
              </Button>
            )}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground pb-4">
          See back for Terms and Conditions
        </p>
      </div>
    </ScrollArea>
  );
}
