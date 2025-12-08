import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  zipCode: string;
  source: "eLocal" | "Networx" | "Direct" | "Angi" | "HomeAdvisor";
  service: string;
  status: "new" | "contacted" | "converted" | "lost" | "spam" | "duplicate";
  cost: number;
  date: string;
}

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
}

const statusStyles: Record<Lead["status"], string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  converted: "bg-green-500/10 text-green-400 border-green-500/30",
  lost: "bg-red-500/10 text-red-400 border-red-500/30",
  spam: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  duplicate: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

export default function LeadsTable({ leads, onLeadClick }: LeadsTableProps) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      lead.city.toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Lead Pipeline
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 w-[180px]"
                data-testid="input-search-leads"
              />
            </div>
            <Select
              value={sourceFilter}
              onValueChange={(v) => {
                setSourceFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]" data-testid="select-source-filter">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="eLocal">eLocal</SelectItem>
                <SelectItem value="Networx">Networx</SelectItem>
                <SelectItem value="Direct">Direct</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase">Name</TableHead>
                <TableHead className="text-xs uppercase">Contact</TableHead>
                <TableHead className="text-xs uppercase">Location</TableHead>
                <TableHead className="text-xs uppercase">Source</TableHead>
                <TableHead className="text-xs uppercase">Service</TableHead>
                <TableHead className="text-xs uppercase">Status</TableHead>
                <TableHead className="text-xs uppercase text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => onLeadClick?.(lead)}
                  data-testid={`row-lead-${lead.id}`}
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{lead.phone}</span>
                      {lead.email && (
                        <Mail className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.city}, {lead.state}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">
                    {lead.service}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs capitalize", statusStyles[lead.status])}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${lead.cost}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No leads found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of{" "}
              {filteredLeads.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
