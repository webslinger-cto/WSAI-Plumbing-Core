import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Customer } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Link2,
  Copy,
  User,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
} from "lucide-react";

const BASE_URL = window.location.origin;

export default function CustomersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    zipCode: "",
    notes: "",
    source: "",
  });

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer created" });
      setCreateOpen(false);
      setForm({ fullName: "", phone: "", email: "", address: "", city: "", zipCode: "", notes: "", source: "" });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const generatePortalMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const res = await fetch(`/api/customers/${customerId}/portal-token`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate link");
      return res.json() as Promise<{ token: string; portalUrl: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      navigator.clipboard.writeText(data.portalUrl).catch(() => {});
      toast({
        title: "Portal link copied",
        description: "The customer portal link has been copied to clipboard.",
      });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const copyPortalLink = (customer: Customer) => {
    if (customer.portalToken) {
      const url = `${BASE_URL}/customer/${customer.portalToken}`;
      navigator.clipboard.writeText(url).catch(() => {});
      toast({ title: "Link copied", description: url });
    } else {
      generatePortalMutation.mutate(customer.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} total customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Customer
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Jobs</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search ? "No customers match your search." : "No customers yet. Add your first customer above."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.fullName}</p>
                          {customer.email && (
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.city ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          {customer.city}
                          {customer.zipCode ? ` ${customer.zipCode}` : ""}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {customer.totalJobs}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      ${Number(customer.totalRevenue || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={customer.portalToken ? "outline" : "ghost"}
                        onClick={() => copyPortalLink(customer)}
                        className="h-7 text-xs"
                        disabled={generatePortalMutation.isPending}
                      >
                        {customer.portalToken ? (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Link
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3 h-3 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(customer.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Customer Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone *</Label>
                <Input
                  placeholder="(312) 555-0100"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  placeholder="jane@example.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Address</Label>
                <Input
                  placeholder="123 Main St"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>City</Label>
                <Input
                  placeholder="Chicago"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>ZIP Code</Label>
                <Input
                  placeholder="60601"
                  value={form.zipCode}
                  onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Source</Label>
                <Input
                  placeholder="e.g. eLocal, Referral, Website"
                  value={form.source}
                  onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Internal notes…"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.fullName || !form.phone}
            >
              {createMutation.isPending ? "Creating…" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
