import { useState } from "react";
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
const mockSourceData = [
  { name: "eLocal", value: 847, cost: 67760 },
  { name: "Networx", value: 312, cost: 12480 },
  { name: "Direct", value: 88, cost: 0 },
];

const mockTrendData = [
  { date: "Jul", leads: 142, converted: 48 },
  { date: "Aug", leads: 189, converted: 62 },
  { date: "Sep", leads: 156, converted: 54 },
  { date: "Oct", leads: 201, converted: 71 },
  { date: "Nov", leads: 178, converted: 58 },
  { date: "Dec", leads: 234, converted: 89 },
];

const mockQualityData = [
  { category: "Valid Leads", count: 847, color: "#22c55e" },
  { category: "Duplicates", count: 156, color: "#a855f7" },
  { category: "Spam", count: 89, color: "#ef4444" },
  { category: "Missed Calls", count: 67, color: "#f59e0b" },
];

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
          value="1,247"
          change={12.5}
          icon={<Users className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Revenue"
          value="$84,320"
          change={8.2}
          icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Conversion Rate"
          value="34.2%"
          change={2.1}
          icon={<Percent className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Avg Lead Cost"
          value="$64.28"
          change={-5.3}
          icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Missed Calls"
          value="23"
          change={-15}
          changeLabel="vs last week"
          icon={<Phone className="w-5 h-5 text-muted-foreground" />}
          variant="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadTrendsChart data={mockTrendData} title="Lead Trends (6 Months)" />
        </div>
        <div>
          <LeadSourceChart data={mockSourceData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadQualityChart data={mockQualityData} />
        <RecentActivity activities={mockActivities} />
      </div>
    </div>
  );
}
