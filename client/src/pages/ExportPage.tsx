import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Users,
  Briefcase,
  UserCheck,
  Receipt,
  CheckCircle,
} from "lucide-react";

interface ExportData {
  leads: any[];
  jobs: any[];
  technicians: any[];
  quotes: any[];
}

export default function ExportPage() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const { data: exportData, isLoading } = useQuery<ExportData>({
    queryKey: ["/api/export"],
  });

  const handleExportCSV = async () => {
    setIsExporting("csv");
    try {
      const response = await fetch("/api/export?format=csv");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Your CSV file has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate the export file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting("pdf");
    try {
      if (!exportData) throw new Error("No data available");

      let content = `CHICAGO SEWER EXPERTS - CRM DATA EXPORT\n`;
      content += `Generated: ${new Date().toLocaleString()}\n`;
      content += `${"=".repeat(60)}\n\n`;

      content += `LEADS (${exportData.leads.length} records)\n`;
      content += `${"-".repeat(40)}\n`;
      exportData.leads.forEach((l: any, i: number) => {
        content += `${i + 1}. ${l.name}\n`;
        content += `   Phone: ${l.phone} | Email: ${l.email || "N/A"}\n`;
        content += `   Address: ${l.address || "N/A"}, ${l.city || ""} ${l.zip || ""}\n`;
        content += `   Source: ${l.source} | Status: ${l.status} | Service: ${l.service}\n`;
        content += `   Lead Cost: $${l.leadCost} | Created: ${l.createdAt}\n\n`;
      });

      content += `\nJOBS (${exportData.jobs.length} records)\n`;
      content += `${"-".repeat(40)}\n`;
      exportData.jobs.forEach((j: any, i: number) => {
        content += `${i + 1}. Job ID: ${j.id}\n`;
        content += `   Customer: ${j.customerName} | Status: ${j.status}\n`;
        content += `   Service: ${j.serviceType} | Address: ${j.address}\n`;
        content += `   Scheduled: ${j.scheduledDate || "N/A"} ${j.scheduledTime || ""}\n`;
        content += `   Technician: ${j.technicianId || "Unassigned"}\n\n`;
      });

      content += `\nTECHNICIANS (${exportData.technicians.length} records)\n`;
      content += `${"-".repeat(40)}\n`;
      exportData.technicians.forEach((t: any, i: number) => {
        content += `${i + 1}. ${t.name}\n`;
        content += `   Phone: ${t.phone} | Email: ${t.email || "N/A"}\n`;
        content += `   Status: ${t.status} | Skill: ${t.skillLevel} | Jobs Today: ${t.completedJobsToday}\n\n`;
      });

      content += `\nQUOTES (${exportData.quotes.length} records)\n`;
      content += `${"-".repeat(40)}\n`;
      exportData.quotes.forEach((q: any, i: number) => {
        content += `${i + 1}. Quote for: ${q.customerName}\n`;
        content += `   Status: ${q.status} | Job ID: ${q.jobId}\n`;
        content += `   Subtotal: $${q.subtotal} | Tax: $${q.tax} | Total: $${q.total}\n`;
        content += `   Expires: ${q.expiresAt || "N/A"} | Created: ${q.createdAt}\n\n`;
      });

      content += `\n${"=".repeat(60)}\n`;
      content += `END OF EXPORT\n`;

      const blob = new Blob([content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm-export-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Your report file has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate the export file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  const stats = exportData ? [
    { label: "Leads", count: exportData.leads.length, icon: Users },
    { label: "Jobs", count: exportData.jobs.length, icon: Briefcase },
    { label: "Technicians", count: exportData.technicians.length, icon: UserCheck },
    { label: "Quotes", count: exportData.quotes.length, icon: Receipt },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
        <p className="text-muted-foreground">
          Download all CRM data including leads, jobs, technicians, and quotes
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.count}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <FileSpreadsheet className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>Spreadsheet Export</CardTitle>
                    <CardDescription>CSV format for Excel, Google Sheets</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Includes all data organized in sections:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Leads with contact info, source, status</li>
                    <li>Jobs with scheduling and revenue data</li>
                    <li>Technicians with performance metrics</li>
                    <li>Quotes with pricing details</li>
                  </ul>
                </div>
                <Button 
                  onClick={handleExportCSV} 
                  disabled={isExporting !== null}
                  className="w-full"
                  data-testid="button-export-csv"
                >
                  {isExporting === "csv" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download CSV Spreadsheet
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Report Export</CardTitle>
                    <CardDescription>Formatted text report</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Human-readable report format:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Easy to read and print</li>
                    <li>Organized by data category</li>
                    <li>Includes all record details</li>
                    <li>Date stamped for reference</li>
                  </ul>
                </div>
                <Button 
                  onClick={handleExportPDF} 
                  disabled={isExporting !== null}
                  variant="outline"
                  className="w-full"
                  data-testid="button-export-report"
                >
                  {isExporting === "pdf" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download Text Report
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Data Ready for Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All your CRM data is ready to export. The CSV format works with Excel, Google Sheets, 
                and other spreadsheet applications. The text report format is designed for easy reading 
                and printing. Both exports include all leads, jobs, technician information, and quotes 
                from your system.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
