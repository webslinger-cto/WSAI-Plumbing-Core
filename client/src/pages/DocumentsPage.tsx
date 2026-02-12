import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";

interface DocInfo {
  id: string;
  title: string;
  description: string;
  url: string;
}

export default function DocumentsPage() {
  const { data: docs, isLoading } = useQuery<DocInfo[]>({
    queryKey: ["/api/docs/available"],
  });

  const handleDownload = (doc: DocInfo) => {
    const link = document.createElement("a");
    link.href = doc.url;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="documents-page">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Documentation</h1>
        <p className="text-muted-foreground mt-1">Download PDF versions of system documentation and AI capability guides.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {docs?.map((doc) => (
            <Card key={doc.id} data-testid={`card-doc-${doc.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</CardTitle>
                    <CardDescription className="mt-1" data-testid={`text-doc-desc-${doc.id}`}>{doc.description}</CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(doc)}
                  data-testid={`button-download-${doc.id}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
