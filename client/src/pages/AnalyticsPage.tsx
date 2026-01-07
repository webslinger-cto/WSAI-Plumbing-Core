import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Activity } from "lucide-react";
import JobCostsAnalytics from "@/components/JobCostsAnalytics";
import type { JobRevenueEvent, Technician } from "@shared/schema";

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalLeads: number;
    conversionRate: number;
    netProfit: number;
    revenueChange: number;
    leadsChange: number;
    conversionChange: number;
    profitChange: number;
  };
  sourceComparison: Array<{
    source: string;
    leads: number;
    cost: number;
    converted: number;
    costPerLead: number;
    avgResponse: number;
    revenue: number;
    roi: number;
    costPerAcquisition: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    leads: number;
    expenses: number;
    profit: number;
  }>;
  serviceBreakdown: Array<{
    name: string;
    value: number;
    revenue: number;
    avgTicket: number;
    color: string;
  }>;
  techPerformance: Array<{
    name: string;
    jobs: number;
    revenue: number;
    rate: number;
    verified: number;
    avgTime: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl">
        <p className="text-white font-bold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white text-sm font-medium">
            <span style={{ color: entry.color }} className="font-semibold">{entry.name}: </span>
            <span className="text-white font-bold">
              {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('revenue') 
                ? `$${entry.value.toLocaleString()}`
                : typeof entry.value === 'number' && entry.name?.toLowerCase().includes('cost')
                ? `$${entry.value.toLocaleString()}`
                : typeof entry.value === 'number' && entry.name?.toLowerCase().includes('profit')
                ? `$${entry.value.toLocaleString()}`
                : typeof entry.value === 'number' && entry.name?.toLowerCase().includes('expense')
                ? `$${entry.value.toLocaleString()}`
                : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const timeRangeLabels: Record<string, string> = {
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  year: "This Year",
};

const comparisonLabels: Record<string, string> = {
  week: "vs last week",
  month: "vs last month",
  quarter: "vs last quarter",
  year: "vs last year",
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("year");

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?range=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  // Fetch revenue events for payroll/labor cost tracking
  const { data: revenueEvents = [] } = useQuery<JobRevenueEvent[]>({
    queryKey: ['/api/revenue-events'],
  });

  // Fetch technicians for payroll calculations
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ['/api/technicians'],
  });

  // Calculate payroll summary from revenue events
  const payrollSummary = useMemo(() => {
    const totalRevenue = revenueEvents.reduce((sum, e) => sum + parseFloat(String(e.totalRevenue) || "0"), 0);
    const totalLabor = revenueEvents.reduce((sum, e) => sum + parseFloat(String(e.laborCost) || "0"), 0);
    const totalMaterials = revenueEvents.reduce((sum, e) => sum + parseFloat(String(e.materialCost) || "0"), 0);
    const totalCommissions = revenueEvents.reduce((sum, e) => sum + parseFloat(String(e.commissionAmount) || "0"), 0);
    const totalNetProfit = revenueEvents.reduce((sum, e) => sum + parseFloat(String(e.netProfit) || "0"), 0);
    
    // Calculate estimated payroll from technicians
    const estimatedPayroll = technicians.reduce((sum, t) => {
      const hourlyRate = parseFloat(String(t.hourlyRate) || "25");
      const completedJobs = t.completedJobsToday || 0;
      // Estimate 2 hours per job average
      return sum + (completedJobs * 2 * hourlyRate);
    }, 0);

    const laborPercentage = totalRevenue > 0 ? (totalLabor / totalRevenue) * 100 : 0;
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalLabor: Math.round(totalLabor * 100) / 100,
      totalMaterials: Math.round(totalMaterials * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      totalNetProfit: Math.round(totalNetProfit * 100) / 100,
      estimatedPayroll: Math.round(estimatedPayroll * 100) / 100,
      laborPercentage: Math.round(laborPercentage * 10) / 10,
      profitMargin: Math.round(profitMargin * 10) / 10,
      eventCount: revenueEvents.length,
    };
  }, [revenueEvents, technicians]);

  // Payroll breakdown by technician
  const payrollByTech = useMemo(() => {
    const byTech: Record<string, { name: string; revenue: number; labor: number; materials: number; commission: number; profit: number; jobs: number }> = {};
    
    revenueEvents.forEach(event => {
      const techId = event.technicianId;
      const tech = technicians.find(t => t.id === techId);
      const name = tech?.fullName || "Unknown";
      
      if (!byTech[techId]) {
        byTech[techId] = { name, revenue: 0, labor: 0, materials: 0, commission: 0, profit: 0, jobs: 0 };
      }
      
      byTech[techId].revenue += parseFloat(String(event.totalRevenue) || "0");
      byTech[techId].labor += parseFloat(String(event.laborCost) || "0");
      byTech[techId].materials += parseFloat(String(event.materialCost) || "0");
      byTech[techId].commission += parseFloat(String(event.commissionAmount) || "0");
      byTech[techId].profit += parseFloat(String(event.netProfit) || "0");
      byTech[techId].jobs++;
    });
    
    return Object.entries(byTech).map(([id, data]) => ({ id, ...data }));
  }, [revenueEvents, technicians]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  };

  const renderTrend = (value: number, label: string) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'} mt-1`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{isPositive ? '+' : ''}{value}% {label}</span>
      </div>
    );
  };

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { summary, sourceComparison, monthlyRevenue, serviceBreakdown, techPerformance, conversionFunnel } = analytics;
  const comparisonLabel = comparisonLabels[timeRange];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Deep dive into your lead sources, technician performance, and ROI
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]" data-testid="select-analytics-range">
            <SelectValue>{timeRangeLabels[timeRange]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(summary.totalRevenue)}</p>
                {renderTrend(summary.revenueChange, comparisonLabel)}
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Leads</p>
                <p className="text-2xl font-bold" data-testid="text-total-leads">{summary.totalLeads.toLocaleString()}</p>
                {renderTrend(summary.leadsChange, comparisonLabel)}
              </div>
              <div className="p-3 bg-chart-1/10 rounded-lg">
                <Users className="w-5 h-5 text-chart-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Conversion Rate</p>
                <p className="text-2xl font-bold" data-testid="text-conversion-rate">{summary.conversionRate}%</p>
                {renderTrend(summary.conversionChange, comparisonLabel)}
              </div>
              <div className="p-3 bg-chart-5/10 rounded-lg">
                <Target className="w-5 h-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Profit</p>
                <p className="text-2xl font-bold" data-testid="text-net-profit">{formatCurrency(summary.netProfit)}</p>
                {renderTrend(summary.profitChange, comparisonLabel)}
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources" data-testid="tab-sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payroll" data-testid="tab-payroll">Payroll</TabsTrigger>
          <TabsTrigger value="roi" data-testid="tab-roi">Marketing ROI</TabsTrigger>
          <TabsTrigger value="jobcosts" data-testid="tab-jobcosts">Job Costs</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          <TabsTrigger value="technicians" data-testid="tab-technicians">Technicians</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          {sourceComparison.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No lead data available for this time period.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                      Lead Volume by Source
                    </CardTitle>
                    <CardDescription>Compare total leads vs converted leads</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceComparison}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis
                            dataKey="source"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="leads" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Total Leads" />
                          <Bar dataKey="converted" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Converted" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                      Conversion Funnel
                    </CardTitle>
                    <CardDescription>Lead journey through conversion stages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={conversionFunnel} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis
                            type="category"
                            dataKey="stage"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            width={80}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} name="Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Source Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Leads</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Converted</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Conv. Rate</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Cost</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Cost/Lead</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceComparison.map((source) => (
                          <tr key={source.source} className="border-b last:border-0">
                            <td className="py-3 px-4 font-medium">{source.source}</td>
                            <td className="text-right py-3 px-4">{source.leads}</td>
                            <td className="text-right py-3 px-4 text-green-500">{source.converted}</td>
                            <td className="text-right py-3 px-4">
                              <Badge variant={((source.converted / source.leads) * 100) > 40 ? "default" : "secondary"} className="text-xs">
                                {source.leads > 0 ? ((source.converted / source.leads) * 100).toFixed(1) : 0}%
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4">${source.cost.toLocaleString()}</td>
                            <td className="text-right py-3 px-4">${source.costPerLead}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {monthlyRevenue.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No revenue data available for this time period.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Monthly Revenue, Expenses & Profit
                  </CardTitle>
                  <CardDescription>Financial performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyRevenue}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--chart-5))"
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                          strokeWidth={2}
                          name="Revenue"
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          stroke="hsl(142 71% 45%)"
                          fillOpacity={1}
                          fill="url(#colorProfit)"
                          strokeWidth={2}
                          name="Profit"
                        />
                        <Line
                          type="monotone"
                          dataKey="expenses"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Expenses"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Lead Volume Trend
                  </CardTitle>
                  <CardDescription>Monthly lead acquisition</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                        <Line
                          type="monotone"
                          dataKey="leads"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={3}
                          dot={{ fill: "hsl(var(--chart-1))", r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                          activeDot={{ r: 8, stroke: "white", strokeWidth: 2 }}
                          name="Leads"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Payroll Tab - Linked to Revenue Events */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue (Events)</p>
                <p className="text-2xl font-bold" data-testid="text-payroll-revenue">
                  {formatCurrency(payrollSummary.totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">{payrollSummary.eventCount} events tracked</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Labor Costs</p>
                <p className="text-2xl font-bold text-red-500" data-testid="text-labor-costs">
                  {formatCurrency(payrollSummary.totalLabor)}
                </p>
                <p className="text-xs text-muted-foreground">{payrollSummary.laborPercentage}% of revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Commissions</p>
                <p className="text-2xl font-bold text-blue-500" data-testid="text-total-commissions">
                  {formatCurrency(payrollSummary.totalCommissions)}
                </p>
                <p className="text-xs text-muted-foreground">Technician payouts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Profit</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-payroll-net-profit">
                  {formatCurrency(payrollSummary.totalNetProfit)}
                </p>
                <p className="text-xs text-muted-foreground">{payrollSummary.profitMargin}% margin</p>
              </CardContent>
            </Card>
          </div>

          {payrollByTech.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No revenue events recorded yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Revenue events are created automatically when jobs are completed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                      Revenue vs Costs by Technician
                    </CardTitle>
                    <CardDescription>Compare revenue with labor and material costs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={payrollByTech}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Revenue" />
                          <Bar dataKey="labor" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Labor Cost" />
                          <Bar dataKey="materials" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Materials" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                      Commission Distribution
                    </CardTitle>
                    <CardDescription>Commission earnings by technician</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={payrollByTech.filter(t => t.commission > 0)}
                            dataKey="commission"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, commission }) => `${name}: $${commission.toFixed(0)}`}
                          >
                            {payrollByTech.map((entry, index) => (
                              <Cell key={entry.id} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Payroll Summary by Technician
                  </CardTitle>
                  <CardDescription>Detailed breakdown of revenue, costs, and commissions per technician</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Technician</th>
                          <th className="text-center p-3 text-sm font-medium">Jobs</th>
                          <th className="text-right p-3 text-sm font-medium">Revenue</th>
                          <th className="text-right p-3 text-sm font-medium">Labor</th>
                          <th className="text-right p-3 text-sm font-medium">Materials</th>
                          <th className="text-right p-3 text-sm font-medium">Commission</th>
                          <th className="text-right p-3 text-sm font-medium">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollByTech.map((tech) => (
                          <tr key={tech.id} className="border-b last:border-0" data-testid={`row-payroll-analytics-${tech.id}`}>
                            <td className="p-3 font-medium">{tech.name}</td>
                            <td className="p-3 text-center">{tech.jobs}</td>
                            <td className="p-3 text-right">${tech.revenue.toLocaleString()}</td>
                            <td className="p-3 text-right text-red-500">${tech.labor.toLocaleString()}</td>
                            <td className="p-3 text-right text-red-500">${tech.materials.toLocaleString()}</td>
                            <td className="p-3 text-right text-blue-500">${tech.commission.toLocaleString()}</td>
                            <td className="p-3 text-right text-green-500 font-medium">${tech.profit.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          {sourceComparison.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No marketing data available for this time period.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Marketing Spend</p>
                    <p className="text-2xl font-bold" data-testid="text-total-marketing-spend">
                      {formatCurrency(sourceComparison.reduce((sum, s) => sum + s.cost, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue from Leads</p>
                    <p className="text-2xl font-bold text-green-500" data-testid="text-total-lead-revenue">
                      {formatCurrency(sourceComparison.reduce((sum, s) => sum + s.revenue, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall ROI</p>
                    <p className="text-2xl font-bold" data-testid="text-overall-roi">
                      {(() => {
                        const totalCost = sourceComparison.reduce((sum, s) => sum + s.cost, 0);
                        const totalRevenue = sourceComparison.reduce((sum, s) => sum + s.revenue, 0);
                        const overallRoi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
                        return `${overallRoi >= 0 ? '+' : ''}${overallRoi.toFixed(1)}%`;
                      })()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Cost/Acquisition</p>
                    <p className="text-2xl font-bold" data-testid="text-avg-cpa">
                      {formatCurrency(
                        sourceComparison.reduce((sum, s) => sum + s.costPerAcquisition * s.converted, 0) /
                        Math.max(sourceComparison.reduce((sum, s) => sum + s.converted, 0), 1)
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                      Revenue vs Cost by Source
                    </CardTitle>
                    <CardDescription>Compare marketing spend against revenue generated</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceComparison}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis
                            dataKey="source"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Legend />
                          <Bar dataKey="cost" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Cost" />
                          <Bar dataKey="revenue" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                      ROI by Source
                    </CardTitle>
                    <CardDescription>Return on investment percentage per lead source</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceComparison} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <YAxis
                            type="category"
                            dataKey="source"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            width={80}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar
                            dataKey="roi"
                            fill="hsl(var(--chart-5))"
                            radius={[0, 4, 4, 0]}
                            name="ROI %"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Marketing ROI Summary
                  </CardTitle>
                  <CardDescription>Detailed breakdown of marketing performance by source</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Leads</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Converted</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Cost</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Cost/Acquisition</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceComparison.map((source) => (
                          <tr key={source.source} className="border-b last:border-0" data-testid={`row-roi-${source.source}`}>
                            <td className="py-3 px-4 font-medium">{source.source}</td>
                            <td className="text-right py-3 px-4">{source.leads}</td>
                            <td className="text-right py-3 px-4 text-green-500">{source.converted}</td>
                            <td className="text-right py-3 px-4">${source.cost.toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-green-500">${source.revenue.toLocaleString()}</td>
                            <td className="text-right py-3 px-4">${source.costPerAcquisition.toLocaleString()}</td>
                            <td className="text-right py-3 px-4">
                              <Badge variant={source.roi > 0 ? "default" : "secondary"} className="text-xs">
                                {source.roi >= 0 ? '+' : ''}{source.roi}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="jobcosts" className="space-y-4">
          <JobCostsAnalytics timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          {serviceBreakdown.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No service data available for this time period.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Jobs by Service Type
                  </CardTitle>
                  <CardDescription>Distribution of completed jobs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {serviceBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Revenue by Service
                  </CardTitle>
                  <CardDescription>Revenue breakdown by service type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serviceBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis 
                          type="number" 
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          width={100}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="technicians" className="space-y-4">
          {techPerformance.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No technician data available for this time period.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Technician Performance
                  </CardTitle>
                  <CardDescription>Jobs completed and revenue generated</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={techPerformance}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Legend />
                        <Bar dataKey="jobs" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Jobs" />
                        <Bar dataKey="verified" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Verified Arrivals" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Technician Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Technician</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Jobs</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Verification Rate</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Time (hrs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {techPerformance.map((tech) => (
                          <tr key={tech.name} className="border-b last:border-0">
                            <td className="py-3 px-4 font-medium">{tech.name}</td>
                            <td className="text-right py-3 px-4">{tech.jobs}</td>
                            <td className="text-right py-3 px-4 text-green-500">${tech.revenue.toLocaleString()}</td>
                            <td className="text-right py-3 px-4">
                              <Badge variant={tech.rate >= 90 ? "default" : "secondary"} className="text-xs">
                                {tech.rate}%
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4">{tech.avgTime.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
