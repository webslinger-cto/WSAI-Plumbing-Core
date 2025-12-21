import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, Briefcase, Receipt, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { Job, Lead, Quote, SalesCommission, Salesperson } from "@shared/schema";

interface SalesDashboardProps {
  salespersonId: string;
  userId: string;
  fullName: string;
}

export default function SalesDashboard({ salespersonId, fullName }: SalesDashboardProps) {
  const { data: salesperson, isLoading: loadingSalesperson } = useQuery<Salesperson>({
    queryKey: ['/api/salespersons', salespersonId],
  });

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

  const isLoading = loadingSalesperson || loadingCommissions || loadingJobs || loadingLeads || loadingQuotes;

  const myJobs = jobs.filter(j => j.assignedSalespersonId === salespersonId);
  const completedJobs = myJobs.filter(j => j.status === "completed");
  const activeJobs = myJobs.filter(j => j.status === "in_progress" || j.status === "assigned");

  const totalCommissions = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount || "0"), 0);
  const pendingCommissions = commissions.filter(c => c.status === "pending").reduce((sum, c) => sum + parseFloat(c.commissionAmount || "0"), 0);
  const paidCommissions = commissions.filter(c => c.status === "paid").reduce((sum, c) => sum + parseFloat(c.commissionAmount || "0"), 0);

  const commissionRate = salesperson?.commissionRate ? (parseFloat(salesperson.commissionRate) * 100).toFixed(0) : "15";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-welcome-sales">
          Welcome back, {fullName}
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" data-testid="badge-sales-status">
            {salesperson?.status || "available"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Commission Rate: {commissionRate}%
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-total-commissions">
              ${totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {commissions.length} completed jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500" data-testid="text-pending-commissions">
              ${pendingCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-jobs">
              {activeJobs.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-jobs">
              {completedJobs.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully closed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Commissions
            </CardTitle>
            <CardDescription>Your latest commission earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No commissions yet</p>
                <p className="text-xs">Complete jobs to earn commissions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {commissions.slice(0, 5).map((commission) => (
                  <div key={commission.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50" data-testid={`commission-row-${commission.id}`}>
                    <div>
                      <p className="font-medium text-sm">Job #{commission.jobId?.slice(-6)}</p>
                      <p className="text-xs text-muted-foreground">
                        Net Profit: ${parseFloat(commission.netProfit || "0").toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-500">
                        +${parseFloat(commission.commissionAmount || "0").toFixed(2)}
                      </p>
                      <Badge variant={commission.status === "paid" ? "default" : "secondary"} className="text-xs">
                        {commission.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              My Active Jobs
            </CardTitle>
            <CardDescription>Jobs assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {activeJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Briefcase className="h-8 w-8 mb-2" />
                <p>No active jobs</p>
                <p className="text-xs">Check leads for new opportunities</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50" data-testid={`job-row-${job.id}`}>
                    <div>
                      <p className="font-medium text-sm">{job.serviceType}</p>
                      <p className="text-xs text-muted-foreground">{job.address}</p>
                    </div>
                    <Badge variant={job.status === "in_progress" ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Commission Breakdown
          </CardTitle>
          <CardDescription>How your commissions are calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Your Commission Rate</p>
              <p className="text-2xl font-bold">{commissionRate}%</p>
              <p className="text-xs text-muted-foreground">of Net Profit</p>
            </div>
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Total Paid Out</p>
              <p className="text-2xl font-bold text-green-500">${paidCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">Already received</p>
            </div>
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Total Jobs</p>
              <p className="text-2xl font-bold">{myJobs.length}</p>
              <p className="text-xs text-muted-foreground">Lifetime assignments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
