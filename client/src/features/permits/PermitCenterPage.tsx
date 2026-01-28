import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileStack, Settings, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import type { Job } from "@shared/schema";

interface PermitPacket {
  id: string;
  jobId: string;
  status: string;
  permitTypeId: string;
  jurisdictionId: string;
  createdAt: string;
}

export default function PermitCenterPage() {
  const settingsQuery = useQuery<{ permitCenterEnabled: boolean }>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return { permitCenterEnabled: false };
      return res.json();
    },
  });

  const jobsQuery = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isEnabled = settingsQuery.data?.permitCenterEnabled;

  if (settingsQuery.isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading permit center...
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Permit Center Disabled</h2>
            <p className="text-muted-foreground text-center max-w-md">
              The Permit Center module is currently disabled. Enable it in Settings to start detecting and managing permits for your jobs.
            </p>
            <Link href="/settings">
              <span className="text-primary hover:underline cursor-pointer">
                Go to Settings
              </span>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobsWithPermitNeeds = (jobsQuery.data || []).filter(
    (j) => j.status !== "cancelled" && j.status !== "completed"
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-permit-center-title">
            <FileStack className="w-6 h-6" />
            Permit Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage permit detection, generation, and submission for your jobs
          </p>
        </div>
        <Link href="/settings">
          <Badge variant="outline" className="cursor-pointer hover-elevate">
            <Settings className="w-3 h-3 mr-1" />
            Configure
          </Badge>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-permit-stats-pending">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
            <p className="text-sm text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card data-testid="card-permit-stats-ready">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Ready to Submit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
            <p className="text-sm text-muted-foreground">Ready for filing</p>
          </CardContent>
        </Card>

        <Card data-testid="card-permit-stats-submitted">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileStack className="w-4 h-4 text-blue-500" />
              Submitted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
            <p className="text-sm text-muted-foreground">Filed with jurisdictions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Jobs</CardTitle>
          <CardDescription>
            Jobs that may require permits. Click on a job to view permit details in the Dispatcher Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading jobs...</div>
          ) : jobsWithPermitNeeds.length === 0 ? (
            <div className="text-muted-foreground">No active jobs found</div>
          ) : (
            <div className="space-y-2">
              {jobsWithPermitNeeds.slice(0, 10).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                  data-testid={`card-job-permit-${job.id}`}
                >
                  <div>
                    <div className="font-medium">{job.customerName}</div>
                    <div className="text-sm text-muted-foreground">{job.address}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{job.serviceType}</Badge>
                    <Badge variant="secondary">{job.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
