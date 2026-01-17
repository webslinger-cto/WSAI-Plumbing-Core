import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  DollarSign,
  MapPin,
  Tag,
  UserCheck,
  Repeat,
  TrendingUp,
  Download,
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

interface MasterCustomer {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  source: string | null;
  totalJobs: number;
  completedJobs: number;
  totalRevenue: number;
  totalQuotes: number;
  acceptedQuotes: number;
  totalCalls: number;
  lastServiceDate: string | null;
  lastContactDate: string | null;
  firstContactDate: string | null;
  serviceTypes: string[];
  status: string;
  leadIds: string[];
  jobIds: string[];
  quoteIds: string[];
  tags: string[];
}

interface CustomerListResponse {
  customers: MasterCustomer[];
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    totalRevenue: number;
    avgRevenuePerCustomer: number;
    withEmail: number;
    repeatCustomers: number;
  };
}

// Start with empty campaigns - data comes from API
const initialCampaigns: Campaign[] = [];

const initialFilteredLeads: FilteredLead[] = [];

const emailTemplates = [
  { id: "1", name: "Seasonal Discount", subject: "Exclusive Winter Savings for Our Valued Customers" },
  { id: "2", name: "Follow-up Reminder", subject: "We'd Love to Help with Your Plumbing Needs" },
  { id: "3", name: "Service Reminder", subject: "Time for Your Annual Sewer Inspection" },
  { id: "4", name: "Re-engagement", subject: "We Miss You! Special Offer Inside" },
];

export default function OutreachPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("customers");
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  
  // Customer list state
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerTagFilter, setCustomerTagFilter] = useState("all");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("all");
  const [customerCityFilter, setCustomerCityFilter] = useState("all");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<MasterCustomer | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);

  // Fetch master customer list
  const { data: customerData, isLoading: customersLoading } = useQuery<CustomerListResponse>({
    queryKey: ["/api/customers/master-list"],
  });
  
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

  const filteredLeads = initialFilteredLeads.filter((lead) => {
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

  // Filter customers based on search and filters
  const filteredCustomers = customerData?.customers.filter((customer) => {
    const matchesSearch = !customerSearch || 
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone.includes(customerSearch) ||
      customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.city?.toLowerCase().includes(customerSearch.toLowerCase());
    
    const matchesTag = customerTagFilter === "all" || customer.tags.includes(customerTagFilter);
    const matchesStatus = customerStatusFilter === "all" || customer.status === customerStatusFilter;
    const matchesCity = customerCityFilter === "all" || customer.city?.toLowerCase() === customerCityFilter.toLowerCase();
    
    return matchesSearch && matchesTag && matchesStatus && matchesCity;
  }) || [];

  // Get unique cities from customer data
  const uniqueCities = Array.from(new Set(customerData?.customers.map(c => c.city).filter(Boolean) as string[])).sort();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const handleSelectAllCustomers = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleExportCustomers = () => {
    const dataToExport = selectedCustomers.length > 0 
      ? filteredCustomers.filter(c => selectedCustomers.includes(c.id))
      : filteredCustomers;
    
    const csv = [
      ["Name", "Phone", "Email", "Address", "City", "Status", "Total Jobs", "Total Revenue", "Last Service", "Tags"].join(","),
      ...dataToExport.map(c => [
        `"${c.name}"`,
        c.phone,
        c.email || "",
        `"${c.address || ""}"`,
        c.city || "",
        c.status,
        c.totalJobs,
        c.totalRevenue,
        c.lastServiceDate || "",
        `"${c.tags.join("; ")}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: `Exported ${dataToExport.length} customers` });
  };

  const kpiCards = [
    { title: "Total Customers", value: String(customerData?.summary.totalCustomers || 0), icon: Users, change: `${customerData?.summary.withEmail || 0} with email` },
    { title: "Active Customers", value: String(customerData?.summary.activeCustomers || 0), icon: UserCheck, change: `${customerData?.summary.repeatCustomers || 0} repeat` },
    { title: "Total Revenue", value: formatCurrency(customerData?.summary.totalRevenue || 0), icon: DollarSign, change: "Lifetime value" },
    { title: "Avg Revenue", value: formatCurrency(customerData?.summary.avgRevenuePerCustomer || 0), icon: TrendingUp, change: "Per customer" },
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
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="w-4 h-4 mr-2" />
            Customer List
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <Megaphone className="w-4 h-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-outreach-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Master Customer List Tab */}
        <TabsContent value="customers" className="mt-6 space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-1 flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, email, city..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-customer-search"
                    />
                  </div>
                  <Select value={customerStatusFilter} onValueChange={setCustomerStatusFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="select-customer-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="lead">Leads</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={customerTagFilter} onValueChange={setCustomerTagFilter}>
                    <SelectTrigger className="w-[160px]" data-testid="select-customer-tag">
                      <SelectValue placeholder="Tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      <SelectItem value="high-value">High Value</SelectItem>
                      <SelectItem value="mid-value">Mid Value</SelectItem>
                      <SelectItem value="repeat">Repeat Customer</SelectItem>
                      <SelectItem value="recent">Recent</SelectItem>
                      <SelectItem value="lapsed">Lapsed</SelectItem>
                      <SelectItem value="has-email">Has Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={customerCityFilter} onValueChange={setCustomerCityFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-customer-city">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map(city => (
                        <SelectItem key={city} value={city.toLowerCase()}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportCustomers} data-testid="button-export-customers">
                    <Download className="w-4 h-4 mr-2" />
                    Export {selectedCustomers.length > 0 ? `(${selectedCustomers.length})` : ""}
                  </Button>
                  <Button 
                    onClick={() => setShowCampaignBuilder(true)}
                    disabled={selectedCustomers.length === 0}
                    data-testid="button-create-campaign-from-customers"
                  >
                    <Megaphone className="w-4 h-4 mr-2" />
                    Campaign ({selectedCustomers.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Master Customer List</CardTitle>
                <CardDescription>
                  {filteredCustomers.length} customers • Click to view details
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {customersLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading customers...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox 
                            checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                            onCheckedChange={handleSelectAllCustomers}
                            data-testid="checkbox-select-all-customers"
                          />
                        </TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Jobs</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Last Service</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow 
                          key={customer.id} 
                          className="cursor-pointer hover-elevate"
                          onClick={() => { setSelectedCustomer(customer); setShowCustomerDetail(true); }}
                          data-testid={`row-customer-${customer.id}`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedCustomers.includes(customer.id)}
                              onCheckedChange={() => handleSelectCustomer(customer.id)}
                              data-testid={`checkbox-customer-${customer.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {customer.status === "customer" ? "Customer" : customer.status === "lead" ? "Lead" : "Lost"}
                                {customer.source && ` • ${customer.source}`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {customer.phone}
                              </div>
                              {customer.email && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  {customer.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.city && (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                {customer.city}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <p className="font-medium">{customer.completedJobs}</p>
                              <p className="text-xs text-muted-foreground">{customer.totalQuotes} quotes</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className={`font-medium ${customer.totalRevenue >= 5000 ? "text-green-500" : ""}`}>
                              {formatCurrency(customer.totalRevenue)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{formatDate(customer.lastServiceDate)}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {customer.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {customer.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{customer.tags.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" data-testid={`button-view-customer-${customer.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No customers found matching your filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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
                  
                  <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
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
                        {filteredLeads.map((lead) => (
                          <TableRow 
                            key={lead.id} 
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleSelectLead(lead.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => handleSelectLead(lead.id)}
                                onClick={(e) => e.stopPropagation()}
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

      {/* Customer Detail Dialog */}
      <Dialog open={showCustomerDetail} onOpenChange={setShowCustomerDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>Complete customer profile and history</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                    <Badge 
                      variant="outline" 
                      className={
                        selectedCustomer.status === "customer" 
                          ? "bg-green-500/10 text-green-500" 
                          : selectedCustomer.status === "lead" 
                          ? "bg-blue-500/10 text-blue-500" 
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {selectedCustomer.status === "customer" ? "Customer" : selectedCustomer.status === "lead" ? "Lead" : "Lost"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm">
                          {selectedCustomer.address}
                          {selectedCustomer.city && `, ${selectedCustomer.city}`}
                          {selectedCustomer.zipCode && ` ${selectedCustomer.zipCode}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Source</p>
                    <p className="font-medium">{selectedCustomer.source || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">First Contact</p>
                    <p className="font-medium">{formatDate(selectedCustomer.firstContactDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Contact</p>
                    <p className="font-medium">{formatDate(selectedCustomer.lastContactDate)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{selectedCustomer.completedJobs}</p>
                  <p className="text-xs text-muted-foreground">Completed Jobs</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-green-500">{formatCurrency(selectedCustomer.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{selectedCustomer.totalQuotes}</p>
                  <p className="text-xs text-muted-foreground">Quotes Sent</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{selectedCustomer.totalCalls}</p>
                  <p className="text-xs text-muted-foreground">Total Calls</p>
                </div>
              </div>

              {/* Service History */}
              {selectedCustomer.serviceTypes.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Services Used</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.serviceTypes.map((service, idx) => (
                      <Badge key={idx} variant="outline">{service}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Customer Tags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.tags.length > 0 ? (
                    selectedCustomer.tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        className={
                          tag === "high-value" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          tag === "repeat" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          tag === "lapsed" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                          ""
                        }
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No tags</span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline" size="sm" disabled={!selectedCustomer.email}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button 
                  size="sm"
                  onClick={() => {
                    setSelectedCustomers([selectedCustomer.id]);
                    setShowCustomerDetail(false);
                    setShowCampaignBuilder(true);
                  }}
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Add to Campaign
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
