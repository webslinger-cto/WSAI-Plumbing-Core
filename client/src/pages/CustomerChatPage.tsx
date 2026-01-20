import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  User,
  UserCog,
  Wrench,
  Building,
  Phone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  threadId: string;
  senderType: 'user' | 'customer';
  senderId: string;
  senderDisplayName: string;
  body: string;
  createdAt: string;
}

interface Participant {
  displayName: string;
  roleAtTime: string;
}

interface ThreadData {
  id: string;
  subject: string | null;
  status: 'active' | 'closed';
  participants: Participant[];
  messages: ChatMessage[];
}

interface CustomerSession {
  customerName: string;
  jobId: string;
  serviceType: string;
}

const roleIcons: Record<string, typeof User> = {
  dispatcher: UserCog,
  technician: Wrench,
  admin: Building,
  customer: User,
};

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const RoleIcon = roleIcons[message.senderType === 'customer' ? 'customer' : 'dispatcher'] || User;
  
  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {message.senderType === 'customer' ? (
            <User className="h-4 w-4" />
          ) : (
            <RoleIcon className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
        <div className={`text-xs text-muted-foreground mb-1`}>
          {isOwn ? 'You' : message.senderDisplayName} • {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

export default function CustomerChatPage() {
  const { toast } = useToast();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('jobId');
    const token = params.get('token');

    if (!jobId || !token) {
      setAuthError('Invalid link - missing required parameters');
      setIsAuthenticating(false);
      return;
    }

    authenticateSession(jobId, token);
  }, []);

  const authenticateSession = async (jobId: string, token: string) => {
    try {
      const res = await fetch('/api/chat/customer/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Authentication failed');
      }

      const data = await res.json();
      setSession(data);
      setIsAuthenticating(false);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate. Please request a new link.');
      setIsAuthenticating(false);
    }
  };

  const {
    data: threadData,
    isLoading: threadLoading,
    refetch: refetchThread,
    error: threadError,
  } = useQuery<ThreadData>({
    queryKey: ['/api/chat/customer/jobs', session?.jobId, 'thread'],
    queryFn: async () => {
      const res = await fetch(`/api/chat/customer/jobs/${session!.jobId}/thread`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load messages');
      }
      return res.json();
    },
    enabled: !!session?.jobId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiRequest('POST', `/api/chat/customer/jobs/${session!.jobId}/thread/messages`, {
        body,
        client_msg_id: `cust_msg_${Date.now()}`,
      });
      return res.json();
    },
    onSuccess: () => {
      refetchThread();
      setMessageInput('');
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/chat/customer/jobs/${session!.jobId}/thread/read`);
    },
  });

  useEffect(() => {
    if (threadData?.messages && threadData.messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      markReadMutation.mutate();
    }
  }, [threadData?.messages?.length]);

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying your session...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">Session Expired or Invalid</h2>
              <p className="text-muted-foreground mb-4">{authError}</p>
              <p className="text-sm text-muted-foreground">
                Please contact Emergency Chicago Sewer Experts to request a new message link.
              </p>
              <div className="mt-6">
                <a href="tel:+17736654550" className="inline-flex items-center gap-2 text-primary hover:underline">
                  <Phone className="h-4 w-4" />
                  (773) 665-4550
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const noThread = threadError || (!threadLoading && !threadData);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img 
            src="/cse-logo.png" 
            alt="Emergency Chicago Sewer Experts" 
            className="w-10 h-10 object-contain rounded"
          />
          <div>
            <h1 className="font-semibold text-sm">Emergency Chicago Sewer Experts</h1>
            <p className="text-xs text-muted-foreground">
              Messages for {session?.serviceType} service
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {noThread ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-lg font-semibold mb-2">No Messages Yet</h2>
                <p className="text-muted-foreground">
                  Our team hasn't started a conversation for your job yet. You'll be notified when they do.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {threadData?.subject || 'Messages'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {threadData?.participants.length || 0} team members in this conversation
                  </p>
                </div>
                {threadData?.status === 'closed' && (
                  <Badge variant="secondary">Closed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t" />
              <ScrollArea className="h-[400px] p-4">
                {threadLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : threadData?.messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  <>
                    {threadData?.messages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isOwn={msg.senderType === 'customer'}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </ScrollArea>

              {threadData?.status === 'active' && (
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      disabled={sendMutation.isPending}
                      data-testid="input-customer-message"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!messageInput.trim() || sendMutation.isPending}
                      data-testid="button-send-customer-message"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {threadData?.status === 'closed' && (
                <div className="p-4 border-t text-center text-sm text-muted-foreground">
                  This conversation has been closed. Contact us at{' '}
                  <a href="tel:+17736654550" className="text-primary hover:underline">(773) 665-4550</a>{' '}
                  if you need further assistance.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Hello, {session?.customerName}!</p>
          <p className="mt-1">This is a secure messaging system. Messages are stored securely.</p>
        </div>
      </main>
    </div>
  );
}
