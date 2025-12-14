import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Clock,
  Briefcase,
  Users,
  Download,
  Search,
  Award,
  AlertCircle,
} from "lucide-react";
import type { Technician, Job, Quote } from "@shared/schema";

interface PayrollSummary {
  technicianId: string;
  technicianName: string;
  classification: string;
  hourlyRate: number;
  commissionRate: number;
  emergencyRate: number;
  jobsCompleted: number;
  regularHours: number;
  emergencyHours: number;
  totalHours: number;
  regularPay: number;
  emergencyPay: number;
  commissionEarned: number;
  bonuses: number;
  grossPay: number;
  estimatedTax: number;
  netPay: number;
  avgJobDuration: number;
  efficiency: number;
}

type PayPeriod = "current" | "lastWeek" | "lastMonth" | "allTime";

function getDateRange(period: PayPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  switch (period) {
    case "current":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "lastWeek":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - now.getDay() - 1);
      break;
    case "lastMonth":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setDate(0);
      break;
    case "allTime":
    default:
      start = new Date(2020, 0, 1);
      break;
  }
  return { start, end };
}

export default function PayrollPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod>("current");
  const [search, setSearch] = useState("");
  const [selectedTech, setSelectedTech] = useState<PayrollSummary | null>(null);

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { start: periodStart, end: periodEnd } = useMemo(
    () => getDateRange(selectedPeriod),
    [selectedPeriod]
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.status !== "completed" || !j.completedAt) return false;
      const completedDate = new Date(j.completedAt);
      return completedDate >= periodStart && completedDate <= periodEnd;
    });
  }, [jobs, periodStart, periodEnd]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (q.status !== "accepted" || !q.acceptedAt) return false;
      const acceptedDate = new Date(q.acceptedAt);
      return acceptedDate >= periodStart && acceptedDate <= periodEnd;
    });
  }, [quotes, periodStart, periodEnd]);

  const calculatePayrollData = (): PayrollSummary[] => {
    return technicians.map((tech) => {
      const techJobs = filteredJobs.filter(
        (j) => j.assignedTechnicianId === tech.id
      );

      const techQuotes = filteredQuotes.filter(
        (q) => q.technicianId === tech.id
      );

      const totalQuoteRevenue = techQuotes.reduce(
        (sum, q) => sum + (parseFloat(String(q.total)) || 0),
        0
      );

      const jobsCompleted = techJobs.length;
      const hourlyRate = parseFloat(String(tech.hourlyRate)) || 25;
      const commissionRate = parseFloat(String(tech.commissionRate)) || 0.1;
      const emergencyRate = parseFloat(String(tech.emergencyRate)) || 1.5;

      let totalHoursWorked = 0;
      let emergencyHoursWorked = 0;

      techJobs.forEach((job) => {
        if (job.startedAt && job.completedAt) {
          const started = new Date(job.startedAt);
          const completed = new Date(job.completedAt);
          const hours = (completed.getTime() - started.getTime()) / (1000 * 60 * 60);
          
          const isEmergency = job.priority === "urgent" || job.priority === "high";
          if (isEmergency) {
            emergencyHoursWorked += hours;
          }
          totalHoursWorked += hours;
        } else if (job.estimatedDuration) {
          const hours = job.estimatedDuration / 60;
          totalHoursWorked += hours;
        }
      });

      const regularHours = totalHoursWorked - emergencyHoursWorked;
      const regularPay = regularHours * hourlyRate;
      const emergencyPay = emergencyHoursWorked * hourlyRate * emergencyRate;
      const commissionEarned = totalQuoteRevenue * commissionRate;
      
      const bonuses = jobsCompleted >= 10 ? 100 : jobsCompleted >= 5 ? 50 : 0;

      const grossPay = regularPay + emergencyPay + commissionEarned + bonuses;
      const estimatedTax = grossPay * 0.22;
      const netPay = grossPay - estimatedTax;

      const avgJobDuration = jobsCompleted > 0 ? (totalHoursWorked / jobsCompleted) * 60 : 0;
      
      const efficiency = jobsCompleted > 0 
        ? Math.min(100, Math.round((jobsCompleted / Math.max(1, totalHoursWorked)) * 100))
        : 0;

      return {
        technicianId: tech.id,
        technicianName: tech.fullName,
        classification: tech.classification || "junior",
        hourlyRate,
        commissionRate,
        emergencyRate,
        jobsCompleted,
        regularHours: Math.round(regularHours * 10) / 10,
        emergencyHours: Math.round(emergencyHoursWorked * 10) / 10,
        totalHours: Math.round(totalHoursWorked * 10) / 10,
        regularPay: Math.round(regularPay * 100) / 100,
        emergencyPay: Math.round(emergencyPay * 100) / 100,
        commissionEarned: Math.round(commissionEarned * 100) / 100,
        bonuses,
        grossPay: Math.round(grossPay * 100) / 100,
        estimatedTax: Math.round(estimatedTax * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        avgJobDuration: Math.round(avgJobDuration),
        efficiency,
      };
    });
  };

  const payrollData = calculatePayrollData();
  
  const filteredData = payrollData.filter((p) =>
    p.technicianName.toLowerCase().includes(search.toLowerCase())
  );

  const totals = filteredData.reduce(
    (acc, p) => ({
      jobsCompleted: acc.jobsCompleted + p.jobsCompleted,
      totalHours: acc.totalHours + p.totalHours,
      grossPay: acc.grossPay + p.grossPay,
      commissions: acc.commissions + p.commissionEarned,
      taxes: acc.taxes + p.estimatedTax,
    }),
    { jobsCompleted: 0, totalHours: 0, grossPay: 0, commissions: 0, taxes: 0 }
  );

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "senior":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      case "junior":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "digger":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-payroll-title">
            Payroll & Hours
          </h1>
          <p className="text-muted-foreground">
            Track technician hours, commissions, and pay estimates
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PayPeriod)}>
            <SelectTrigger className="w-40" data-testid="select-pay-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Period</SelectItem>
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="allTime">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-payroll">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Techs</p>
                <p className="text-2xl font-bold" data-testid="stat-active-techs">
                  {technicians.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Briefcase className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jobs Completed</p>
                <p className="text-2xl font-bold" data-testid="stat-jobs-completed">
                  {totals.jobsCompleted}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold" data-testid="stat-total-hours">
                  {Math.round(totals.totalHours * 10) / 10}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gross Payroll</p>
                <p className="text-2xl font-bold" data-testid="stat-gross-payroll">
                  ${Math.round(totals.grossPay).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Taxes</p>
                <p className="text-2xl font-bold" data-testid="stat-estimated-taxes">
                  ${Math.round(totals.taxes).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Technician Payroll Summary</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search technicians..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-payroll"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-center">Class</TableHead>
                  <TableHead className="text-center">Jobs</TableHead>
                  <TableHead className="text-center">Hours</TableHead>
                  <TableHead className="text-right">Hourly Pay</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Est. Tax</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No technicians found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((p) => (
                    <TableRow
                      key={p.technicianId}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedTech(p)}
                      data-testid={`row-tech-${p.technicianId}`}
                    >
                      <TableCell className="font-medium">{p.technicianName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getClassificationColor(p.classification)}>
                          {p.classification}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{p.jobsCompleted}</TableCell>
                      <TableCell className="text-center">
                        {p.totalHours}
                        {p.emergencyHours > 0 && (
                          <span className="text-amber-500 text-xs ml-1">
                            (+{p.emergencyHours} OT)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(p.regularPay + p.emergencyPay).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-500">
                        ${p.commissionEarned.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.bonuses > 0 ? (
                          <span className="text-amber-500">${p.bonuses}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${p.grossPay.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        -${p.estimatedTax.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-500">
                        ${p.netPay.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTech} onOpenChange={() => setSelectedTech(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payroll Details</DialogTitle>
          </DialogHeader>
          {selectedTech && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedTech.technicianName}</h3>
                  <Badge variant="outline" className={getClassificationColor(selectedTech.classification)}>
                    {selectedTech.classification} Technician
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Efficiency Score</p>
                  <p className="text-2xl font-bold">{selectedTech.efficiency}%</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{selectedTech.jobsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Jobs</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{selectedTech.totalHours}</p>
                  <p className="text-xs text-muted-foreground">Hours</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{selectedTech.avgJobDuration}m</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Efficiency Score</span>
                  <span>{selectedTech.efficiency}%</span>
                </div>
                <Progress value={selectedTech.efficiency} className="h-2" />
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pay Breakdown
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Regular Hours ({selectedTech.regularHours}h x ${selectedTech.hourlyRate})
                    </span>
                    <span>${selectedTech.regularPay.toFixed(2)}</span>
                  </div>
                  {selectedTech.emergencyHours > 0 && (
                    <div className="flex justify-between text-amber-500">
                      <span>
                        Emergency Hours ({selectedTech.emergencyHours}h x ${selectedTech.hourlyRate} x {selectedTech.emergencyRate})
                      </span>
                      <span>${selectedTech.emergencyPay.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-500">
                    <span>
                      Commission ({(selectedTech.commissionRate * 100).toFixed(0)}% of revenue)
                    </span>
                    <span>${selectedTech.commissionEarned.toFixed(2)}</span>
                  </div>
                  {selectedTech.bonuses > 0 && (
                    <div className="flex justify-between text-amber-500">
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        Performance Bonus
                      </span>
                      <span>${selectedTech.bonuses.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between font-medium">
                  <span>Gross Pay</span>
                  <span>${selectedTech.grossPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Estimated Tax (22%)</span>
                  <span>-${selectedTech.estimatedTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Net Pay</span>
                  <span className="text-green-500">${selectedTech.netPay.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
