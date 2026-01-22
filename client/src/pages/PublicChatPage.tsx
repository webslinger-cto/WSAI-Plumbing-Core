import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, MessageCircle, Phone, User, Mail, MapPin, Wrench, Clock, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChatMessage {
  id: string;
  senderType: "user" | "customer";
  senderDisplayName: string;
  body: string;
  createdAt: string;
}

interface ChatSession {
  sessionToken: string;
  leadId: string;
  threadId: string;
}

const SERVICE_TYPES = [
  "Sewer Line Repair",
  "Sewer Line Replacement",
  "Drain Cleaning",
  "Hydro Jetting",
  "Camera Inspection",
  "Emergency Service",
  "Basement Flooding",
  "Tree Root Removal",
  "Sump Pump",
  "Other"
];

export default function PublicChatPage() {
  const [step, setStep] = useState<"intro" | "info" | "chat">("intro");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<ChatSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const storedSession = typeof window !== "undefined" ? sessionStorage.getItem("publicChatSession") : null;
  
  useEffect(() => {
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setSession(parsed);
        setStep("chat");
      } catch (e) {
        sessionStorage.removeItem("publicChatSession");
      }
    }
  }, [storedSession]);

  const startChatMutation = useMutation({
    mutationFn: async (data: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      address?: string;
      serviceType?: string;
      initialMessage: string;
    }) => {
      const res = await fetch("/api/public/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to start chat");
      }
      return res.json();
    },
    onSuccess: (data: ChatSession) => {
      setSession(data);
      sessionStorage.setItem("publicChatSession", JSON.stringify(data));
      setStep("chat");
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/public/chat/messages", session?.sessionToken],
    queryFn: async () => {
      if (!session) return [];
      const res = await fetch(`/api/public/chat/messages?token=${encodeURIComponent(session.sessionToken)}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!session,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!session) throw new Error("No session");
      const res = await fetch("/api/public/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session.sessionToken,
          body,
          client_msg_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/public/chat/messages", session?.sessionToken] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartChat = () => {
    if (!customerName.trim() || !customerPhone.trim() || !initialMessage.trim()) return;
    startChatMutation.mutate({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      address: address.trim() || undefined,
      serviceType: serviceType || undefined,
      initialMessage: initialMessage.trim(),
    });
  };

  const handleSendMessage = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message.trim());
  };

  if (step === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Chat with Our Team</CardTitle>
            <CardDescription className="text-base">
              Need help with a sewer or plumbing emergency? Chat directly with our dispatch team for immediate assistance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-primary" />
                <span>24/7 Emergency Service</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Fast Response Time</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wrench className="w-4 h-4 text-primary" />
                <span>Licensed Experts</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                <span>Free Estimates</span>
              </div>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setStep("info")}
              data-testid="button-start-chat"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Start Chat Now
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Or call us directly at <a href="tel:+17736615882" className="text-primary hover:underline font-medium">(773) 661-5882</a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "info") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Tell Us About Your Issue
            </CardTitle>
            <CardDescription>
              Please provide your contact information so we can assist you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" /> Name *
              </Label>
              <Input
                id="name"
                placeholder="Your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                data-testid="input-customer-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> Phone *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 555-5555"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                data-testid="input-customer-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email (optional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                data-testid="input-customer-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Address (optional)
              </Label>
              <Input
                id="address"
                placeholder="Street address, City, IL"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-testid="input-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Service Needed (optional)
              </Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger data-testid="select-service-type">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Describe Your Issue *</Label>
              <Textarea
                id="message"
                placeholder="Tell us what's happening - we're here to help!"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                rows={3}
                data-testid="textarea-initial-message"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setStep("intro")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleStartChat}
                disabled={!customerName.trim() || !customerPhone.trim() || !initialMessage.trim() || startChatMutation.isPending}
                className="flex-1"
                data-testid="button-submit-chat"
              >
                {startChatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Start Chat
              </Button>
            </div>

            {startChatMutation.isError && (
              <p className="text-sm text-destructive text-center">
                {startChatMutation.error?.message || "Failed to start chat. Please try again."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-primary/20 h-[600px] flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Chicago Sewer Experts</CardTitle>
                <p className="text-sm text-muted-foreground">Chat with our team</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Online
            </Badge>
          </div>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messagesLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Your message has been sent!</p>
                <p className="text-sm mt-1">A dispatcher will respond shortly.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderType === "customer" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.senderType === "customer"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.senderType === "user" && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.senderDisplayName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <p className="text-xs mt-1 opacity-50">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sendMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || sendMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
