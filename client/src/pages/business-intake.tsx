import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, User, Globe, Workflow, Users, Zap, CheckCircle, Plus, Trash2 } from "lucide-react";

const staffMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "dispatcher", "technician", "salesperson", "owner", "office_manager"]),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email required"),
  hourlyRate: z.number().optional(),
  commissionRate: z.number().optional(),
  specialPrivileges: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const intakeFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.string().optional(),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerPhone: z.string().min(10, "Valid phone number required"),
  ownerEmail: z.string().email("Valid email required"),
  businessAddress: z.string().optional(),
  serviceArea: z.string().optional(),
  yearsInBusiness: z.number().optional(),
  currentWebsite: z.string().optional(),
  domainHost: z.string().optional(),
  domainRegistrar: z.string().optional(),
  hasGoogleBusiness: z.boolean().optional(),
  socialMediaLinks: z.string().optional(),
  currentWorkflow: z.string().optional(),
  painPoints: z.string().optional(),
  leadResponseTime: z.string().optional(),
  schedulingMethod: z.string().optional(),
  invoicingMethod: z.string().optional(),
  desiredWorkflow: z.string().optional(),
  automationGoals: z.string().optional(),
  priorityFeatures: z.string().optional(),
  currentLeadSources: z.string().optional(),
  desiredLeadSources: z.string().optional(),
  monthlyLeadBudget: z.string().optional(),
  averageJobValue: z.string().optional(),
  autoContactEnabled: z.boolean().optional(),
  autoContactMethod: z.string().optional(),
  autoContactDelay: z.number().optional(),
  appointmentReminders: z.boolean().optional(),
  reminderTiming: z.string().optional(),
  followUpEnabled: z.boolean().optional(),
  followUpSchedule: z.string().optional(),
  nurturingStrategy: z.string().optional(),
});

type IntakeFormData = z.infer<typeof intakeFormSchema>;

interface StaffMember {
  name: string;
  role: "admin" | "dispatcher" | "technician" | "salesperson" | "owner" | "office_manager";
  phone: string;
  email: string;
  hourlyRate?: number;
  commissionRate?: number;
  specialPrivileges?: string[];
  notes?: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  dispatcher: "Dispatcher",
  technician: "Technician",
  salesperson: "Salesperson",
  owner: "Owner",
  office_manager: "Office Manager",
};

export default function BusinessIntakePage() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [newStaff, setNewStaff] = useState<Partial<StaffMember>>({});
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      autoContactEnabled: true,
      appointmentReminders: true,
      followUpEnabled: true,
      hasGoogleBusiness: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: IntakeFormData) => {
      const payload = {
        ...data,
        monthlyLeadBudget: data.monthlyLeadBudget ? parseFloat(data.monthlyLeadBudget) : undefined,
        averageJobValue: data.averageJobValue ? parseFloat(data.averageJobValue) : undefined,
        staffMembers: JSON.stringify(staffMembers),
      };
      return apiRequest("/api/business-intake", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Form Submitted",
        description: "Thank you! We'll be in touch shortly to discuss your onboarding.",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const addStaffMember = () => {
    if (newStaff.name && newStaff.role && newStaff.phone && newStaff.email) {
      setStaffMembers([...staffMembers, newStaff as StaffMember]);
      setNewStaff({});
    }
  };

  const removeStaffMember = (index: number) => {
    setStaffMembers(staffMembers.filter((_, i) => i !== index));
  };

  const onSubmit = (data: IntakeFormData) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
            <p className="text-muted-foreground mb-4">
              Your intake form has been submitted successfully. Our team will review your information and contact you within 24-48 hours to discuss your onboarding.
            </p>
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to our team.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = [
    { num: 1, label: "Business Info", icon: Building2 },
    { num: 2, label: "Web & Domain", icon: Globe },
    { num: 3, label: "Current Workflow", icon: Workflow },
    { num: 4, label: "Staff & Roles", icon: Users },
    { num: 5, label: "Automation", icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Business Onboarding Intake</h1>
          <p className="text-muted-foreground">
            Complete this form to help us understand your business and set up your CRM
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {steps.map((step) => (
            <Button
              key={step.num}
              variant={currentStep === step.num ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentStep(step.num)}
              className="gap-2"
              data-testid={`step-${step.num}`}
            >
              <step.icon className="w-4 h-4" />
              {step.label}
            </Button>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Information
                </CardTitle>
                <CardDescription>Tell us about your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      {...form.register("businessName")}
                      placeholder="ABC Plumbing & Sewer"
                      data-testid="input-business-name"
                    />
                    {form.formState.errors.businessName && (
                      <p className="text-sm text-destructive">{form.formState.errors.businessName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select
                      onValueChange={(value) => form.setValue("businessType", value)}
                      data-testid="select-business-type"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="sewer">Sewer & Drain</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="general_contractor">General Contractor</SelectItem>
                        <SelectItem value="roofing">Roofing</SelectItem>
                        <SelectItem value="landscaping">Landscaping</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Owner Name *</Label>
                    <Input
                      id="ownerName"
                      {...form.register("ownerName")}
                      placeholder="John Smith"
                      data-testid="input-owner-name"
                    />
                    {form.formState.errors.ownerName && (
                      <p className="text-sm text-destructive">{form.formState.errors.ownerName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone">Owner Phone *</Label>
                    <Input
                      id="ownerPhone"
                      {...form.register("ownerPhone")}
                      placeholder="(312) 555-1234"
                      data-testid="input-owner-phone"
                    />
                    {form.formState.errors.ownerPhone && (
                      <p className="text-sm text-destructive">{form.formState.errors.ownerPhone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Owner Email *</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      {...form.register("ownerEmail")}
                      placeholder="john@abcplumbing.com"
                      data-testid="input-owner-email"
                    />
                    {form.formState.errors.ownerEmail && (
                      <p className="text-sm text-destructive">{form.formState.errors.ownerEmail.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearsInBusiness">Years in Business</Label>
                    <Input
                      id="yearsInBusiness"
                      type="number"
                      {...form.register("yearsInBusiness", { valueAsNumber: true })}
                      placeholder="10"
                      data-testid="input-years"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input
                    id="businessAddress"
                    {...form.register("businessAddress")}
                    placeholder="123 Main St, Chicago, IL 60601"
                    data-testid="input-address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceArea">Service Area</Label>
                  <Textarea
                    id="serviceArea"
                    {...form.register("serviceArea")}
                    placeholder="Chicago metro area, Northwest suburbs..."
                    className="resize-none"
                    data-testid="input-service-area"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Web & Domain Information
                </CardTitle>
                <CardDescription>Your online presence and hosting details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentWebsite">Current Website</Label>
                    <Input
                      id="currentWebsite"
                      {...form.register("currentWebsite")}
                      placeholder="https://abcplumbing.com"
                      data-testid="input-website"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domainHost">Domain Host</Label>
                    <Select
                      onValueChange={(value) => form.setValue("domainHost", value)}
                      data-testid="select-domain-host"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select host" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="godaddy">GoDaddy</SelectItem>
                        <SelectItem value="namecheap">Namecheap</SelectItem>
                        <SelectItem value="google">Google Domains</SelectItem>
                        <SelectItem value="cloudflare">Cloudflare</SelectItem>
                        <SelectItem value="squarespace">Squarespace</SelectItem>
                        <SelectItem value="wix">Wix</SelectItem>
                        <SelectItem value="unknown">Don't Know</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domainRegistrar">Domain Registrar (if different from host)</Label>
                  <Input
                    id="domainRegistrar"
                    {...form.register("domainRegistrar")}
                    placeholder="e.g., Network Solutions"
                    data-testid="input-registrar"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="hasGoogleBusiness"
                    checked={form.watch("hasGoogleBusiness")}
                    onCheckedChange={(checked) => form.setValue("hasGoogleBusiness", checked)}
                    data-testid="switch-google-business"
                  />
                  <Label htmlFor="hasGoogleBusiness">I have a Google Business Profile</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialMediaLinks">Social Media Links</Label>
                  <Textarea
                    id="socialMediaLinks"
                    {...form.register("socialMediaLinks")}
                    placeholder="Facebook: facebook.com/abcplumbing&#10;Instagram: @abcplumbing&#10;LinkedIn: ..."
                    className="resize-none"
                    rows={4}
                    data-testid="input-social-media"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="w-5 h-5" />
                  Current & Desired Workflow
                </CardTitle>
                <CardDescription>Help us understand how you work today and what you want to achieve</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentWorkflow">Describe Your Current Workflow</Label>
                  <Textarea
                    id="currentWorkflow"
                    {...form.register("currentWorkflow")}
                    placeholder="How do leads come in? How are they assigned? How do you schedule jobs? How do you invoice?"
                    className="resize-none"
                    rows={4}
                    data-testid="input-current-workflow"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="painPoints">Current Pain Points</Label>
                  <Textarea
                    id="painPoints"
                    {...form.register("painPoints")}
                    placeholder="What challenges do you face? Missed leads? Slow response times? Manual processes?"
                    className="resize-none"
                    rows={3}
                    data-testid="input-pain-points"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leadResponseTime">Current Lead Response Time</Label>
                    <Select
                      onValueChange={(value) => form.setValue("leadResponseTime", value)}
                      data-testid="select-response-time"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select response time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_5min">Under 5 minutes</SelectItem>
                        <SelectItem value="5_15min">5-15 minutes</SelectItem>
                        <SelectItem value="15_30min">15-30 minutes</SelectItem>
                        <SelectItem value="30min_1hr">30 min - 1 hour</SelectItem>
                        <SelectItem value="1_4hr">1-4 hours</SelectItem>
                        <SelectItem value="over_4hr">Over 4 hours</SelectItem>
                        <SelectItem value="next_day">Next business day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedulingMethod">Scheduling Method</Label>
                    <Select
                      onValueChange={(value) => form.setValue("schedulingMethod", value)}
                      data-testid="select-scheduling"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone_only">Phone calls only</SelectItem>
                        <SelectItem value="paper_calendar">Paper calendar</SelectItem>
                        <SelectItem value="google_calendar">Google Calendar</SelectItem>
                        <SelectItem value="outlook">Outlook</SelectItem>
                        <SelectItem value="software">Scheduling software</SelectItem>
                        <SelectItem value="mixed">Mix of methods</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoicingMethod">Invoicing Method</Label>
                  <Select
                    onValueChange={(value) => form.setValue("invoicingMethod", value)}
                    data-testid="select-invoicing"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quickbooks">QuickBooks</SelectItem>
                      <SelectItem value="freshbooks">FreshBooks</SelectItem>
                      <SelectItem value="wave">Wave</SelectItem>
                      <SelectItem value="paper">Paper invoices</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="other">Other software</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="desiredWorkflow">Desired Workflow</Label>
                  <Textarea
                    id="desiredWorkflow"
                    {...form.register("desiredWorkflow")}
                    placeholder="What would your ideal workflow look like? What do you want automated?"
                    className="resize-none"
                    rows={4}
                    data-testid="input-desired-workflow"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priorityFeatures">Priority Features (Most Important)</Label>
                  <Textarea
                    id="priorityFeatures"
                    {...form.register("priorityFeatures")}
                    placeholder="What features are most important to you? Lead tracking, GPS, quotes, etc."
                    className="resize-none"
                    rows={3}
                    data-testid="input-priority-features"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentLeadSources">Current Lead Sources</Label>
                    <Textarea
                      id="currentLeadSources"
                      {...form.register("currentLeadSources")}
                      placeholder="eLocal, Networx, Google Ads, Referrals..."
                      className="resize-none"
                      rows={2}
                      data-testid="input-current-lead-sources"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desiredLeadSources">Lead Sources to Connect</Label>
                    <Textarea
                      id="desiredLeadSources"
                      {...form.register("desiredLeadSources")}
                      placeholder="Which lead agencies should we integrate?"
                      className="resize-none"
                      rows={2}
                      data-testid="input-desired-lead-sources"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyLeadBudget">Monthly Lead Budget</Label>
                    <Input
                      id="monthlyLeadBudget"
                      type="number"
                      {...form.register("monthlyLeadBudget")}
                      placeholder="2000"
                      data-testid="input-lead-budget"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="averageJobValue">Average Job Value ($)</Label>
                    <Input
                      id="averageJobValue"
                      type="number"
                      {...form.register("averageJobValue")}
                      placeholder="1500"
                      data-testid="input-job-value"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staff & Roles
                </CardTitle>
                <CardDescription>Add your team members who will use the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {staffMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Added Staff Members</Label>
                    <div className="space-y-2">
                      {staffMembers.map((member, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-3 flex-wrap">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{member.name}</span>
                            <Badge variant="secondary">{roleLabels[member.role]}</Badge>
                            <span className="text-sm text-muted-foreground">{member.email}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStaffMember(index)}
                            data-testid={`button-remove-staff-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <Label>Add New Staff Member</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Full Name"
                      value={newStaff.name || ""}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      data-testid="input-new-staff-name"
                    />
                    <Select
                      value={newStaff.role}
                      onValueChange={(value: StaffMember["role"]) => setNewStaff({ ...newStaff, role: value })}
                    >
                      <SelectTrigger data-testid="select-new-staff-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="office_manager">Office Manager</SelectItem>
                        <SelectItem value="dispatcher">Dispatcher</SelectItem>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="salesperson">Salesperson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Phone"
                      value={newStaff.phone || ""}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      data-testid="input-new-staff-phone"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newStaff.email || ""}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      data-testid="input-new-staff-email"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Hourly Rate (optional)"
                      type="number"
                      value={newStaff.hourlyRate || ""}
                      onChange={(e) => setNewStaff({ ...newStaff, hourlyRate: parseFloat(e.target.value) || undefined })}
                      data-testid="input-new-staff-hourly"
                    />
                    <Input
                      placeholder="Commission Rate % (e.g., 15)"
                      type="number"
                      value={newStaff.commissionRate ? newStaff.commissionRate * 100 : ""}
                      onChange={(e) => setNewStaff({ ...newStaff, commissionRate: parseFloat(e.target.value) / 100 || undefined })}
                      data-testid="input-new-staff-commission"
                    />
                  </div>
                  <Textarea
                    placeholder="Notes or special privileges (optional)"
                    value={newStaff.notes || ""}
                    onChange={(e) => setNewStaff({ ...newStaff, notes: e.target.value })}
                    className="resize-none"
                    rows={2}
                    data-testid="input-new-staff-notes"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addStaffMember}
                    disabled={!newStaff.name || !newStaff.role || !newStaff.phone || !newStaff.email}
                    className="gap-2"
                    data-testid="button-add-staff"
                  >
                    <Plus className="w-4 h-4" />
                    Add Staff Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Automation Preferences
                </CardTitle>
                <CardDescription>Configure how you want leads and appointments handled automatically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Contact New Leads</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically send acknowledgment when leads arrive
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("autoContactEnabled")}
                      onCheckedChange={(checked) => form.setValue("autoContactEnabled", checked)}
                      data-testid="switch-auto-contact"
                    />
                  </div>

                  {form.watch("autoContactEnabled") && (
                    <div className="ml-4 space-y-4 border-l-2 pl-4">
                      <div className="space-y-2">
                        <Label>Contact Method</Label>
                        <Select
                          onValueChange={(value) => form.setValue("autoContactMethod", value)}
                          data-testid="select-contact-method"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email only</SelectItem>
                            <SelectItem value="sms">SMS only</SelectItem>
                            <SelectItem value="both">Both Email & SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="autoContactDelay">Delay Before Sending (minutes)</Label>
                        <Input
                          id="autoContactDelay"
                          type="number"
                          {...form.register("autoContactDelay", { valueAsNumber: true })}
                          placeholder="0"
                          data-testid="input-contact-delay"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Send reminders before scheduled appointments
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("appointmentReminders")}
                      onCheckedChange={(checked) => form.setValue("appointmentReminders", checked)}
                      data-testid="switch-reminders"
                    />
                  </div>

                  {form.watch("appointmentReminders") && (
                    <div className="ml-4 border-l-2 pl-4">
                      <div className="space-y-2">
                        <Label>Reminder Timing</Label>
                        <Select
                          onValueChange={(value) => form.setValue("reminderTiming", value)}
                          data-testid="select-reminder-timing"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timing" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24h">24 hours before</SelectItem>
                            <SelectItem value="2h">2 hours before</SelectItem>
                            <SelectItem value="both">Both 24h and 2h before</SelectItem>
                            <SelectItem value="1h">1 hour before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Follow-Up Automation</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically follow up on quotes and leads
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("followUpEnabled")}
                      onCheckedChange={(checked) => form.setValue("followUpEnabled", checked)}
                      data-testid="switch-follow-up"
                    />
                  </div>

                  {form.watch("followUpEnabled") && (
                    <div className="ml-4 space-y-4 border-l-2 pl-4">
                      <div className="space-y-2">
                        <Label htmlFor="followUpSchedule">Follow-Up Schedule</Label>
                        <Textarea
                          id="followUpSchedule"
                          {...form.register("followUpSchedule")}
                          placeholder="e.g., Day 1: Email, Day 3: Call, Day 7: Final email"
                          className="resize-none"
                          rows={2}
                          data-testid="input-follow-up-schedule"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="nurturingStrategy">Lead Nurturing Strategy</Label>
                  <Textarea
                    id="nurturingStrategy"
                    {...form.register("nurturingStrategy")}
                    placeholder="How would you like to nurture leads that don't convert immediately? Drip campaigns, seasonal offers, etc."
                    className="resize-none"
                    rows={3}
                    data-testid="input-nurturing-strategy"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="automationGoals">Additional Automation Goals</Label>
                  <Textarea
                    id="automationGoals"
                    {...form.register("automationGoals")}
                    placeholder="Any other automations you'd like to implement?"
                    className="resize-none"
                    rows={3}
                    data-testid="input-automation-goals"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap justify-between gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              data-testid="button-previous"
            >
              Previous
            </Button>

            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                data-testid="button-next"
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Intake Form"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}