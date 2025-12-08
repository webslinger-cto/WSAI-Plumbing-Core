import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "recharts";

// todo: remove mock functionality
const sourceComparisonData = [
  { source: "eLocal", leads: 847, cost: 67760, converted: 289, costPerLead: 80 },
  { source: "Networx", leads: 312, cost: 12480, converted: 112, costPerLead: 40 },
  { source: "Direct", leads: 88, cost: 0, converted: 45, costPerLead: 0 },
];

const monthlyRevenueData = [
  { month: "Jan", revenue: 12400, leads: 98 },
  { month: "Feb", revenue: 14200, leads: 112 },
  { month: "Mar", revenue: 18600, leads: 145 },
  { month: "Apr", revenue: 15800, leads: 128 },
  { month: "May", revenue: 21200, leads: 167 },
  { month: "Jun", revenue: 19400, leads: 158 },
  { month: "Jul", revenue: 22800, leads: 182 },
  { month: "Aug", revenue: 25400, leads: 201 },
  { month: "Sep", revenue: 23100, leads: 189 },
  { month: "Oct", revenue: 27800, leads: 223 },
  { month: "Nov", revenue: 24600, leads: 198 },
  { month: "Dec", revenue: 28900, leads: 234 },
];

const serviceBreakdownData = [
  { name: "Drain Cleaning", value: 412, color: "hsl(var(--chart-1))" },
  { name: "Sewer Main", value: 287, color: "hsl(var(--chart-2))" },
  { name: "Plumbing", value: 356, color: "hsl(var(--chart-3))" },
  { name: "Flood Control", value: 124, color: "hsl(var(--chart-4))" },
  { name: "Other", value: 68, color: "hsl(var(--chart-5))" },
];

const techPerformanceData = [
  { name: "Mike J.", jobs: 156, revenue: 28450, rate: 91 },
  { name: "Carlos R.", jobs: 98, revenue: 19200, rate: 87 },
  { name: "David S.", jobs: 67, revenue: 12800, rate: 87 },
  { name: "James W.", jobs: 89, revenue: 16750, rate: 91 },
  { name: "Robert B.", jobs: 45, revenue: 8900, rate: 84 },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("year");

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

      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources" data-testid="tab-sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          <TabsTrigger value="technicians" data-testid="tab-technicians">Technicians</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Lead Volume by Source
                </CardTitle>
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
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
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
                  Cost Per Lead Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        type="category"
                        dataKey="source"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`$${value}`, "Cost/Lead"]}
                      />
                      <Bar dataKey="costPerLead" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
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
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Cost/Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceComparisonData.map((source) => (
                      <tr key={source.source} className="border-b last:border-0">
                        <td className="py-3 px-4 font-medium">{source.source}</td>
                        <td className="text-right py-3 px-4">{source.leads}</td>
                        <td className="text-right py-3 px-4 text-green-500">{source.converted}</td>
                        <td className="text-right py-3 px-4">
                          {((source.converted / source.leads) * 100).toFixed(1)}%
                        </td>
                        <td className="text-right py-3 px-4">${source.cost.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">${source.costPerLead}</td>
                        <td className="text-right py-3 px-4">
                          ${source.cost > 0 ? (source.cost / source.converted).toFixed(2) : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Monthly Revenue & Lead Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "revenue" ? `$${value.toLocaleString()}` : value,
                        name === "revenue" ? "Revenue" : "Leads",
                      ]}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-5))", r: 4 }}
                      name="Revenue"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="leads"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                      name="Leads"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Service Type Distribution
                </CardTitle>
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
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Service Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {serviceBreakdownData.map((service) => {
                  const total = serviceBreakdownData.reduce((sum, s) => sum + s.value, 0);
                  const percentage = ((service.value / total) * 100).toFixed(1);
                  return (
                    <div key={service.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{service.name}</span>
                        <span className="font-medium">
                          {service.value} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
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
          </div>
        </TabsContent>

        <TabsContent value="technicians" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Technician Performance Comparison
              </CardTitle>
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
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
                    </tr>
                  </thead>
                  <tbody>
                    {techPerformanceData.map((tech) => (
                      <tr key={tech.name} className="border-b last:border-0">
                        <td className="py-3 px-4 font-medium">{tech.name}</td>
                        <td className="text-right py-3 px-4">{tech.jobs}</td>
                        <td className="text-right py-3 px-4 text-green-500">{tech.rate}%</td>
                        <td className="text-right py-3 px-4 font-medium">
                          ${tech.revenue.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${(tech.revenue / tech.jobs).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
