import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Mail, MapPin, Receipt, Briefcase, Users, MessageSquare, Plus } from "lucide-react";
import type { Customer, CustomerAddress, Job, Quote, Lead } from "@shared/schema";

interface CustomerWithDetails extends Customer {
  addresses: CustomerAddress[];
  paymentProfiles: any[];
  jobCount?: number;
  quoteCount?: number;
  leadCount?: number;
}

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const customerQuery = useQuery<CustomerWithDetails>({
    queryKey: ["/api/customers", id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error("Failed to load customer");
      return res.json();
    },
    enabled: !!id,
  });

  const jobsQuery = useQuery<Job[]>({
    queryKey: ["/api/customers", id, "jobs"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/jobs`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const quotesQuery = useQuery<Quote[]>({
    queryKey: ["/api/customers", id, "quotes"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/quotes`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const leadsQuery = useQuery<Lead[]>({
    queryKey: ["/api/customers", id, "leads"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/leads`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/customers/${id}/chat-thread`);
    },
    onSuccess: (data: any) => {
      toast({ title: data.existing ? "Opened existing chat thread" : "Chat thread created" });
    },
    onError: () => {
      toast({ title: "Failed to create chat thread", variant: "destructive" });
    },
  });

  const customer = customerQuery.data;
  const primaryAddress = customer?.addresses?.find((a) => a.isPrimary) || customer?.addresses?.[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case "do_not_service":
        return <Badge variant="destructive">Do Not Service</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (customerQuery.isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading customer...</div>;
  }

  if (!customer) {
    return <div className="p-6 text-center text-destructive">Customer not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/customers">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-customer-name">
            {customer.firstName} {customer.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(customer.status)}
            {customer.customerNumber && (
              <Badge variant="outline">#{customer.customerNumber}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => createChatMutation.mutate()} disabled={createChatMutation.isPending} data-testid="button-start-chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Link href={`/quote?customerId=${id}`}>
            <Button variant="outline" data-testid="button-create-quote">
              <Receipt className="w-4 h-4 mr-2" />
              Create Quote
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="card-contact-info">
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.phonePrimary && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phonePrimary}</span>
                {customer.preferredContactMethod === "call" && (
                  <Badge variant="secondary" className="text-xs">Preferred</Badge>
                )}
              </div>
            )}
            {customer.phoneAlt && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phoneAlt}</span>
                <Badge variant="outline" className="text-xs">Alt</Badge>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
                {customer.preferredContactMethod === "email" && (
                  <Badge variant="secondary" className="text-xs">Preferred</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-address">
          <CardHeader>
            <CardTitle className="text-lg">Primary Address</CardTitle>
          </CardHeader>
          <CardContent>
            {primaryAddress ? (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div>{primaryAddress.street1}</div>
                  {primaryAddress.street2 && <div>{primaryAddress.street2}</div>}
                  <div>{primaryAddress.city}, {primaryAddress.state} {primaryAddress.zip}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No address on file</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-summary">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Jobs</span>
              <Badge variant="secondary">{customer.jobCount || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Quotes</span>
              <Badge variant="secondary">{customer.quoteCount || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Leads</span>
              <Badge variant="secondary">{customer.leadCount || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList>
          <TabsTrigger value="jobs" data-testid="tab-jobs">
            <Briefcase className="w-4 h-4 mr-2" />
            Jobs ({jobsQuery.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <Receipt className="w-4 h-4 mr-2" />
            Quotes ({quotesQuery.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads">
            <Users className="w-4 h-4 mr-2" />
            Leads ({leadsQuery.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="addresses" data-testid="tab-addresses">
            <MapPin className="w-4 h-4 mr-2" />
            Addresses ({customer.addresses?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          {jobsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading jobs...</div>
          ) : (jobsQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No jobs for this customer</div>
          ) : (
            <div className="space-y-2">
              {(jobsQuery.data || []).map((job) => (
                <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">{job.serviceType}</div>
                      <div className="text-sm text-muted-foreground">{job.address}</div>
                    </div>
                    <Badge variant="outline">{job.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          {quotesQuery.isLoading ? (
            <div className="text-muted-foreground">Loading quotes...</div>
          ) : (quotesQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No quotes for this customer</div>
          ) : (
            <div className="space-y-2">
              {(quotesQuery.data || []).map((quote) => (
                <Card key={quote.id} className="hover-elevate" data-testid={`card-quote-${quote.id}`}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">${quote.total}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline">{quote.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          {leadsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading leads...</div>
          ) : (leadsQuery.data || []).length === 0 ? (
            <div className="text-muted-foreground">No leads for this customer</div>
          ) : (
            <div className="space-y-2">
              {(leadsQuery.data || []).map((lead) => (
                <Card key={lead.id} className="hover-elevate" data-testid={`card-lead-${lead.id}`}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">{lead.serviceType || "General Inquiry"}</div>
                      <div className="text-sm text-muted-foreground">{lead.source}</div>
                    </div>
                    <Badge variant="outline">{lead.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          {(customer.addresses || []).length === 0 ? (
            <div className="text-muted-foreground">No addresses on file</div>
          ) : (
            <div className="space-y-2">
              {(customer.addresses || []).map((addr) => (
                <Card key={addr.id} data-testid={`card-address-${addr.id}`}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div>{addr.street1}</div>
                        {addr.street2 && <div>{addr.street2}</div>}
                        <div>{addr.city}, {addr.state} {addr.zip}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {addr.label && <Badge variant="outline">{addr.label}</Badge>}
                      {addr.isPrimary && <Badge variant="secondary">Primary</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
