import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Image as ImageIcon,
  Video,
  Trash2,
  Loader2,
  AlertCircle,
  Camera,
  Film,
} from "lucide-react";
import type { JobMedia } from "@shared/schema";
import { format } from "date-fns";

interface JobMediaTabProps {
  jobId: string;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_DURATION = 30;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Could not load video"));
    video.src = URL.createObjectURL(file);
  });
}

export function JobMediaTab({ jobId }: JobMediaTabProps) {
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const { data: media = [], isLoading } = useQuery<JobMedia[]>({
    queryKey: ["/api/jobs", jobId, "media"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/media`);
      if (!res.ok) throw new Error("Failed to fetch media");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await apiRequest("DELETE", `/api/jobs/${jobId}/media/${mediaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "media"] });
      toast({ title: "Media deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete media", variant: "destructive" });
    },
  });

  const uploadFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast({ title: "Only images and videos are allowed", variant: "destructive" });
      return;
    }

    if (isImage && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Unsupported image format. Use JPEG, PNG, or WebP.", variant: "destructive" });
      return;
    }

    if (isVideo && !ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast({ title: "Unsupported video format. Use MP4, MOV, or WebM.", variant: "destructive" });
      return;
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      toast({ title: `Image too large. Max size is ${formatFileSize(MAX_IMAGE_SIZE)}.`, variant: "destructive" });
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      toast({ title: `Video too large. Max size is ${formatFileSize(MAX_VIDEO_SIZE)}.`, variant: "destructive" });
      return;
    }

    if (isVideo) {
      try {
        setUploadProgress("Checking video duration...");
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION) {
          toast({
            title: `Video too long (${Math.round(duration)}s). Maximum is ${MAX_VIDEO_DURATION} seconds.`,
            variant: "destructive",
          });
          setUploadProgress("");
          return;
        }
      } catch {
        toast({ title: "Could not verify video duration", variant: "destructive" });
        setUploadProgress("");
        return;
      }
    }

    setUploading(true);
    setUploadProgress("Requesting upload...");

    try {
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      setUploadProgress("Uploading file...");

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!putRes.ok) throw new Error("Failed to upload file to storage");

      setUploadProgress("Saving record...");

      await apiRequest("POST", `/api/jobs/${jobId}/media`, {
        objectPath,
        fileName: file.name,
        fileSize: file.size,
        mediaType: isImage ? "image" : "video",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "media"] });
      toast({ title: `${isImage ? "Image" : "Video"} uploaded successfully` });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }, [jobId, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      uploadFile(files[i]);
    }
    e.target.value = "";
  }, [uploadFile]);

  const images = media.filter((m) => m.mediaType === "image");
  const videos = media.filter((m) => m.mediaType === "video");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={imageInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={handleFileSelect}
          data-testid="input-upload-image"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept={ACCEPTED_VIDEO_TYPES.join(",")}
          className="hidden"
          onChange={handleFileSelect}
          data-testid="input-upload-video"
        />
        <Button
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-upload-image"
        >
          <Camera className="w-4 h-4 mr-1.5" />
          Upload Photos
        </Button>
        <Button
          variant="outline"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-upload-video"
        >
          <Film className="w-4 h-4 mr-1.5" />
          Upload Video
        </Button>
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {uploadProgress}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Photos: JPEG, PNG, WebP (max 10MB) | Videos: MP4, MOV, WebM (max 30 seconds, 50MB)
      </p>

      {media.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Upload className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No media uploaded yet. Upload photos or short video clips from the job site for the SEO content generator.
            </p>
          </CardContent>
        </Card>
      )}

      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Photos ({images.length})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((item) => (
              <MediaCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Videos ({videos.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videos.map((item) => (
              <MediaCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MediaCard({ item, onDelete }: { item: JobMedia; onDelete: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isImage = item.mediaType === "image";
  const serveUrl = item.objectPath;

  return (
    <Card className="overflow-visible">
      <CardContent className="p-2 space-y-2">
        <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
          {isImage ? (
            <img
              src={serveUrl}
              alt={item.fileName}
              className="w-full h-full object-cover"
              loading="lazy"
              data-testid={`img-media-${item.id}`}
            />
          ) : (
            <video
              src={serveUrl}
              controls
              className="w-full h-full object-cover"
              preload="metadata"
              data-testid={`video-media-${item.id}`}
            />
          )}
          <Badge
            className="absolute top-1 left-1 text-[10px]"
            variant={isImage ? "secondary" : "default"}
          >
            {isImage ? "Photo" : "Video"}
          </Badge>
        </div>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" title={item.fileName} data-testid={`text-filename-${item.id}`}>
              {item.fileName}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {item.fileSize ? formatFileSize(item.fileSize) : ""}{" "}
              {item.createdAt ? format(new Date(item.createdAt), "MMM d, h:mm a") : ""}
            </p>
          </div>
          {showConfirm ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => { onDelete(); setShowConfirm(false); }}
                data-testid={`button-confirm-delete-${item.id}`}
              >
                Yes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfirm(false)}
                data-testid={`button-cancel-delete-${item.id}`}
              >
                No
              </Button>
            </div>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowConfirm(true)}
              data-testid={`button-delete-media-${item.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
