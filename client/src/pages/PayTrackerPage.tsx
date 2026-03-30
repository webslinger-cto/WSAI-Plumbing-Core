import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Briefcase,
  CheckCircle,
  ArrowRight,
  Calendar,
  Receipt,
  Wallet,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CompletedJobDetail {
  jobId: string;
  customerName: string;
  serviceType: string;
  address: string | null;
  completedAt: string | null;
  revenue: number;
  hoursWorked: number;
  hourlyPay: number;
  commission: number;
  totalEarned: number;
  isEmergency: boolean;
  leadFee: number;
}

interface ProjectedJob {
  jobId: string;
  customerName: string;
  serviceType: string;
  address: string | null;
  status: string | null;
  scheduledDate: string | null;
  estimatedRevenue: number;
  estimatedHours: number;
  estimatedHourlyPay: number;
  estimatedCommission: number;
  estimatedTotal: number;
  leadFee: number;
}

interface PayrollHistoryRecord {
  id: string;
  periodStartDate: string;
  periodEndDate: string;
  periodStatus: string;
  regularHours: string;
  overtimeHours: string;
  regularPay: string;
  overtimePay: string;
  commissionPay: string;
  grossPay: string;
  netPay: string;
  leadFeeDeductions: string;
  isPaid: boolean;
  paidAt: string | null;
}

interface PayTrackerData {
  technicianId: string;
  technicianName: string;
  userId: string | null;
  hourlyRate: number;
  commissionRate: number;
  status: string | null;
  summary: {
    totalJobsCompleted: number;
    totalActiveJobs: number;
    totalRevenue: number;
    totalHoursWorked: number;
    totalHourlyPay: number;
    totalCommission: number;
    totalLeadFees: number;
    totalEarned: number;
    netEarned: number;
    totalPaid: number;
    projectedEarnings: number;
    projectedLeadFees: number;
    projectedNet: number;
  };
  completedJobs: CompletedJobDetail[];
  projectedJobs: ProjectedJob[];
  payrollHistory: PayrollHistoryRecord[];
}

export default function PayTrackerPage() {
  const [selectedTechId, setSelectedTechId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: trackers = [], isLoading } = useQuery<PayTrackerData[]>({
    queryKey: ["/api/pay-tracker"],
    queryFn: async () => {
      const res = await fetch("/api/pay-tracker");
      if (!res.ok) throw new Error("Failed to fetch pay tracker data");
      return res.json();
    },
  });

  const selectedTracker = useMemo(() => {
    if (selectedTechId === "all") return null;
    return trackers.find(t => t.technicianId === selectedTechId) || null;
  }, [trackers, selectedTechId]);

  const aggregateSummary = useMemo(() => {
    return {
      totalEmployees: trackers.length,
      totalJobsCompleted: trackers.reduce((s, t) => s + t.summary.totalJobsCompleted, 0),
      totalRevenue: trackers.reduce((s, t) => s + t.summary.totalRevenue, 0),
      totalEarned: trackers.reduce((s, t) => s + t.summary.totalEarned, 0),
      totalPaid: trackers.reduce((s, t) => s + t.summary.totalPaid, 0),
      totalProjected: trackers.reduce((s, t) => s + t.summary.projectedEarnings, 0),
      totalActiveJobs: trackers.reduce((s, t) => s + t.summary.totalActiveJobs, 0),
    };
  }, [trackers]);

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase();

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "assigned": return "secondary";
      case "confirmed": return "default";
      case "en_route": return "default";
      case "on_site": return "default";
      case "in_progress": return "default";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-pay-tracker-title">
            Pay Tracker
          </h1>
          <p className="text-muted-foreground">
            Track earnings, commissions, and payroll for all employees
          </p>
        </div>
        <div className="w-64">
          <Select value={selectedTechId} onValueChange={setSelectedTechId}>
            <SelectTrigger data-testid="select-employee">
              <SelectValue placeholder="Select Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {trackers.map(t => (
                <SelectItem key={t.technicianId} value={t.technicianId}>
                  {t.technicianName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTechId === "all" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Earned</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-total-earned">
                      {formatCurrency(aggregateSummary.totalEarned)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{aggregateSummary.totalJobsCompleted} jobs completed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-total-paid">
                      {formatCurrency(aggregateSummary.totalPaid)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">From processed payroll</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Projected</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-projected">
                      {formatCurrency(aggregateSummary.totalProjected)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{aggregateSummary.totalActiveJobs} active jobs</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-total-revenue">
                      {formatCurrency(aggregateSummary.totalRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">From completed jobs</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <Receipt className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employee Earnings Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {trackers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No employees found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Jobs</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Hourly Pay</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Lead Fees</TableHead>
                      <TableHead className="text-right">Net Earned</TableHead>
                      <TableHead className="text-right">Projected</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackers.map(tracker => (
                      <TableRow key={tracker.technicianId} data-testid={`row-employee-${tracker.technicianId}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(tracker.technicianName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{tracker.technicianName}</p>
                              <p className="text-xs text-muted-foreground">${tracker.hourlyRate}/hr + {(tracker.commissionRate * 100).toFixed(0)}%</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{tracker.summary.totalJobsCompleted}</TableCell>
                        <TableCell className="text-right">{tracker.summary.totalHoursWorked.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tracker.summary.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tracker.summary.totalHourlyPay)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tracker.summary.totalCommission)}</TableCell>
                        <TableCell className="text-right text-destructive">-{formatCurrency(tracker.summary.totalLeadFees)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(tracker.summary.netEarned)}</TableCell>
                        <TableCell className="text-right text-blue-500">{formatCurrency(tracker.summary.projectedEarnings)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedTechId(tracker.technicianId)}
                            data-testid={`button-view-detail-${tracker.technicianId}`}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : selectedTracker ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Earned</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(selectedTracker.summary.totalEarned)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTracker.summary.totalJobsCompleted} completed jobs</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Net After Fees</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(selectedTracker.summary.netEarned)}</p>
                    <p className="text-xs text-muted-foreground mt-1">After ${selectedTracker.summary.totalLeadFees} lead fees</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Wallet className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Hours Worked</p>
                    <p className="text-2xl font-bold mt-1">{selectedTracker.summary.totalHoursWorked.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-1">${selectedTracker.hourlyRate}/hr rate</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Projected</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(selectedTracker.summary.projectedNet)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTracker.summary.totalActiveJobs} upcoming jobs</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(selectedTracker.technicianName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{selectedTracker.technicianName}</h2>
              <p className="text-sm text-muted-foreground">
                ${selectedTracker.hourlyRate}/hr + {(selectedTracker.commissionRate * 100).toFixed(0)}% commission
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Briefcase className="w-4 h-4 mr-2" />
                Completed Jobs
              </TabsTrigger>
              <TabsTrigger value="projected" data-testid="tab-projected">
                <TrendingUp className="w-4 h-4 mr-2" />
                Projected
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">
                <Calendar className="w-4 h-4 mr-2" />
                Payroll History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Jobs - Earnings Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTracker.completedJobs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No completed jobs yet</p>
                  ) : (
                    <ScrollArea className="max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Hourly Pay</TableHead>
                            <TableHead className="text-right">Commission</TableHead>
                            <TableHead className="text-right">Lead Fee</TableHead>
                            <TableHead className="text-right">Net</TableHead>
                            <TableHead>Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedTracker.completedJobs.map(job => (
                            <TableRow key={job.jobId} data-testid={`row-completed-job-${job.jobId}`}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{job.customerName}</p>
                                  {job.address && <p className="text-xs text-muted-foreground">{job.address}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">{job.serviceType}</span>
                                  {job.isEmergency && <Badge variant="destructive" className="text-[10px] px-1">EMRG</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(job.revenue)}</TableCell>
                              <TableCell className="text-right">{job.hoursWorked.toFixed(1)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(job.hourlyPay)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(job.commission)}</TableCell>
                              <TableCell className="text-right text-destructive">-{formatCurrency(job.leadFee)}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(job.totalEarned - job.leadFee)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {job.completedAt ? formatDate(job.completedAt) : "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={2}>Totals</TableCell>
                            <TableCell className="text-right">{formatCurrency(selectedTracker.summary.totalRevenue)}</TableCell>
                            <TableCell className="text-right">{selectedTracker.summary.totalHoursWorked.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(selectedTracker.summary.totalHourlyPay)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(selectedTracker.summary.totalCommission)}</TableCell>
                            <TableCell className="text-right text-destructive">-{formatCurrency(selectedTracker.summary.totalLeadFees)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(selectedTracker.summary.netEarned)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projected">
              <Card>
                <CardHeader>
                  <CardTitle>Projected Earnings - Active/Upcoming Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTracker.projectedJobs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No active or upcoming jobs</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled</TableHead>
                          <TableHead className="text-right">Est. Revenue</TableHead>
                          <TableHead className="text-right">Est. Hours</TableHead>
                          <TableHead className="text-right">Est. Pay</TableHead>
                          <TableHead className="text-right">Est. Commission</TableHead>
                          <TableHead className="text-right">Lead Fee</TableHead>
                          <TableHead className="text-right">Est. Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTracker.projectedJobs.map(job => (
                          <TableRow key={job.jobId} data-testid={`row-projected-job-${job.jobId}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{job.customerName}</p>
                                {job.address && <p className="text-xs text-muted-foreground">{job.address}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{job.serviceType}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(job.status)}>{job.status?.replace(/_/g, " ") || "pending"}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{formatDate(job.scheduledDate)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(job.estimatedRevenue)}</TableCell>
                            <TableCell className="text-right">{job.estimatedHours.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(job.estimatedHourlyPay)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(job.estimatedCommission)}</TableCell>
                            <TableCell className="text-right text-destructive">-{formatCurrency(job.leadFee)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(job.estimatedTotal - job.leadFee)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 font-semibold">
                          <TableCell colSpan={4}>Projected Totals</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(selectedTracker.projectedJobs.reduce((s, j) => s + j.estimatedRevenue, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {selectedTracker.projectedJobs.reduce((s, j) => s + j.estimatedHours, 0).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(selectedTracker.projectedJobs.reduce((s, j) => s + j.estimatedHourlyPay, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(selectedTracker.projectedJobs.reduce((s, j) => s + j.estimatedCommission, 0))}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            -{formatCurrency(selectedTracker.summary.projectedLeadFees)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(selectedTracker.summary.projectedNet)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Payroll History</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTracker.payrollHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No payroll records yet. Process payroll from the Payroll page to see history here.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Reg Hours</TableHead>
                          <TableHead className="text-right">OT Hours</TableHead>
                          <TableHead className="text-right">Regular Pay</TableHead>
                          <TableHead className="text-right">OT Pay</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead className="text-right">Lead Fees</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTracker.payrollHistory.map((record: PayrollHistoryRecord) => (
                          <TableRow key={record.id} data-testid={`row-payroll-${record.id}`}>
                            <TableCell>
                              <p className="text-sm font-medium">{formatDate(record.periodStartDate)} - {formatDate(record.periodEndDate)}</p>
                            </TableCell>
                            <TableCell className="text-right">{parseFloat(record.regularHours).toFixed(1)}</TableCell>
                            <TableCell className="text-right">{parseFloat(record.overtimeHours).toFixed(1)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(record.regularPay))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(record.overtimePay))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(record.commissionPay))}</TableCell>
                            <TableCell className="text-right text-destructive">-{formatCurrency(parseFloat(record.leadFeeDeductions))}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(parseFloat(record.grossPay))}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(parseFloat(record.netPay))}</TableCell>
                            <TableCell>
                              {record.isPaid ? (
                                <Badge variant="default">Paid</Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Employee not found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
