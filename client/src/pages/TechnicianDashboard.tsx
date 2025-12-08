import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import KPICard from "@/components/KPICard";
import QuoteBuilder from "@/components/QuoteBuilder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  CheckCircle,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Plus,
  Bell,
  Truck,
  PlayCircle,
  Navigation,
  AlertCircle,
} from "lucide-react";
import type { Job, Notification } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

const jobStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  assigned: { label: "Assigned", color: "bg-blue-500/20 text-blue-400", icon: Bell },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  en_route: { label: "En Route", color: "bg-amber-500/20 text-amber-400", icon: Truck },
  on_site: { label: "On Site", color: "bg-purple-500/20 text-purple-400", icon: MapPin },
  in_progress: { label: "In Progress", color: "bg-primary/20 text-primary", icon: PlayCircle },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive", icon: AlertCircle },
};

const DEMO_TECHNICIAN_ID = "tech-1";
const DEMO_USER_ID = "user-tech-1";

export default function TechnicianDashboard() {
  const { toast } = useToast();
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs", { technicianId: DEMO_TECHNICIAN_ID }],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?technicianId=${DEMO_TECHNICIAN_ID}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { userId: DEMO_USER_ID }],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?userId=${DEMO_USER_ID}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/confirm`, { technicianId: DEMO_TECHNICIAN_ID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job Confirmed", description: "You have confirmed this job assignment." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not confirm the job.", variant: "destructive" });
    },
  });

  const enRouteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/en-route`, { technicianId: DEMO_TECHNICIAN_ID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "En Route", description: "You are now en route to the job." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    },
  });

  const arriveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/arrive`, { technicianId: DEMO_TECHNICIAN_ID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Arrived", description: "You have arrived at the job site." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/start`, { technicianId: DEMO_TECHNICIAN_ID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job Started", description: "Work has begun." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not start job.", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/complete`, { technicianId: DEMO_TECHNICIAN_ID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setSelectedJob(null);
      toast({ title: "Job Completed", description: "Great work! The job has been marked complete." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not complete job.", variant: "destructive" });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);

  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const assignedJobs = jobs.filter(j => j.status === "assigned");
  const confirmedJobs = jobs.filter(j => j.status === "confirmed");
  const enRouteJobs = jobs.filter(j => j.status === "en_route");
  const onSiteJobs = jobs.filter(j => ["on_site", "in_progress"].includes(j.status));
  const completedToday = jobs.filter(j => j.status === "completed");

  function getNextAction(job: Job) {
    switch (job.status) {
      case "assigned":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); confirmMutation.mutate(job.id); }}
            disabled={confirmMutation.isPending}
            data-testid={`button-confirm-job-${job.id}`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm Job
          </Button>
        );
      case "confirmed":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); enRouteMutation.mutate(job.id); }}
            disabled={enRouteMutation.isPending}
            data-testid={`button-en-route-${job.id}`}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Start Driving
          </Button>
        );
      case "en_route":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); arriveMutation.mutate(job.id); }}
            disabled={arriveMutation.isPending}
            data-testid={`button-arrive-${job.id}`}
          >
            <MapPin className="w-4 h-4 mr-2" />
            I've Arrived
          </Button>
        );
      case "on_site":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); startMutation.mutate(job.id); }}
            disabled={startMutation.isPending}
            data-testid={`button-start-work-${job.id}`}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Work
          </Button>
        );
      case "in_progress":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); completeMutation.mutate(job.id); }}
            disabled={completeMutation.isPending}
            variant="default"
            data-testid={`button-complete-job-${job.id}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete Job
          </Button>
        );
      default:
        return null;
    }
  }

  function JobCard({ job }: { job: Job }) {
    const status = jobStatusConfig[job.status] || jobStatusConfig.pending;
    const StatusIcon = status.icon;

    return (
      <div
        className="p-4 rounded-lg bg-muted/30 border hover-elevate cursor-pointer transition-all"
        onClick={() => setSelectedJob(job)}
        data-testid={`job-card-${job.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold" data-testid={`text-job-customer-${job.id}`}>
                {job.customerName}
              </h3>
              <Badge className={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {job.serviceType}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {job.scheduledDate && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(job.scheduledDate), "MMM d")} {job.scheduledTimeStart && `at ${job.scheduledTimeStart}`}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {job.customerPhone}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{job.address}, {job.city}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          {getNextAction(job)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">My Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your schedule for today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Notifications</h4>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications</p>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2 rounded-md text-sm cursor-pointer ${n.isRead ? "bg-muted/30" : "bg-primary/10"}`}
                          onClick={() => {
                            if (!n.isRead) {
                              markNotificationReadMutation.mutate(n.id);
                            }
                          }}
                          data-testid={`notification-${n.id}`}
                        >
                          <p className="font-medium">{n.title}</p>
                          <p className="text-muted-foreground text-xs">{n.message}</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {n.createdAt && formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={() => setShowQuoteBuilder(true)} data-testid="button-new-quote">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Jobs"
          value={String(activeJobs.length)}
          icon={<ClipboardList className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Needs Confirmation"
          value={String(assignedJobs.length)}
          icon={<Bell className="w-5 h-5 text-muted-foreground" />}
          variant={assignedJobs.length > 0 ? "warning" : "default"}
        />
        <KPICard
          title="Completed Today"
          value={String(completedToday.length)}
          icon={<CheckCircle className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Unread Notifications"
          value={String(unreadNotifications.length)}
          icon={<Bell className="w-5 h-5 text-muted-foreground" />}
          variant={unreadNotifications.length > 0 ? "warning" : "default"}
        />
      </div>

      {assignedJobs.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Jobs Awaiting Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {jobsLoading ? (
                <p className="text-muted-foreground text-center py-4">Loading jobs...</p>
              ) : activeJobs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No active jobs assigned</p>
              ) : (
                activeJobs
                  .filter(j => j.status !== "assigned")
                  .map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {completedToday.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No completed jobs yet</p>
                  ) : (
                    completedToday.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border"
                        data-testid={`completed-job-${job.id}`}
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{job.customerName}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.serviceType}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showQuoteBuilder} onOpenChange={setShowQuoteBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Quote</DialogTitle>
          </DialogHeader>
          <QuoteBuilder
            onSave={(quote) => {
              console.log("Quote saved:", quote);
              setShowQuoteBuilder(false);
            }}
            onSend={(quote) => {
              console.log("Quote sent:", quote);
              setShowQuoteBuilder(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Details - {selectedJob?.customerName}</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList>
                <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
                <TabsTrigger value="quote" data-testid="tab-quote">Quote</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedJob.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedJob.customerPhone}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedJob.address}, {selectedJob.city}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium">{selectedJob.serviceType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={jobStatusConfig[selectedJob.status]?.color}>
                      {jobStatusConfig[selectedJob.status]?.label || selectedJob.status}
                    </Badge>
                  </div>
                  {selectedJob.scheduledDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="font-medium">
                        {format(new Date(selectedJob.scheduledDate), "MMM d, yyyy")} {selectedJob.scheduledTimeStart && `at ${selectedJob.scheduledTimeStart}`}
                      </p>
                    </div>
                  )}
                  {selectedJob.description && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedJob.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-4 flex-wrap">
                  {getNextAction(selectedJob)}
                  <Button variant="outline" data-testid="button-call-customer">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Customer
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="quote" className="mt-4">
                <QuoteBuilder
                  customerName={selectedJob.customerName}
                  customerPhone={selectedJob.customerPhone}
                  customerAddress={`${selectedJob.address}, ${selectedJob.city}`}
                  onSave={(quote) => {
                    console.log("Quote saved:", quote);
                    setSelectedJob(null);
                  }}
                  onSend={(quote) => {
                    console.log("Quote sent:", quote);
                    setSelectedJob(null);
                  }}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
