import { useState, useRef, useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Send, MessageSquare, User, Users, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChatMessage {
  id: string;
  threadId: string;
  senderType: "user" | "customer";
  senderId: string;
  senderDisplayName: string | null;
  body: string;
  createdAt: string;
}

interface LeadThread {
  id: string;
  relatedLeadId: string;
  subject: string | null;
  status: string;
  lead: {
    id: string;
    customerName: string;
    serviceType: string | null;
    status: string;
  };
  participants: Array<{ displayName: string | null; roleAtTime: string | null }>;
  messages: ChatMessage[];
}

export default function LeadChatPage() {
  const params = useParams<{ leadId: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const token = searchParams.get("token");
  
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: thread, isLoading, error } = useQuery<LeadThread>({
    queryKey: ["/api/chat/leads", params.leadId, "thread", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const res = await fetch(`/api/chat/leads/${params.leadId}/thread?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to fetch thread");
      }
      return res.json();
    },
    enabled: !!token && !!params.leadId,
    refetchInterval: 10000,
  });
  
  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!token) throw new Error("No token");
      const res = await fetch(`/api/chat/leads/${params.leadId}/thread/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          body,
          client_msg_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/leads", params.leadId, "thread", token] });
    },
  });
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.messages]);
  
  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid chat link. Please use the link provided in your message from Chicago Sewer Experts.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {(error as Error).message || "Unable to access chat. The link may have expired."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!thread) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No messages yet. Check back soon!
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const renderMessage = (msg: ChatMessage) => {
    const isCustomer = msg.senderType === "customer";
    
    return (
      <div
        key={msg.id}
        className={`flex flex-col gap-1 p-3 rounded-lg ${
          isCustomer ? "bg-primary/10 ml-8" : "bg-muted mr-8"
        }`}
        data-testid={`lead-message-${msg.id}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isCustomer ? (
              <User className="w-4 h-4 text-primary" />
            ) : (
              <Users className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {isCustomer
                ? thread.lead.customerName || "You"
                : msg.senderDisplayName || "Chicago Sewer Experts"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(msg.createdAt), "MMM d, h:mm a")}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="h-[calc(100vh-2rem)]" data-testid="lead-chat-container">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5" />
              <div>
                <div>Chicago Sewer Experts</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {thread.lead.serviceType || "Service Request"} - {thread.lead.status}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-5rem)] p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-3">
                {thread.messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  thread.messages.map(renderMessage)
                )}
              </div>
            </ScrollArea>
            
            {thread.status === "closed" ? (
              <div className="p-4 border-t bg-muted/50 text-center text-sm text-muted-foreground">
                This conversation has been closed.
              </div>
            ) : (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="min-h-[80px] resize-none"
                    disabled={sendMutation.isPending}
                    data-testid="lead-chat-input"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    size="icon"
                    className="h-[80px] w-12"
                    data-testid="lead-chat-send"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {sendMutation.isError && (
                  <p className="text-sm text-destructive mt-2">
                    Failed to send message. Please try again.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
