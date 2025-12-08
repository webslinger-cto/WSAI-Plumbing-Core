import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";

interface ImportFile {
  id: string;
  name: string;
  size: string;
  source: "eLocal" | "Networx" | "Other";
  status: "pending" | "processing" | "success" | "error";
  records?: number;
  error?: string;
}

export default function ImportPage() {
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    const importFiles: ImportFile[] = newFiles
      .filter((f) => f.name.endsWith(".csv") || f.name.endsWith(".xlsx"))
      .map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: formatFileSize(f.size),
        source: f.name.toLowerCase().includes("elocal")
          ? "eLocal"
          : f.name.toLowerCase().includes("networx")
          ? "Networx"
          : "Other",
        status: "pending" as const,
      }));

    setFiles((prev) => [...prev, ...importFiles]);

    // Simulate processing
    importFiles.forEach((file, index) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "processing" as const } : f
          )
        );
      }, index * 500);

      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "success" as const,
                  records: Math.floor(Math.random() * 500) + 50,
                }
              : f
          )
        );
      }, index * 500 + 2000);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const successCount = files.filter((f) => f.status === "success").length;
  const totalRecords = files.reduce((sum, f) => sum + (f.records || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Upload CSV or Excel files from eLocal, Networx, and other lead sources
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Upload Files
          </CardTitle>
          <CardDescription>
            Drag and drop your lead data files or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="mx-auto w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Drop files here</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supports CSV and Excel files (.csv, .xlsx)
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv,.xlsx"
              multiple
              onChange={handleFileSelect}
            />
            <Button asChild data-testid="button-browse-files">
              <label htmlFor="file-upload" className="cursor-pointer">
                Browse Files
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Import Queue
                </CardTitle>
                <CardDescription>
                  {successCount} of {files.length} files processed
                  {totalRecords > 0 && ` - ${totalRecords} records imported`}
                </CardDescription>
              </div>
              {files.every((f) => f.status === "success") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiles([])}
                  data-testid="button-clear-all"
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border"
                data-testid={`file-${file.id}`}
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{file.name}</p>
                    <Badge variant="secondary" className="shrink-0">
                      {file.source}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{file.size}</span>
                    {file.records && <span>{file.records} records</span>}
                  </div>
                  {file.status === "processing" && (
                    <Progress value={60} className="h-1 mt-2" />
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {file.status === "pending" && (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                  {file.status === "processing" && (
                    <Badge variant="secondary" className="animate-pulse">
                      Processing...
                    </Badge>
                  )}
                  {file.status === "success" && (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Imported
                    </Badge>
                  )}
                  {file.status === "error" && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      Failed
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                    data-testid={`button-remove-${file.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Supported Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "eLocal", status: "active", color: "green" },
              { name: "Networx", status: "active", color: "green" },
              { name: "Angi", status: "coming soon", color: "yellow" },
              { name: "HomeAdvisor", status: "coming soon", color: "yellow" },
            ].map((source) => (
              <div
                key={source.name}
                className="p-4 rounded-lg bg-muted/30 border flex items-center justify-between"
              >
                <span className="font-medium">{source.name}</span>
                <Badge
                  variant="outline"
                  className={
                    source.color === "green"
                      ? "bg-green-500/10 text-green-500 border-green-500/30"
                      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                  }
                >
                  {source.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
