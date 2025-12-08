import { useState } from "react";
import LeadsTable, { type Lead } from "@/components/LeadsTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Upload, Phone, Mail, MapPin, Calendar, DollarSign } from "lucide-react";

// todo: remove mock functionality
const mockLeads: Lead[] = [
  {
    id: "1",
    name: "Leonard Willis",
    phone: "708-289-7471",
    email: "lwillis@email.com",
    city: "Chicago",
    state: "IL",
    zipCode: "60628",
    source: "Networx",
    service: "Sewer Main - Clear",
    status: "new",
    cost: 31,
    date: "2025-12-06",
  },
  {
    id: "2",
    name: "Miguel Garcia",
    phone: "708-704-8356",
    city: "Chicago Heights",
    state: "IL",
    zipCode: "60411",
    source: "eLocal",
    service: "Plumbing",
    status: "contacted",
    cost: 80,
    date: "2025-12-05",
  },
  {
    id: "3",
    name: "Chanie Evans",
    phone: "773-966-9820",
    email: "chanieevans@yahoo.com",
    city: "Chicago",
    state: "IL",
    zipCode: "60620",
    source: "Networx",
    service: "Flood Control",
    status: "converted",
    cost: 32,
    date: "2025-12-06",
  },
  {
    id: "4",
    name: "Anthony Cunningham",
    phone: "708-897-6156",
    email: "broantcun@gmail.com",
    city: "Harvey",
    state: "IL",
    zipCode: "60426",
    source: "Networx",
    service: "Drain Clog/Blockage",
    status: "new",
    cost: 25,
    date: "2025-12-05",
  },
  {
    id: "5",
    name: "Armando Robles",
    phone: "312-404-7812",
    city: "Chicago",
    state: "IL",
    zipCode: "60637",
    source: "eLocal",
    service: "Plumbing",
    status: "duplicate",
    cost: 0,
    date: "2025-12-05",
  },
  {
    id: "6",
    name: "Takala Kelley",
    phone: "708-872-0048",
    city: "Calumet City",
    state: "IL",
    zipCode: "60409",
    source: "eLocal",
    service: "Plumbing",
    status: "converted",
    cost: 80,
    date: "2025-12-05",
  },
  {
    id: "7",
    name: "Rosevelt Payne",
    phone: "331-216-3033",
    email: "rpayne2552@gmail.com",
    city: "Oswego",
    state: "IL",
    zipCode: "60543",
    source: "Networx",
    service: "Plumbing",
    status: "new",
    cost: 41,
    date: "2025-12-05",
  },
  {
    id: "8",
    name: "Melendez Smalley",
    phone: "773-891-8323",
    email: "melendez12@gmail.com",
    city: "Chicago",
    state: "IL",
    zipCode: "60621",
    source: "Networx",
    service: "Sewer Main - Clear",
    status: "contacted",
    cost: 52,
    date: "2025-11-28",
  },
];

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Manage and track all incoming leads from your sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export-leads">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button data-testid="button-import-leads">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <LeadsTable leads={mockLeads} onLeadClick={setSelectedLead} />

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedLead.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {selectedLead.source}
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className="capitalize"
                >
                  {selectedLead.status}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedLead.phone}</span>
                  </div>
                  {selectedLead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedLead.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {selectedLead.city}, {selectedLead.state} {selectedLead.zipCode}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedLead.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>Lead Cost: ${selectedLead.cost}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-1">Service Requested</p>
                <p className="text-sm text-muted-foreground">{selectedLead.service}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" data-testid="button-create-quote">
                  Create Quote
                </Button>
                <Button variant="outline" className="flex-1" data-testid="button-update-status">
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
