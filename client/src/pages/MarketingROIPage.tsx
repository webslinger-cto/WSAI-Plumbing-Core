import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  BarChart3,
  Loader2,
  Calendar,
  Megaphone,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import type { MarketingCampaign, MarketingSpend } from "@shared/schema";

const leadSources = ["eLocal", "Networx", "Angi", "Thumbtack", "Direct Call", "Website", "Referral", "Google Ads", "Facebook", "Other"];

const CHART_COLORS = ["#b22222", "#1e40af", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d"];

type MarketingROI = {
  source: string;
  spend: number;
  leads: number;
  converted: number;
  revenue: number;
  roi: number;
};

export default function MarketingROIPage() {
  const { toast } = useToast();
  const [isAddCampaignDialogOpen, setIsAddCampaignDialogOpen] = useState(false);
  const [isAddSpendDialogOpen, setIsAddSpendDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    source: "",
    type: "",
    budget: "",
    notes: "",
    isActive: true,
  });
  const [spendForm, setSpendForm] = useState({
    campaignId: "",
    source: "",
    period: new Date().toISOString().slice(0, 7),
    amount: "",
    leadsGenerated: "",
    leadsConverted: "",
    revenueGenerated: "",
    notes: "",
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<MarketingCampaign[]>({
    queryKey: ["/api/marketing/campaigns"],
  });

  const { data: spendRecords = [] } = useQuery<MarketingSpend[]>({
    queryKey: ["/api/marketing/spend"],
  });

  const { data: roiData = [] } = useQuery<MarketingROI[]>({
    queryKey: ["/api/marketing/roi"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof campaignForm) => {
      const response = await apiRequest("POST", "/api/marketing/campaigns", {
        name: data.name,
        source: data.source,
        type: data.type || null,
        budget: data.budget || null,
        notes: data.notes || null,
        isActive: data.isActive,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      toast({ title: "Campaign created", description: "Marketing campaign has been added." });
      setIsAddCampaignDialogOpen(false);
      resetCampaignForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof campaignForm }) => {
      const response = await apiRequest("PATCH", `/api/marketing/campaigns/${id}`, {
        name: data.name,
        source: data.source,
        type: data.type || null,
        budget: data.budget || null,
        notes: data.notes || null,
        isActive: data.isActive,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      toast({ title: "Campaign updated", description: "Marketing campaign has been updated." });
      setEditingCampaign(null);
      resetCampaignForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update campaign.", variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/marketing/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      toast({ title: "Campaign deleted", description: "Marketing campaign has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete campaign.", variant: "destructive" });
    },
  });

  const createSpendMutation = useMutation({
    mutationFn: async (data: typeof spendForm) => {
      const response = await apiRequest("POST", "/api/marketing/spend", {
        campaignId: data.campaignId || null,
        source: data.source,
        period: data.period,
        amount: data.amount || "0",
        leadsGenerated: data.leadsGenerated ? parseInt(data.leadsGenerated) : 0,
        leadsConverted: data.leadsConverted ? parseInt(data.leadsConverted) : 0,
        revenueGenerated: data.revenueGenerated || null,
        notes: data.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/spend"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/roi"] });
      toast({ title: "Spend recorded", description: "Marketing spend has been logged." });
      setIsAddSpendDialogOpen(false);
      resetSpendForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record spend.", variant: "destructive" });
    },
  });

  const resetCampaignForm = () => {
    setCampaignForm({
      name: "",
      source: "",
      type: "",
      budget: "",
      notes: "",
      isActive: true,
    });
  };

  const resetSpendForm = () => {
    setSpendForm({
      campaignId: "",
      source: "",
      period: new Date().toISOString().slice(0, 7),
      amount: "",
      leadsGenerated: "",
      leadsConverted: "",
      revenueGenerated: "",
      notes: "",
    });
  };

  const handleEditCampaign = (campaign: MarketingCampaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      source: campaign.source,
      type: campaign.type || "",
      budget: campaign.budget ? String(campaign.budget) : "",
      notes: campaign.notes || "",
      isActive: campaign.isActive,
    });
  };

  const handleSubmitCampaign = () => {
    if (!campaignForm.name || !campaignForm.source) {
      toast({ title: "Required fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    if (editingCampaign) {
      updateCampaignMutation.mutate({ id: editingCampaign.id, data: campaignForm });
    } else {
      createCampaignMutation.mutate(campaignForm);
    }
  };

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "$0";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const totalSpend = roiData.reduce((sum, r) => sum + (r.spend || 0), 0);
  const totalLeads = roiData.reduce((sum, r) => sum + (r.leads || 0), 0);
  const totalRevenue = roiData.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const overallROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

  const chartData = roiData.map(r => ({
    name: r.source,
    spend: r.spend,
    revenue: r.revenue,
    leads: r.leads,
  }));

  const pieData = roiData.filter(r => r.spend > 0).map((r, i) => ({
    name: r.source,
    value: r.spend,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Marketing ROI</h1>
            <p className="text-muted-foreground">Track marketing spend and measure return on investment by lead source</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => setIsAddCampaignDialogOpen(true)}
              data-testid="button-add-campaign"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Add Campaign
            </Button>
            <Button 
              onClick={() => setIsAddSpendDialogOpen(true)}
              data-testid="button-log-spend"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Spend
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
              <p className="text-xs text-muted-foreground">All marketing channels</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {totalSpend > 0 ? `${formatCurrency(totalSpend / totalLeads)} per lead` : "No spend recorded"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Attributed</CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">From marketing leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall ROI</CardTitle>
              {overallROI >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overallROI >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatPercent(overallROI)}
              </div>
              <p className="text-xs text-muted-foreground">Return on marketing spend</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="spend" data-testid="tab-spend">Spend Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Spend vs Revenue by Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No marketing data yet. Log spend to see charts.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Bar dataKey="spend" name="Spend" fill="#b22222" />
                        <Bar dataKey="revenue" name="Revenue" fill="#059669" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spend Distribution</CardTitle>
                  <CardDescription>Marketing budget allocation by source</CardDescription>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No spend data recorded yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>ROI by Source</CardTitle>
                <CardDescription>Detailed breakdown of marketing performance</CardDescription>
              </CardHeader>
              <CardContent>
                {roiData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No ROI data yet. Log marketing spend to see performance metrics.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Spend</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Converted</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost/Lead</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roiData.map((row) => (
                        <TableRow key={row.source} data-testid={`row-roi-${row.source}`}>
                          <TableCell className="font-medium">{row.source}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.spend)}</TableCell>
                          <TableCell className="text-right">{row.leads}</TableCell>
                          <TableCell className="text-right">{row.converted}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-right">
                            {row.leads > 0 ? formatCurrency(row.spend / row.leads) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={row.roi >= 0 ? "default" : "destructive"}>
                              {formatPercent(row.roi)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Campaigns</CardTitle>
                <CardDescription>Manage your marketing campaigns and budgets</CardDescription>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No campaigns yet. Create your first campaign.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              {campaign.notes && (
                                <p className="text-sm text-muted-foreground line-clamp-1">{campaign.notes}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{campaign.source}</Badge>
                          </TableCell>
                          <TableCell>{campaign.type || "-"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(campaign.budget)}</TableCell>
                          <TableCell>
                            <Badge variant={campaign.isActive ? "default" : "outline"}>
                              {campaign.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditCampaign(campaign)}
                                data-testid={`button-edit-campaign-${campaign.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                data-testid={`button-delete-campaign-${campaign.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Spend History</CardTitle>
                <CardDescription>Track marketing expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                {spendRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No spend recorded yet. Log your marketing expenses.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Converted</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spendRecords.map((spend) => (
                        <TableRow key={spend.id} data-testid={`row-spend-${spend.id}`}>
                          <TableCell className="font-mono">{spend.period}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{spend.source}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(spend.amount)}</TableCell>
                          <TableCell className="text-right">{spend.leadsGenerated}</TableCell>
                          <TableCell className="text-right">{spend.leadsConverted}</TableCell>
                          <TableCell className="text-right">{formatCurrency(spend.revenueGenerated)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isAddCampaignDialogOpen || !!editingCampaign} onOpenChange={(open) => {
          if (!open) {
            setIsAddCampaignDialogOpen(false);
            setEditingCampaign(null);
            resetCampaignForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Edit Campaign" : "Add New Campaign"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="e.g., Q4 2024 eLocal Push"
                  data-testid="input-campaign-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lead Source *</Label>
                  <Select value={campaignForm.source} onValueChange={(v) => setCampaignForm({ ...campaignForm, source: v })}>
                    <SelectTrigger data-testid="select-campaign-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((source) => (
                        <SelectItem key={source} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select value={campaignForm.type} onValueChange={(v) => setCampaignForm({ ...campaignForm, type: v })}>
                    <SelectTrigger data-testid="select-campaign-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ppc">PPC</SelectItem>
                      <SelectItem value="seo">SEO</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="referral">Referral Program</SelectItem>
                      <SelectItem value="marketplace">Marketplace</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Monthly Budget</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-campaign-budget"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={campaignForm.notes}
                  onChange={(e) => setCampaignForm({ ...campaignForm, notes: e.target.value })}
                  placeholder="Campaign details or strategy notes"
                  data-testid="input-campaign-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddCampaignDialogOpen(false);
                setEditingCampaign(null);
                resetCampaignForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitCampaign}
                disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                data-testid="button-save-campaign"
              >
                {(createCampaignMutation.isPending || updateCampaignMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingCampaign ? "Update Campaign" : "Add Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddSpendDialogOpen} onOpenChange={setIsAddSpendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Marketing Spend</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lead Source *</Label>
                  <Select value={spendForm.source} onValueChange={(v) => setSpendForm({ ...spendForm, source: v })}>
                    <SelectTrigger data-testid="select-spend-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((source) => (
                        <SelectItem key={source} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Period *</Label>
                  <Input
                    type="month"
                    value={spendForm.period}
                    onChange={(e) => setSpendForm({ ...spendForm, period: e.target.value })}
                    data-testid="input-spend-period"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Amount Spent *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={spendForm.amount}
                  onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-spend-amount"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Leads Generated</Label>
                  <Input
                    type="number"
                    value={spendForm.leadsGenerated}
                    onChange={(e) => setSpendForm({ ...spendForm, leadsGenerated: e.target.value })}
                    placeholder="0"
                    data-testid="input-leads-generated"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leads Converted</Label>
                  <Input
                    type="number"
                    value={spendForm.leadsConverted}
                    onChange={(e) => setSpendForm({ ...spendForm, leadsConverted: e.target.value })}
                    placeholder="0"
                    data-testid="input-leads-converted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Revenue</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={spendForm.revenueGenerated}
                    onChange={(e) => setSpendForm({ ...spendForm, revenueGenerated: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-revenue-generated"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={spendForm.notes}
                  onChange={(e) => setSpendForm({ ...spendForm, notes: e.target.value })}
                  placeholder="Additional details about this spend"
                  data-testid="input-spend-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddSpendDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createSpendMutation.mutate(spendForm)}
                disabled={!spendForm.source || !spendForm.period || !spendForm.amount || createSpendMutation.isPending}
                data-testid="button-save-spend"
              >
                {createSpendMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log Spend
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
