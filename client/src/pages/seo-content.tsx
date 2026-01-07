import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  RefreshCw,
  Hash,
  MapPin,
  Target,
  Copy,
  Check
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";
import type { Job, ContentPack, ContentItem } from "@shared/schema";

function ContentItemCard({ item, onEdit, onPublish, onDelete }: { 
  item: ContentItem; 
  onEdit: () => void; 
  onPublish: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  
  const getTypeIcon = () => {
    switch (item.type) {
      case "facebook": return <SiFacebook className="h-4 w-4" />;
      case "instagram": return <SiInstagram className="h-4 w-4" />;
      case "tiktok": return <SiTiktok className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case "published": return "default";
      case "approved": return "secondary";
      case "review": return "outline";
      default: return "secondary";
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.body || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card data-testid={`card-content-item-${item.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <CardTitle className="text-sm font-medium capitalize">{item.type}</CardTitle>
          </div>
          <Badge variant={getStatusColor()}>{item.status}</Badge>
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
        <div className="flex items-center gap-1 flex-wrap">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleCopy}
            data-testid={`button-copy-${item.id}`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit} data-testid={`button-edit-${item.id}`}>
            <Edit className="h-3 w-3" />
          </Button>
          {item.status !== "published" && (
            <Button size="sm" variant="ghost" onClick={onPublish} data-testid={`button-publish-${item.id}`}>
              <Send className="h-3 w-3" />
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

function ContentPackCard({ pack, items, onGenerateMore }: { 
  pack: ContentPack; 
  items: ContentItem[];
  onGenerateMore: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const editMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContentItem> }) => {
      return apiRequest("PATCH", `/api/content-items/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-packs"] });
      toast({ title: "Content updated" });
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

  const blogItems = items.filter(i => i.type === "blog");
  const socialItems = items.filter(i => i.type !== "blog");

  return (
    <Card className="mb-4" data-testid={`card-content-pack-${pack.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Content Pack</CardTitle>
            <CardDescription>
              {pack.geoTarget?.neighborhood || pack.geoTarget?.city || "Chicago"}
              {" - "}
              {new Date(pack.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pack.status === "published" ? "default" : "secondary"}>
              {pack.status}
            </Badge>
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
                {blogItems.map(item => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => {}}
                    onPublish={() => publishMutation.mutate(item.id)}
                    onDelete={() => deleteMutation.mutate(item.id)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="social">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {socialItems.map(item => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => {}}
                    onPublish={() => publishMutation.mutate(item.id)}
                    onDelete={() => deleteMutation.mutate(item.id)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

export default function SEOContent() {
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showJobSelector, setShowJobSelector] = useState(false);

  const { data: contentPacks = [], isLoading: packsLoading } = useQuery<ContentPack[]>({
    queryKey: ["/api/content-packs"]
  });

  const { data: completedJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    select: (jobs: Job[]) => jobs.filter(j => j.status === "completed")
  });

  const generateMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/generate-content`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-packs"] });
      setShowJobSelector(false);
      toast({ title: "Content generated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to generate content", variant: "destructive" });
    }
  });

  const handleGenerateContent = () => {
    if (selectedJob) {
      generateMutation.mutate(selectedJob);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">SEO Content</h1>
          <p className="text-muted-foreground">Generate SEO-optimized blog posts and social media content from completed jobs</p>
        </div>
        <Button onClick={() => setShowJobSelector(true)} data-testid="button-generate-content">
          <Plus className="h-4 w-4 mr-2" />
          Generate Content
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Packs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-packs">{contentPacks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-blog-posts">
              {contentPacks.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Social Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-social-posts">
              {contentPacks.length * 3}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-published">
              {contentPacks.filter(p => p.status === "published").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Packs</CardTitle>
          <CardDescription>
            Each content pack includes a blog post and social media posts for Facebook, Instagram, and TikTok
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading content packs...</div>
          ) : contentPacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No content packs yet</p>
              <p className="text-sm">Generate content from completed jobs to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              {contentPacks.map(pack => (
                <ContentPackWithItems key={pack.id} pack={pack} />
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showJobSelector} onOpenChange={setShowJobSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Content</DialogTitle>
            <DialogDescription>
              Select a completed job to generate SEO content from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Job</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {jobsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading jobs...</div>
                ) : completedJobs.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No completed jobs available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {completedJobs.map(job => (
                      <div
                        key={job.id}
                        className={`p-3 rounded-md cursor-pointer hover-elevate ${
                          selectedJob === job.id ? "bg-accent" : ""
                        }`}
                        onClick={() => setSelectedJob(job.id)}
                        data-testid={`job-option-${job.id}`}
                      >
                        <div className="font-medium">{job.serviceType.replace(/_/g, " ")}</div>
                        <div className="text-sm text-muted-foreground">
                          {job.address?.split(",")[0] || "Unknown location"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowJobSelector(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateContent} 
                disabled={!selectedJob || generateMutation.isPending}
                data-testid="button-confirm-generate"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContentPackWithItems({ pack }: { pack: ContentPack }) {
  const { data: packData } = useQuery<{ pack: ContentPack; items: ContentItem[] }>({
    queryKey: ["/api/content-packs", pack.id]
  });

  const items = packData?.items || [];

  return (
    <ContentPackCard 
      pack={pack} 
      items={items}
      onGenerateMore={() => {}}
    />
  );
}
