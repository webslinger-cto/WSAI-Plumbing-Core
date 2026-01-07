import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Eye, 
  Trash2, 
  Send, 
  Check,
  X,
  Hash,
  Target,
  Copy,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";
import type { ContentPack, ContentItem } from "@shared/schema";

function ContentItemCard({ item, onApprove, onReject, onPublish, onDelete }: { 
  item: ContentItem; 
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  
  const getTypeIcon = () => {
    switch (item.type) {
      case "facebook": return <SiFacebook className="h-4 w-4" />;
      case "instagram": return <SiInstagram className="h-4 w-4" />;
      case "tiktok": return <SiTiktok className="h-4 w-4" />;
      case "google_business": return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case "received": return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case "under_review": return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Under Review</Badge>;
      case "approved": return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "published": return <Badge><Send className="h-3 w-3 mr-1" />Published</Badge>;
      default: return <Badge variant="secondary">{item.status}</Badge>;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.body || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const needsReview = item.status === "received" || item.status === "under_review";
  const canPublish = item.status === "approved";

  return (
    <Card data-testid={`card-content-item-${item.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <CardTitle className="text-sm font-medium capitalize">{item.type}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription className="text-xs line-clamp-1">{item.title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{item.body}</p>
        {item.primaryKeyword && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Target className="h-3 w-3" />
            <span>{item.primaryKeyword}</span>
          </div>
        )}
        {item.rejectionReason && (
          <div className="text-xs text-destructive mb-2">
            Rejection reason: {item.rejectionReason}
          </div>
        )}
        <div className="flex items-center gap-1 flex-wrap">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleCopy}
            data-testid={`button-copy-${item.id}`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          {needsReview && (
            <>
              <Button size="sm" variant="default" onClick={onApprove} data-testid={`button-approve-${item.id}`}>
                <Check className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} data-testid={`button-reject-${item.id}`}>
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </>
          )}
          {canPublish && (
            <Button size="sm" variant="default" onClick={onPublish} data-testid={`button-publish-${item.id}`}>
              <Send className="h-3 w-3 mr-1" />
              Publish
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDelete} data-testid={`button-delete-${item.id}`}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentPackCard({ pack, items, onApproveAll, onRejectAll }: { 
  pack: ContentPack; 
  items: ContentItem[];
  onApproveAll: () => void;
  onRejectAll: (reason: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/content-items/${id}/approve`, { userId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-packs"] });
      toast({ title: "Content approved" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("POST", `/api/content-items/${id}/reject`, { userId: null, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-packs"] });
      toast({ title: "Content rejected" });
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/content-items/${id}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-packs"] });
      toast({ title: "Content published" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/content-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-packs"] });
      toast({ title: "Content deleted" });
    }
  });

  const handleRejectAll = () => {
    onRejectAll(rejectReason);
    setShowRejectDialog(false);
    setRejectReason("");
  };

  const blogItems = items.filter(i => i.type === "blog");
  const socialItems = items.filter(i => i.type !== "blog");
  const needsReview = pack.status === "received" || pack.status === "under_review";

  const getStatusBadge = () => {
    switch (pack.status) {
      case "received": return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case "under_review": return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Under Review</Badge>;
      case "approved": return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "published": return <Badge><Send className="h-3 w-3 mr-1" />Published</Badge>;
      default: return <Badge variant="secondary">{pack.status}</Badge>;
    }
  };

  return (
    <>
      <Card className="mb-4" data-testid={`card-content-pack-${pack.id}`}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Content Pack
                {pack.autoApproved && (
                  <Badge variant="outline" className="text-xs">Auto-approved</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {pack.geoTarget?.neighborhood || pack.geoTarget?.city || "Chicago"}
                {" - "}
                {new Date(pack.createdAt).toLocaleDateString()}
                {pack.sourceUrl && (
                  <a 
                    href={pack.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center text-xs hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Source
                  </a>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {needsReview && (
                <>
                  <Button size="sm" variant="default" onClick={onApproveAll} data-testid={`button-approve-pack-${pack.id}`}>
                    <Check className="h-4 w-4 mr-1" />
                    Approve All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowRejectDialog(true)} data-testid={`button-reject-pack-${pack.id}`}>
                    <X className="h-4 w-4 mr-1" />
                    Reject All
                  </Button>
                </>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowDetails(!showDetails)}
                data-testid={`button-toggle-details-${pack.id}`}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showDetails ? "Hide" : "View"}
              </Button>
            </div>
          </div>
          {pack.rejectionReason && (
            <div className="text-sm text-destructive mt-2">
              Rejection reason: {pack.rejectionReason}
            </div>
          )}
        </CardHeader>

        {showDetails && (
          <CardContent>
            <Tabs defaultValue="blog">
              <TabsList className="mb-4">
                <TabsTrigger value="blog" data-testid="tab-blog">
                  <FileText className="h-4 w-4 mr-1" />
                  Blog ({blogItems.length})
                </TabsTrigger>
                <TabsTrigger value="social" data-testid="tab-social">
                  <Hash className="h-4 w-4 mr-1" />
                  Social ({socialItems.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="blog">
                <div className="space-y-4">
                  {blogItems.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No blog posts in this pack</div>
                  ) : (
                    blogItems.map(item => (
                      <ContentItemCard
                        key={item.id}
                        item={item}
                        onApprove={() => approveMutation.mutate(item.id)}
                        onReject={() => rejectMutation.mutate({ id: item.id, reason: "Rejected by reviewer" })}
                        onPublish={() => publishMutation.mutate(item.id)}
                        onDelete={() => deleteMutation.mutate(item.id)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="social">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {socialItems.length === 0 ? (
                    <div className="col-span-3 text-center py-4 text-muted-foreground">No social posts in this pack</div>
                  ) : (
                    socialItems.map(item => (
                      <ContentItemCard
                        key={item.id}
                        item={item}
                        onApprove={() => approveMutation.mutate(item.id)}
                        onReject={() => rejectMutation.mutate({ id: item.id, reason: "Rejected by reviewer" })}
                        onPublish={() => publishMutation.mutate(item.id)}
                        onDelete={() => deleteMutation.mutate(item.id)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Content Pack</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this content pack. This will be sent back to the content provider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide feedback on why this content was rejected..."
                className="mt-2"
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectAll} data-testid="button-confirm-reject">
              Reject Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SEOContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: contentPacks = [], isLoading: packsLoading } = useQuery<ContentPack[]>({
    queryKey: ["/api/content-packs"]
  });

  const approvePackMutation = useMutation({
    mutationFn: async (packId: string) => {
      return apiRequest("POST", `/api/content-packs/${packId}/approve`, { userId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-packs"] });
      toast({ title: "Content pack approved" });
    }
  });

  const rejectPackMutation = useMutation({
    mutationFn: async ({ packId, reason }: { packId: string; reason: string }) => {
      return apiRequest("POST", `/api/content-packs/${packId}/reject`, { userId: null, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-packs"] });
      toast({ title: "Content pack rejected" });
    }
  });

  const pendingPacks = contentPacks.filter(p => p.status === "received" || p.status === "under_review");
  const approvedPacks = contentPacks.filter(p => p.status === "approved");
  const rejectedPacks = contentPacks.filter(p => p.status === "rejected");
  const publishedPacks = contentPacks.filter(p => p.status === "published");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">SEO Content Review</h1>
          <p className="text-muted-foreground">
            Review and approve SEO content from webslingeraiglassseo.com
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={activeTab === "pending" ? "ring-2 ring-primary" : ""} onClick={() => setActiveTab("pending")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingPacks.length}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === "approved" ? "ring-2 ring-primary" : ""} onClick={() => setActiveTab("approved")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-approved-count">{approvedPacks.length}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === "rejected" ? "ring-2 ring-primary" : ""} onClick={() => setActiveTab("rejected")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-rejected-count">{rejectedPacks.length}</p>
          </CardContent>
        </Card>
        <Card className={activeTab === "published" ? "ring-2 ring-primary" : ""} onClick={() => setActiveTab("published")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4" />
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-published-count">{publishedPacks.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "pending" && "Pending Review"}
            {activeTab === "approved" && "Approved Content"}
            {activeTab === "rejected" && "Rejected Content"}
            {activeTab === "published" && "Published Content"}
          </CardTitle>
          <CardDescription>
            {activeTab === "pending" && "Content packages awaiting your review"}
            {activeTab === "approved" && "Content approved and ready for publishing"}
            {activeTab === "rejected" && "Content that was rejected"}
            {activeTab === "published" && "Content that has been published"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading content packs...</div>
          ) : (
            <ContentPackList 
              packs={
                activeTab === "pending" ? pendingPacks :
                activeTab === "approved" ? approvedPacks :
                activeTab === "rejected" ? rejectedPacks :
                publishedPacks
              }
              onApprovePack={(packId) => approvePackMutation.mutate(packId)}
              onRejectPack={(packId, reason) => rejectPackMutation.mutate({ packId, reason })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContentPackList({ packs, onApprovePack, onRejectPack }: { 
  packs: ContentPack[];
  onApprovePack: (packId: string) => void;
  onRejectPack: (packId: string, reason: string) => void;
}) {
  if (packs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No content packs in this category</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      {packs.map(pack => (
        <ContentPackWithItems 
          key={pack.id} 
          pack={pack}
          onApproveAll={() => onApprovePack(pack.id)}
          onRejectAll={(reason) => onRejectPack(pack.id, reason)}
        />
      ))}
    </ScrollArea>
  );
}

function ContentPackWithItems({ pack, onApproveAll, onRejectAll }: { 
  pack: ContentPack;
  onApproveAll: () => void;
  onRejectAll: (reason: string) => void;
}) {
  const { data: packData } = useQuery<{ pack: ContentPack; items: ContentItem[] }>({
    queryKey: ["/api/content-packs", pack.id]
  });

  const items = packData?.items || [];

  return (
    <ContentPackCard 
      pack={pack} 
      items={items}
      onApproveAll={onApproveAll}
      onRejectAll={onRejectAll}
    />
  );
}
