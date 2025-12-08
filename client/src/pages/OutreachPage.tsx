import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Phone,
  Users,
  Target,
  Plus,
  Search,
  Filter,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Megaphone,
  BarChart3,
  Edit,
  Trash2,
  Eye,
  PlayCircle,
  PauseCircle,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: "email" | "call";
  status: "draft" | "scheduled" | "active" | "paused" | "completed";
  targetAudience: string;
  leadCount: number;
  sentCount: number;
  responseCount: number;
  createdAt: string;
  scheduledAt?: string;
}

interface FilteredLead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  status: string;
  lastContact?: string;
  service: string;
  city: string;
}

// todo: remove mock functionality
const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Winter Drain Cleaning Special",
    type: "email",
    status: "active",
    targetAudience: "Previous Customers",
    leadCount: 245,
    sentCount: 198,
    responseCount: 23,
    createdAt: "2025-12-01",
    scheduledAt: "2025-12-05",
  },
  {
    id: "2",
    name: "Follow-up: Lost Leads Q4",
    type: "call",
    status: "scheduled",
    targetAudience: "Lost Leads",
    leadCount: 89,
    sentCount: 0,
    responseCount: 0,
    createdAt: "2025-12-03",
    scheduledAt: "2025-12-10",
  },
  {
    id: "3",
    name: "Holiday Discount Offer",
    type: "email",
    status: "draft",
    targetAudience: "All Leads",
    leadCount: 412,
    sentCount: 0,
    responseCount: 0,
    createdAt: "2025-12-06",
  },
  {
    id: "4",
    name: "Sewer Inspection Reminder",
    type: "email",
    status: "completed",
    targetAudience: "Previous Customers",
    leadCount: 156,
    sentCount: 156,
    responseCount: 34,
    createdAt: "2025-11-15",
    scheduledAt: "2025-11-20",
  },
];

const mockFilteredLeads: FilteredLead[] = [
  { id: "1", name: "Leonard Willis", email: "lwillis@email.com", phone: "708-289-7471", status: "converted", lastContact: "2025-10-15", service: "Sewer Main", city: "Chicago" },
  { id: "2", name: "Chanie Evans", email: "chanieevans@yahoo.com", phone: "773-966-9820", status: "converted", lastContact: "2025-09-22", service: "Flood Control", city: "Chicago" },
  { id: "3", name: "Anthony Cunningham", email: "broantcun@gmail.com", phone: "708-897-6156", status: "lost", lastContact: "2025-11-01", service: "Drain Clog", city: "Harvey" },
  { id: "4", name: "Takala Kelley", phone: "708-872-0048", status: "converted", lastContact: "2025-08-30", service: "Plumbing", city: "Calumet City" },
  { id: "5", name: "Rosevelt Payne", email: "rpayne2552@gmail.com", phone: "331-216-3033", status: "lost", lastContact: "2025-10-28", service: "Plumbing", city: "Oswego" },
  { id: "6", name: "Melendez Smalley", email: "melendez12@gmail.com", phone: "773-891-8323", status: "converted", lastContact: "2025-07-14", service: "Sewer Main", city: "Chicago" },
  { id: "7", name: "Maria Santos", email: "msantos@email.com", phone: "312-555-0123", status: "lost", lastContact: "2025-11-10", service: "Drain Cleaning", city: "Chicago" },
  { id: "8", name: "James Wilson", email: "jwilson@gmail.com", phone: "708-555-0456", status: "converted", lastContact: "2025-06-20", service: "Sewer Repair", city: "Oak Park" },
];

const emailTemplates = [
  { id: "1", name: "Seasonal Discount", subject: "Exclusive Winter Savings for Our Valued Customers" },
  { id: "2", name: "Follow-up Reminder", subject: "We'd Love to Help with Your Plumbing Needs" },
  { id: "3", name: "Service Reminder", subject: "Time for Your Annual Sewer Inspection" },
  { id: "4", name: "Re-engagement", subject: "We Miss You! Special Offer Inside" },
];

export default function OutreachPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  
  // Campaign builder state
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "email" as "email" | "call",
    targetAudience: "all",
    status: "new",
    service: "all",
    city: "all",
    dateRange: "all",
    emailTemplate: "",
    emailSubject: "",
    emailBody: "",
    callScript: "",
    scheduleType: "immediate",
    scheduledDate: "",
    scheduledTime: "",
  });

  const getStatusColor = (status: Campaign["status"]) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "scheduled": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "paused": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: Campaign["status"]) => {
    switch (status) {
      case "active": return <PlayCircle className="w-4 h-4" />;
      case "scheduled": return <Clock className="w-4 h-4" />;
      case "paused": return <PauseCircle className="w-4 h-4" />;
      case "completed": return <CheckCircle2 className="w-4 h-4" />;
      default: return <Edit className="w-4 h-4" />;
    }
  };

  const filteredLeads = mockFilteredLeads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);
    
    const matchesAudience = campaignForm.targetAudience === "all" ||
      (campaignForm.targetAudience === "previous" && lead.status === "converted") ||
      (campaignForm.targetAudience === "lost" && lead.status === "lost");
    
    const matchesService = campaignForm.service === "all" || 
      lead.service.toLowerCase().includes(campaignForm.service.toLowerCase());
    
    const matchesCity = campaignForm.city === "all" || 
      lead.city.toLowerCase() === campaignForm.city.toLowerCase();

    return matchesSearch && matchesAudience && matchesService && matchesCity;
  });

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleCreateCampaign = () => {
    // Validation
    if (!campaignForm.name.trim()) {
      toast({ title: "Campaign name required", description: "Please enter a name for your campaign.", variant: "destructive" });
      return;
    }
    if (selectedLeads.length === 0) {
      toast({ title: "No leads selected", description: "Please select at least one lead for your campaign.", variant: "destructive" });
      return;
    }
    if (campaignForm.type === "email" && !campaignForm.emailSubject.trim()) {
      toast({ title: "Email subject required", description: "Please enter a subject line for your email.", variant: "destructive" });
      return;
    }
    if (campaignForm.scheduleType === "scheduled" && (!campaignForm.scheduledDate || !campaignForm.scheduledTime)) {
      toast({ title: "Schedule required", description: "Please select a date and time for your scheduled campaign.", variant: "destructive" });
      return;
    }

    // Create new campaign
    const audienceLabel = campaignForm.targetAudience === "previous" ? "Previous Customers" :
                          campaignForm.targetAudience === "lost" ? "Lost Leads" : "All Leads";
    
    const newCampaign: Campaign = {
      id: String(Date.now()),
      name: campaignForm.name,
      type: campaignForm.type,
      status: campaignForm.scheduleType === "draft" ? "draft" :
              campaignForm.scheduleType === "scheduled" ? "scheduled" : "active",
      targetAudience: audienceLabel,
      leadCount: selectedLeads.length,
      sentCount: campaignForm.scheduleType === "immediate" ? selectedLeads.length : 0,
      responseCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledAt: campaignForm.scheduleType === "scheduled" ? campaignForm.scheduledDate : undefined,
    };

    setCampaigns(prev => [newCampaign, ...prev]);
    setShowCampaignBuilder(false);
    
    const actionLabel = campaignForm.scheduleType === "draft" ? "saved as draft" :
                        campaignForm.scheduleType === "scheduled" ? "scheduled" : "launched";
    
    toast({
      title: `Campaign ${actionLabel}`,
      description: `"${campaignForm.name}" targeting ${selectedLeads.length} leads has been ${actionLabel}.`,
    });

    // Reset form
    setCampaignForm({
      name: "",
      type: "email",
      targetAudience: "all",
      status: "new",
      service: "all",
      city: "all",
      dateRange: "all",
      emailTemplate: "",
      emailSubject: "",
      emailBody: "",
      callScript: "",
      scheduleType: "immediate",
      scheduledDate: "",
      scheduledTime: "",
    });
    setSelectedLeads([]);
  };

  const kpiCards = [
    { title: "Active Campaigns", value: "2", icon: Megaphone, change: "+1 this week" },
    { title: "Total Reach", value: "645", icon: Users, change: "Across all campaigns" },
    { title: "Response Rate", value: "14.2%", icon: Target, change: "+2.1% vs last month" },
    { title: "Scheduled", value: "3", icon: Calendar, change: "Next 7 days" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Outreach</h1>
          <p className="text-muted-foreground">
            Design campaigns and reconnect with previous and lost customers
          </p>
        </div>
        <Button onClick={() => setShowCampaignBuilder(true)} data-testid="button-new-campaign">
          <Plus className="w-4 h-4 mr-2" />
          Build Campaign
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.change}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <Megaphone className="w-4 h-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-outreach-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign History</CardTitle>
              <CardDescription>View and manage all your outreach campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                    <TableHead className="text-right">Responses</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {campaign.createdAt}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {campaign.type === "email" ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                          {campaign.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.targetAudience}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${getStatusColor(campaign.status)}`}>
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.sentCount} / {campaign.leadCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.responseCount}
                        {campaign.sentCount > 0 && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({Math.round((campaign.responseCount / campaign.sentCount) * 100)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowPreview(true);
                            }}
                            data-testid={`button-view-campaign-${campaign.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {campaign.status === "draft" && (
                            <Button size="icon" variant="ghost" data-testid={`button-edit-campaign-${campaign.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {campaign.status === "draft" && (
                            <Button size="icon" variant="ghost" data-testid={`button-delete-campaign-${campaign.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Email Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sent</span>
                    <span className="font-medium">354</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Opened</span>
                    <span className="font-medium">198 (56%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Clicked</span>
                    <span className="font-medium">67 (19%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Responded</span>
                    <span className="font-medium">57 (16%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Converted</span>
                    <span className="font-medium text-green-500">12 (3.4%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Scheduled</span>
                    <span className="font-medium">89</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed</span>
                    <span className="font-medium">72 (81%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Answered</span>
                    <span className="font-medium">48 (67%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Interested</span>
                    <span className="font-medium">18 (25%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Converted</span>
                    <span className="font-medium text-green-500">8 (11%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Campaign Builder Dialog */}
      <Dialog open={showCampaignBuilder} onOpenChange={setShowCampaignBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Build a Campaign
            </DialogTitle>
            <DialogDescription>
              Create targeted email or call campaigns to reconnect with customers
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Step 1: Campaign Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</div>
                  Campaign Details
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 pl-8">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      placeholder="e.g., Winter Drain Cleaning Special"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      data-testid="input-campaign-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Campaign Type</Label>
                    <Select
                      value={campaignForm.type}
                      onValueChange={(value: "email" | "call") => setCampaignForm({ ...campaignForm, type: value })}
                    >
                      <SelectTrigger data-testid="select-campaign-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email Campaign
                          </div>
                        </SelectItem>
                        <SelectItem value="call">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Call Campaign
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 2: Target Audience */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</div>
                  Target Audience
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pl-8">
                  <div className="space-y-2">
                    <Label>Audience Type</Label>
                    <Select
                      value={campaignForm.targetAudience}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, targetAudience: value })}
                    >
                      <SelectTrigger data-testid="select-target-audience">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        <SelectItem value="previous">Previous Customers</SelectItem>
                        <SelectItem value="lost">Lost Leads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <Select
                      value={campaignForm.service}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, service: value })}
                    >
                      <SelectTrigger data-testid="select-service-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        <SelectItem value="sewer">Sewer Main</SelectItem>
                        <SelectItem value="drain">Drain Cleaning</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="flood">Flood Control</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select
                      value={campaignForm.city}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, city: value })}
                    >
                      <SelectTrigger data-testid="select-city-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        <SelectItem value="chicago">Chicago</SelectItem>
                        <SelectItem value="harvey">Harvey</SelectItem>
                        <SelectItem value="calumet city">Calumet City</SelectItem>
                        <SelectItem value="oak park">Oak Park</SelectItem>
                        <SelectItem value="oswego">Oswego</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Contact</Label>
                    <Select
                      value={campaignForm.dateRange}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, dateRange: value })}
                    >
                      <SelectTrigger data-testid="select-date-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Time</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 90 Days</SelectItem>
                        <SelectItem value="180">Last 6 Months</SelectItem>
                        <SelectItem value="365">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filtered Leads Preview */}
                <div className="pl-8 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Selected Leads</Label>
                      <Badge variant="secondary">{selectedLeads.length} of {filteredLeads.length}</Badge>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-leads"
                      />
                    </div>
                  </div>
                  
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                              onCheckedChange={handleSelectAll}
                              data-testid="checkbox-select-all"
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Last Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.slice(0, 5).map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => handleSelectLead(lead.id)}
                                data-testid={`checkbox-lead-${lead.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {lead.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</div>}
                                <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" /> {lead.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>{lead.service}</TableCell>
                            <TableCell>{lead.city}</TableCell>
                            <TableCell className="text-muted-foreground">{lead.lastContact}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredLeads.length > 5 && (
                      <div className="p-2 text-center text-sm text-muted-foreground border-t">
                        +{filteredLeads.length - 5} more leads matching your criteria
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 3: Content */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</div>
                  {campaignForm.type === "email" ? "Email Content" : "Call Script"}
                </div>
                
                <div className="pl-8 space-y-4">
                  {campaignForm.type === "email" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Email Template (Optional)</Label>
                        <Select
                          value={campaignForm.emailTemplate}
                          onValueChange={(value) => {
                            const template = emailTemplates.find(t => t.id === value);
                            setCampaignForm({
                              ...campaignForm,
                              emailTemplate: value,
                              emailSubject: template?.subject || campaignForm.emailSubject,
                            });
                          }}
                        >
                          <SelectTrigger data-testid="select-email-template">
                            <SelectValue placeholder="Select a template or write custom" />
                          </SelectTrigger>
                          <SelectContent>
                            {emailTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-subject">Subject Line</Label>
                        <Input
                          id="email-subject"
                          placeholder="Enter email subject..."
                          value={campaignForm.emailSubject}
                          onChange={(e) => setCampaignForm({ ...campaignForm, emailSubject: e.target.value })}
                          data-testid="input-email-subject"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-body">Email Body</Label>
                        <Textarea
                          id="email-body"
                          placeholder="Write your email content here... Use {{name}} for personalization."
                          value={campaignForm.emailBody}
                          onChange={(e) => setCampaignForm({ ...campaignForm, emailBody: e.target.value })}
                          className="min-h-[150px]"
                          data-testid="textarea-email-body"
                        />
                        <p className="text-xs text-muted-foreground">
                          Available variables: {"{{name}}"}, {"{{service}}"}, {"{{city}}"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="call-script">Call Script</Label>
                      <Textarea
                        id="call-script"
                        placeholder="Write your call script here... This will be shown to technicians making follow-up calls."
                        value={campaignForm.callScript}
                        onChange={(e) => setCampaignForm({ ...campaignForm, callScript: e.target.value })}
                        className="min-h-[200px]"
                        data-testid="textarea-call-script"
                      />
                      <p className="text-xs text-muted-foreground">
                        This script will guide technicians during follow-up calls
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Step 4: Schedule */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">4</div>
                  Schedule
                </div>
                
                <div className="pl-8 space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="schedule"
                        value="immediate"
                        checked={campaignForm.scheduleType === "immediate"}
                        onChange={() => setCampaignForm({ ...campaignForm, scheduleType: "immediate" })}
                        className="w-4 h-4"
                        data-testid="radio-immediate"
                      />
                      <span>Send Immediately</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="schedule"
                        value="scheduled"
                        checked={campaignForm.scheduleType === "scheduled"}
                        onChange={() => setCampaignForm({ ...campaignForm, scheduleType: "scheduled" })}
                        className="w-4 h-4"
                        data-testid="radio-scheduled"
                      />
                      <span>Schedule for Later</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="schedule"
                        value="draft"
                        checked={campaignForm.scheduleType === "draft"}
                        onChange={() => setCampaignForm({ ...campaignForm, scheduleType: "draft" })}
                        className="w-4 h-4"
                        data-testid="radio-draft"
                      />
                      <span>Save as Draft</span>
                    </label>
                  </div>

                  {campaignForm.scheduleType === "scheduled" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="schedule-date">Date</Label>
                        <Input
                          id="schedule-date"
                          type="date"
                          value={campaignForm.scheduledDate}
                          onChange={(e) => setCampaignForm({ ...campaignForm, scheduledDate: e.target.value })}
                          data-testid="input-schedule-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schedule-time">Time</Label>
                        <Input
                          id="schedule-time"
                          type="time"
                          value={campaignForm.scheduledTime}
                          onChange={(e) => setCampaignForm({ ...campaignForm, scheduledTime: e.target.value })}
                          data-testid="input-schedule-time"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4 gap-2">
            <Button variant="outline" onClick={() => setShowCampaignBuilder(false)} data-testid="button-cancel-campaign">
              Cancel
            </Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={!campaignForm.name || selectedLeads.length === 0}
              data-testid="button-create-campaign"
            >
              {campaignForm.scheduleType === "draft" ? "Save Draft" : 
               campaignForm.scheduleType === "scheduled" ? "Schedule Campaign" : "Launch Campaign"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedCampaign.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="gap-1">
                      {selectedCampaign.type === "email" ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                      {selectedCampaign.type}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(selectedCampaign.status)}>
                      {selectedCampaign.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Target Audience</p>
                  <p className="font-medium">{selectedCampaign.targetAudience}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="font-medium">{selectedCampaign.leadCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="font-medium">{selectedCampaign.sentCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Responses</p>
                  <p className="font-medium">{selectedCampaign.responseCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{selectedCampaign.createdAt}</p>
                </div>
                {selectedCampaign.scheduledAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="font-medium">{selectedCampaign.scheduledAt}</p>
                  </div>
                )}
              </div>

              {selectedCampaign.status === "active" && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Pause Campaign
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
