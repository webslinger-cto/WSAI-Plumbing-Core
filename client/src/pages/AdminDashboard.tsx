import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import KPICard from "@/components/KPICard";
import LeadSourceChart from "@/components/LeadSourceChart";
import LeadTrendsChart from "@/components/LeadTrendsChart";
import LeadQualityChart from "@/components/LeadQualityChart";
import RecentActivity, { type ActivityItem } from "@/components/RecentActivity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, DollarSign, Phone, TrendingUp, Percent, FileText, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Quote, Technician } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

// todo: remove mock functionality
// Data organized by time range
const mockDataByRange = {
  week: {
    sourceData: [
      { name: "eLocal", value: 42, cost: 3360 },
      { name: "Networx", value: 18, cost: 720 },
      { name: "Direct", value: 5, cost: 0 },
    ],
    trendData: [
      { date: "Mon", leads: 8, converted: 3 },
      { date: "Tue", leads: 12, converted: 4 },
      { date: "Wed", leads: 9, converted: 3 },
      { date: "Thu", leads: 11, converted: 4 },
      { date: "Fri", leads: 14, converted: 5 },
      { date: "Sat", leads: 7, converted: 2 },
      { date: "Sun", leads: 4, converted: 1 },
    ],
    qualityData: [
      { category: "Valid Leads", count: 52, color: "#22c55e" },
      { category: "Duplicates", count: 8, color: "#a855f7" },
      { category: "Spam", count: 4, color: "#ef4444" },
      { category: "Missed Calls", count: 3, color: "#f59e0b" },
    ],
    kpis: {
      totalLeads: "65",
      revenue: "$4,820",
      conversionRate: "33.8%",
      avgLeadCost: "$62.77",
      missedCalls: "3",
      changes: { leads: 8.2, revenue: 5.1, conversion: 1.2, cost: -3.1, missed: -25 },
    },
    trendTitle: "Lead Trends (This Week)",
  },
  month: {
    sourceData: [
      { name: "eLocal", value: 189, cost: 15120 },
      { name: "Networx", value: 72, cost: 2880 },
      { name: "Direct", value: 21, cost: 0 },
    ],
    trendData: [
      { date: "Week 1", leads: 58, converted: 19 },
      { date: "Week 2", leads: 72, converted: 24 },
      { date: "Week 3", leads: 68, converted: 22 },
      { date: "Week 4", leads: 84, converted: 28 },
    ],
    qualityData: [
      { category: "Valid Leads", count: 234, color: "#22c55e" },
      { category: "Duplicates", count: 32, color: "#a855f7" },
      { category: "Spam", count: 12, color: "#ef4444" },
      { category: "Missed Calls", count: 8, color: "#f59e0b" },
    ],
    kpis: {
      totalLeads: "282",
      revenue: "$21,450",
      conversionRate: "32.9%",
      avgLeadCost: "$63.83",
      missedCalls: "8",
      changes: { leads: 12.5, revenue: 8.2, conversion: 2.1, cost: -5.3, missed: -15 },
    },
    trendTitle: "Lead Trends (This Month)",
  },
  quarter: {
    sourceData: [
      { name: "eLocal", value: 523, cost: 41840 },
      { name: "Networx", value: 198, cost: 7920 },
      { name: "Direct", value: 58, cost: 0 },
    ],
    trendData: [
      { date: "Oct", leads: 201, converted: 71 },
      { date: "Nov", leads: 178, converted: 58 },
      { date: "Dec", leads: 234, converted: 89 },
    ],
    qualityData: [
      { category: "Valid Leads", count: 612, color: "#22c55e" },
      { category: "Duplicates", count: 98, color: "#a855f7" },
      { category: "Spam", count: 52, color: "#ef4444" },
      { category: "Missed Calls", count: 31, color: "#f59e0b" },
    ],
    kpis: {
      totalLeads: "779",
      revenue: "$58,920",
      conversionRate: "35.5%",
      avgLeadCost: "$63.88",
      missedCalls: "31",
      changes: { leads: 18.3, revenue: 14.7, conversion: 3.8, cost: -8.2, missed: -12 },
    },
    trendTitle: "Lead Trends (This Quarter)",
  },
  year: {
    sourceData: [
      { name: "eLocal", value: 847, cost: 67760 },
      { name: "Networx", value: 312, cost: 12480 },
      { name: "Direct", value: 88, cost: 0 },
    ],
    trendData: [
      { date: "Jul", leads: 142, converted: 48 },
      { date: "Aug", leads: 189, converted: 62 },
      { date: "Sep", leads: 156, converted: 54 },
      { date: "Oct", leads: 201, converted: 71 },
      { date: "Nov", leads: 178, converted: 58 },
      { date: "Dec", leads: 234, converted: 89 },
    ],
    qualityData: [
      { category: "Valid Leads", count: 847, color: "#22c55e" },
      { category: "Duplicates", count: 156, color: "#a855f7" },
      { category: "Spam", count: 89, color: "#ef4444" },
      { category: "Missed Calls", count: 67, color: "#f59e0b" },
    ],
    kpis: {
      totalLeads: "1,247",
      revenue: "$84,320",
      conversionRate: "34.2%",
      avgLeadCost: "$64.28",
      missedCalls: "23",
      changes: { leads: 24.5, revenue: 19.8, conversion: 4.2, cost: -6.1, missed: -18 },
    },
    trendTitle: "Lead Trends (This Year)",
  },
};

const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "lead",
    title: "New Lead: Leonard Willis",
    description: "Sewer Main - Clear in Chicago",
    timestamp: "2m ago",
    status: "success",
  },
  {
    id: "2",
    type: "call",
    title: "Call from (708) 979-6298",
    description: "Direct call - Plumbing inquiry",
    timestamp: "15m ago",
  },
  {
    id: "3",
    type: "quote",
    title: "Quote sent to M. Garcia",
    description: "$850 - Sewer line repair",
    timestamp: "1h ago",
    status: "success",
  },
  {
    id: "4",
    type: "payment",
    title: "Payment received",
    description: "$450 from T. Kelley",
    timestamp: "2h ago",
    status: "success",
  },
  {
    id: "5",
    type: "alert",
    title: "Duplicate lead detected",
    description: "Armando Robles - eLocal",
    timestamp: "3h ago",
    status: "warning",
  },
];

const quoteStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: Clock },
  sent: { label: "Pending", color: "bg-amber-500/20 text-amber-400", icon: Clock },
  viewed: { label: "Viewed", color: "bg-blue-500/20 text-blue-400", icon: FileText },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  declined: { label: "Declined", color: "bg-destructive/20 text-destructive", icon: XCircle },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground", icon: Clock },
};

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("month");

  const { data: quotes = [], isLoading: quotesLoading, isError: quotesError } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  // Quote statistics
  const quoteStats = useMemo(() => {
    const pending = quotes.filter(q => q.status === "draft" || q.status === "sent").length;
    const accepted = quotes.filter(q => q.status === "accepted").length;
    const declined = quotes.filter(q => q.status === "declined").length;
    const totalValue = quotes.reduce((sum, q) => sum + parseFloat(String(q.total || 0)), 0);
    const acceptedValue = quotes.filter(q => q.status === "accepted").reduce((sum, q) => sum + parseFloat(String(q.total || 0)), 0);
    return { pending, accepted, declined, totalValue, acceptedValue };
  }, [quotes]);

  // Get data for the selected time range
  const currentData = useMemo(() => {
    return mockDataByRange[timeRange as keyof typeof mockDataByRange];
  }, [timeRange]);

  const { sourceData, trendData, qualityData, kpis, trendTitle } = currentData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your lead generation and business performance
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/documentation/pdf", "_blank")}
            data-testid="button-download-docs"
          >
            <Download className="w-4 h-4 mr-2" />
            Documentation
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Leads"
          value={kpis.totalLeads}
          change={kpis.changes.leads}
          icon={<Users className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Revenue"
          value={kpis.revenue}
          change={kpis.changes.revenue}
          icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Conversion Rate"
          value={kpis.conversionRate}
          change={kpis.changes.conversion}
          icon={<Percent className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Avg Lead Cost"
          value={kpis.avgLeadCost}
          change={kpis.changes.cost}
          icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Missed Calls"
          value={kpis.missedCalls}
          change={kpis.changes.missed}
          changeLabel="vs last period"
          icon={<Phone className="w-5 h-5 text-muted-foreground" />}
          variant="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadTrendsChart data={trendData} title={trendTitle} />
        </div>
        <div>
          <LeadSourceChart data={sourceData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadQualityChart data={qualityData} />
        <RecentActivity activities={mockActivities} />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Quote Tracking</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-pending-quotes">{quoteStats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending Quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/20">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-accepted-quotes">{quoteStats.accepted}</p>
                  <p className="text-sm text-muted-foreground">Accepted Quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-destructive/20">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-declined-quotes">{quoteStats.declined}</p>
                  <p className="text-sm text-muted-foreground">Declined Quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/20">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-quote-value">${quoteStats.acceptedValue.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Accepted Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Quotes
            </CardTitle>
            <CardDescription>
              Track all quotes across technicians
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading quotes...</div>
            ) : quotesError ? (
              <div className="text-center py-8 text-destructive">Failed to load quotes. Please try again.</div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No quotes yet</div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {quotes.slice(0, 20).map((quote) => {
                    const tech = technicians.find(t => t.id === quote.technicianId);
                    const status = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;
                    const StatusIcon = status.icon;
                    return (
                      <div 
                        key={quote.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                        data-testid={`quote-row-${quote.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate" data-testid={`text-quote-name-${quote.id}`}>
                              {quote.customerName}
                            </p>
                            <Badge className={`${status.color} shrink-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {quote.address}
                          </p>
                          {tech && (
                            <p className="text-xs text-muted-foreground">
                              By: {tech.fullName}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-bold text-lg" data-testid={`text-quote-amount-${quote.id}`}>
                            ${parseFloat(String(quote.total || 0)).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {quote.createdAt && formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
