import { useState } from "react";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { TrendingUp, TrendingDown, MapPin, Clock, DollarSign, Users, Target, Activity } from "lucide-react";

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
                : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const sourceComparisonData = [
  { source: "eLocal", leads: 847, cost: 67760, converted: 289, costPerLead: 80, avgResponse: 12 },
  { source: "Networx", leads: 312, cost: 12480, converted: 112, costPerLead: 40, avgResponse: 18 },
  { source: "Direct", leads: 88, cost: 0, converted: 45, costPerLead: 0, avgResponse: 8 },
  { source: "Google Ads", leads: 234, cost: 18720, converted: 89, costPerLead: 80, avgResponse: 15 },
  { source: "Referral", leads: 156, cost: 0, converted: 98, costPerLead: 0, avgResponse: 6 },
];

const monthlyRevenueData = [
  { month: "Jan", revenue: 12400, leads: 98, expenses: 8200, profit: 4200 },
  { month: "Feb", revenue: 14200, leads: 112, expenses: 9100, profit: 5100 },
  { month: "Mar", revenue: 18600, leads: 145, expenses: 11200, profit: 7400 },
  { month: "Apr", revenue: 15800, leads: 128, expenses: 9800, profit: 6000 },
  { month: "May", revenue: 21200, leads: 167, expenses: 12400, profit: 8800 },
  { month: "Jun", revenue: 19400, leads: 158, expenses: 11600, profit: 7800 },
  { month: "Jul", revenue: 22800, leads: 182, expenses: 13200, profit: 9600 },
  { month: "Aug", revenue: 25400, leads: 201, expenses: 14800, profit: 10600 },
  { month: "Sep", revenue: 23100, leads: 189, expenses: 13600, profit: 9500 },
  { month: "Oct", revenue: 27800, leads: 223, expenses: 15800, profit: 12000 },
  { month: "Nov", revenue: 24600, leads: 198, expenses: 14200, profit: 10400 },
  { month: "Dec", revenue: 28900, leads: 234, expenses: 16400, profit: 12500 },
];

const weeklyTrendData = [
  { week: "W1", conversions: 23, calls: 89, quotes: 45 },
  { week: "W2", conversions: 31, calls: 112, quotes: 58 },
  { week: "W3", conversions: 28, calls: 95, quotes: 52 },
  { week: "W4", conversions: 35, calls: 128, quotes: 67 },
];

const serviceBreakdownData = [
  { name: "Drain Cleaning", value: 412, revenue: 82400, avgTicket: 200, color: "hsl(var(--chart-1))" },
  { name: "Sewer Main", value: 287, revenue: 172200, avgTicket: 600, color: "hsl(var(--chart-2))" },
  { name: "Plumbing", value: 356, revenue: 89000, avgTicket: 250, color: "hsl(var(--chart-3))" },
  { name: "Flood Control", value: 124, revenue: 124000, avgTicket: 1000, color: "hsl(var(--chart-4))" },
  { name: "Camera Inspection", value: 189, revenue: 28350, avgTicket: 150, color: "hsl(var(--chart-5))" },
  { name: "Emergency", value: 68, revenue: 34000, avgTicket: 500, color: "hsl(0 72% 51%)" },
];

const techPerformanceData = [
  { name: "Mike J.", jobs: 156, revenue: 28450, rate: 91, verified: 142, avgTime: 2.3 },
  { name: "Carlos R.", jobs: 98, revenue: 19200, rate: 87, verified: 89, avgTime: 2.8 },
  { name: "David S.", jobs: 67, revenue: 12800, rate: 87, verified: 61, avgTime: 3.1 },
  { name: "James W.", jobs: 89, revenue: 16750, rate: 91, verified: 82, avgTime: 2.5 },
  { name: "Robert B.", jobs: 45, revenue: 8900, rate: 84, verified: 38, avgTime: 3.4 },
];

const locationVerificationData = [
  { name: "Mike J.", verified: 91, unverified: 9 },
  { name: "Carlos R.", verified: 91, unverified: 9 },
  { name: "David S.", verified: 91, unverified: 9 },
  { name: "James W.", verified: 92, unverified: 8 },
  { name: "Robert B.", verified: 84, unverified: 16 },
];

const radarData = [
  { subject: "Lead Quality", eLocal: 75, Networx: 82, Direct: 95, fullMark: 100 },
  { subject: "Response Time", eLocal: 70, Networx: 65, Direct: 90, fullMark: 100 },
  { subject: "Conversion", eLocal: 34, Networx: 36, Direct: 51, fullMark: 100 },
  { subject: "Cost Efficiency", eLocal: 45, Networx: 72, Direct: 100, fullMark: 100 },
  { subject: "Customer Sat.", eLocal: 82, Networx: 78, Direct: 92, fullMark: 100 },
];

const conversionFunnelData = [
  { stage: "Leads", count: 1637, percentage: 100 },
  { stage: "Contacted", count: 1389, percentage: 85 },
  { stage: "Quote Sent", count: 823, percentage: 50 },
  { stage: "Converted", count: 633, percentage: 39 },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("year");

  const totalRevenue = monthlyRevenueData.reduce((sum, m) => sum + m.revenue, 0);
  const totalLeads = sourceComparisonData.reduce((sum, s) => sum + s.leads, 0);
  const avgConversionRate = (sourceComparisonData.reduce((sum, s) => sum + s.converted, 0) / totalLeads * 100);
  const totalProfit = monthlyRevenueData.reduce((sum, m) => sum + m.profit, 0);

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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold">${(totalRevenue / 1000).toFixed(0)}k</p>
                <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12.5% vs last year</span>
                </div>
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
                <p className="text-2xl font-bold">{totalLeads.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+8.2% vs last year</span>
                </div>
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
                <p className="text-2xl font-bold">{avgConversionRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+2.1% vs last year</span>
                </div>
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
                <p className="text-2xl font-bold">${(totalProfit / 1000).toFixed(0)}k</p>
                <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+15.3% vs last year</span>
                </div>
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
          <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          <TabsTrigger value="technicians" data-testid="tab-technicians">Technicians</TabsTrigger>
          <TabsTrigger value="location" data-testid="tab-location">Location</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
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
                    <BarChart data={sourceComparisonData}>
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
                  Source Quality Comparison
                </CardTitle>
                <CardDescription>Multi-dimensional source analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="eLocal" dataKey="eLocal" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                      <Radar name="Networx" dataKey="Networx" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                      <Radar name="Direct" dataKey="Direct" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.3} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Cost Per Lead Comparison
                </CardTitle>
                <CardDescription>Investment required per lead by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        type="category"
                        dataKey="source"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        width={80}
                      />
                      <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="costPerLead" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Cost/Lead" />
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
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionFunnelData} layout="vertical">
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
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceComparisonData.map((source) => (
                      <tr key={source.source} className="border-b last:border-0">
                        <td className="py-3 px-4 font-medium">{source.source}</td>
                        <td className="text-right py-3 px-4">{source.leads}</td>
                        <td className="text-right py-3 px-4 text-green-500">{source.converted}</td>
                        <td className="text-right py-3 px-4">
                          <Badge variant={((source.converted / source.leads) * 100) > 40 ? "default" : "secondary"} className="text-xs">
                            {((source.converted / source.leads) * 100).toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4">${source.cost.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">${source.costPerLead}</td>
                        <td className="text-right py-3 px-4">{source.avgResponse} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Monthly Revenue, Expenses & Profit
                </CardTitle>
                <CardDescription>Year-over-year financial performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenueData}>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <LineChart data={monthlyRevenueData}>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Weekly Conversion Trend
                </CardTitle>
                <CardDescription>Recent weekly performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Legend />
                      <Bar dataKey="calls" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Calls" />
                      <Bar dataKey="quotes" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Quotes" />
                      <Bar dataKey="conversions" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Conversions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Service Type Distribution
                </CardTitle>
                <CardDescription>Jobs completed by service category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceBreakdownData}
                        cx="50%"
                        cy="45%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {serviceBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
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
                <CardDescription>Total revenue generated per service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceBreakdownData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis 
                        type="number" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        width={100}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Service Breakdown
              </CardTitle>
              <CardDescription>Detailed service performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceBreakdownData.map((service) => {
                const total = serviceBreakdownData.reduce((sum, s) => sum + s.value, 0);
                const percentage = ((service.value / total) * 100).toFixed(1);
                return (
                  <div key={service.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: service.color }}
                        />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{service.value} jobs</span>
                        <span>${service.revenue.toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">
                          Avg: ${service.avgTicket}
                        </Badge>
                        <span className="font-semibold text-foreground w-12 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: service.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technicians" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Technician Performance Comparison
                </CardTitle>
                <CardDescription>Jobs completed and success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={techPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Legend />
                      <Bar dataKey="jobs" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Jobs" />
                      <Bar dataKey="rate" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Success %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Revenue by Technician
                </CardTitle>
                <CardDescription>Total revenue generated per technician</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={techPerformanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis 
                        type="number" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Technician Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Technician</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Jobs</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Success Rate</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg/Job</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Verified Arrivals</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Job Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {techPerformanceData.map((tech) => (
                      <tr key={tech.name} className="border-b last:border-0">
                        <td className="py-3 px-4 font-medium">{tech.name}</td>
                        <td className="text-right py-3 px-4">{tech.jobs}</td>
                        <td className="text-right py-3 px-4">
                          <Badge variant={tech.rate >= 90 ? "default" : "secondary"} className="text-xs">
                            {tech.rate}%
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          ${tech.revenue.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${(tech.revenue / tech.jobs).toFixed(0)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <MapPin className="w-3 h-3 text-green-500" />
                            <span>{tech.verified}/{tech.jobs}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>{tech.avgTime}h</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
                    <MapPin className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold">89%</p>
                  <p className="text-sm text-muted-foreground">Verified Arrivals</p>
                  <p className="text-xs text-green-500 mt-1">Within 100ft radius</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-3">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-3xl font-bold">12 min</p>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-xs text-amber-500 mt-1">Lead to first contact</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">2.4h</p>
                  <p className="text-sm text-muted-foreground">Avg Job Duration</p>
                  <p className="text-xs text-primary mt-1">Across all services</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Location Verification by Technician
                </CardTitle>
                <CardDescription>Percentage of arrivals verified within radius</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationVerificationData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Legend />
                      <Bar dataKey="verified" stackId="a" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} name="Verified %" />
                      <Bar dataKey="unverified" stackId="a" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Unverified %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Verification Breakdown
                </CardTitle>
                <CardDescription>All arrival verification status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Verified", value: 412, color: "hsl(142 71% 45%)" },
                          { name: "Not Verified", value: 51, color: "hsl(var(--muted))" },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="hsl(142 71% 45%)" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
