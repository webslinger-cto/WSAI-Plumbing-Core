import { useState, useMemo } from "react";
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
import { Users, DollarSign, Phone, TrendingUp, Percent } from "lucide-react";

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

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("month");

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
    </div>
  );
}
