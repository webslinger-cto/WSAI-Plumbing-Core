import { useState } from "react";
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
  ClipboardList,
  DollarSign,
  CheckCircle,
  Clock,
  Phone,
  MapPin,
  Plus,
  FileText,
} from "lucide-react";

interface Job {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  service: string;
  status: "pending" | "in-progress" | "completed";
  scheduledTime: string;
  estimatedValue: number;
}

// todo: remove mock functionality
const mockJobs: Job[] = [
  {
    id: "1",
    customerName: "Leonard Willis",
    phone: "(708) 289-7471",
    address: "12131 S. Princeton Ave, Chicago, IL 60628",
    service: "Sewer Main - Clear",
    status: "pending",
    scheduledTime: "10:00 AM",
    estimatedValue: 350,
  },
  {
    id: "2",
    customerName: "Chanie Evans",
    phone: "(773) 966-9820",
    address: "9151 S Parnell Ave, Chicago, IL 60620",
    service: "Flood Control Installation",
    status: "in-progress",
    scheduledTime: "2:00 PM",
    estimatedValue: 850,
  },
  {
    id: "3",
    customerName: "Anthony Cunningham",
    phone: "(708) 897-6156",
    address: "15421 Turlington Ave, Harvey, IL 60426",
    service: "Drain Clog/Blockage - Clear",
    status: "pending",
    scheduledTime: "4:30 PM",
    estimatedValue: 175,
  },
];

const mockRecentQuotes = [
  { id: "Q001", customer: "M. Garcia", amount: 850, status: "sent", date: "Today" },
  { id: "Q002", customer: "T. Kelley", amount: 450, status: "paid", date: "Yesterday" },
  { id: "Q003", customer: "J. Smith", amount: 275, status: "draft", date: "Dec 4" },
];

export default function TechnicianDashboard() {
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const statusStyles = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    "in-progress": "bg-blue-500/10 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/10 text-green-400 border-green-500/30",
  };

  const quoteStatusStyles = {
    draft: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    sent: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    paid: "bg-green-500/10 text-green-400 border-green-500/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your schedule for today.
          </p>
        </div>
        <Button onClick={() => setShowQuoteBuilder(true)} data-testid="button-new-quote">
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Today's Jobs"
          value="3"
          icon={<ClipboardList className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Pending"
          value="2"
          icon={<Clock className="w-5 h-5 text-muted-foreground" />}
          variant="warning"
        />
        <KPICard
          title="Completed"
          value="1"
          icon={<CheckCircle className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Today's Est. Revenue"
          value="$1,375"
          icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-lg bg-muted/30 border hover-elevate cursor-pointer transition-all"
                  onClick={() => setSelectedJob(job)}
                  data-testid={`job-card-${job.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{job.customerName}</h3>
                        <Badge
                          variant="outline"
                          className={statusStyles[job.status]}
                        >
                          {job.status.replace("-", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {job.service}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {job.scheduledTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {job.phone}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{job.address}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green-500">
                        ${job.estimatedValue}
                      </p>
                      <p className="text-xs text-muted-foreground">estimated</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Recent Quotes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {mockRecentQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border"
                      data-testid={`quote-${quote.id}`}
                    >
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{quote.customer}</p>
                          <Badge
                            variant="outline"
                            className={quoteStatusStyles[quote.status as keyof typeof quoteStatusStyles]}
                          >
                            {quote.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{quote.date}</p>
                      </div>
                      <span className="font-semibold">${quote.amount}</span>
                    </div>
                  ))}
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
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="quote">Quote</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedJob.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedJob.phone}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedJob.address}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium">{selectedJob.service}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="font-medium">{selectedJob.scheduledTime}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" data-testid="button-start-job">
                    Start Job
                  </Button>
                  <Button variant="outline" className="flex-1" data-testid="button-call-customer">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Customer
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="quote" className="mt-4">
                <QuoteBuilder
                  customerName={selectedJob.customerName}
                  customerPhone={selectedJob.phone}
                  customerAddress={selectedJob.address}
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
