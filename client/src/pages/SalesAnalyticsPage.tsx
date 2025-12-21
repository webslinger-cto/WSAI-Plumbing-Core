import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Briefcase, Users, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import type { Job, Lead, Quote, SalesCommission } from "@shared/schema";

interface SalesAnalyticsPageProps {
  salespersonId: string;
  fullName: string;
}

export default function SalesAnalyticsPage({ salespersonId, fullName }: SalesAnalyticsPageProps) {
  const { data: commissions = [], isLoading: loadingCommissions } = useQuery<SalesCommission[]>({
    queryKey: ['/api/salespersons', salespersonId, 'commissions'],
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  const { data: leads = [], isLoading: loadingLeads } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  const { data: quotes = [], isLoading: loadingQuotes } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
  });

  const isLoading = loadingCommissions || loadingJobs || loadingLeads || loadingQuotes;

  const myJobs = jobs.filter(j => j.assignedSalespersonId === salespersonId);
  const completedJobs = myJobs.filter(j => j.status === "completed");
  const cancelledJobs = myJobs.filter(j => j.status === "cancelled");

  const totalRevenue = commissions.reduce((sum, c) => sum + parseFloat(c.jobRevenue || "0"), 0);
  const totalProfit = commissions.reduce((sum, c) => sum + parseFloat(c.netProfit || "0"), 0);
  const totalCommission = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount || "0"), 0);

  const conversionRate = myJobs.length > 0 
    ? ((completedJobs.length / myJobs.length) * 100).toFixed(1)
    : "0";

  const avgJobValue = completedJobs.length > 0
    ? (totalRevenue / completedJobs.length).toFixed(2)
    : "0";

  const jobStatusData = [
    { name: "Completed", value: completedJobs.length, color: "hsl(var(--primary))" },
    { name: "Active", value: myJobs.filter(j => j.status === "in_progress" || j.status === "assigned").length, color: "hsl(var(--accent))" },
    { name: "Cancelled", value: cancelledJobs.length, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  const monthlyData = commissions.reduce((acc, c) => {
    if (c.createdAt) {
      const month = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short' });
      const existing = acc.find(a => a.month === month);
      const amount = parseFloat(c.commissionAmount || "0");
      if (existing) {
        existing.commission += amount;
      } else {
        acc.push({ month, commission: amount });
      }
    }
    return acc;
  }, [] as { month: string; commission: number }[]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-analytics-title">Sales Analytics</h1>
        <p className="text-muted-foreground">Performance metrics and trends for {fullName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">From {completedJobs.length} completed jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-net-profit">
              ${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">After all expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversion-rate">
              {conversionRate}%
            </div>
            <p className="text-xs text-muted-foreground">{completedJobs.length} of {myJobs.length} jobs completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Job Value</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-job-value">
              ${parseFloat(avgJobValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Per completed job</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job Status Distribution</CardTitle>
            <CardDescription>Breakdown of your assigned jobs by status</CardDescription>
          </CardHeader>
          <CardContent>
            {jobStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={jobStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {jobStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No job data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Commission Trend</CardTitle>
            <CardDescription>Your commission earnings over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Commission']} />
                  <Bar dataKey="commission" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No commission data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Assigned Jobs</p>
              <p className="text-3xl font-bold" data-testid="text-total-jobs">{myJobs.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Commission Earned</p>
              <p className="text-3xl font-bold text-green-500" data-testid="text-earned-commission">
                ${totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Cancellation Rate</p>
              <p className="text-3xl font-bold" data-testid="text-cancellation-rate">
                {myJobs.length > 0 ? ((cancelledJobs.length / myJobs.length) * 100).toFixed(1) : "0"}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
