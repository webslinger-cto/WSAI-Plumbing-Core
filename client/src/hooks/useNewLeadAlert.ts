import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  serviceType?: string;
}

interface VelocityLead {
  id: string;
  source: string;
  status: string;
  customerInfo: CustomerInfo;
  createdAt: string;
  linkedLeadId?: string;
}

function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Three ascending tones — sharp alert pattern
    const notes = [880, 1100, 1320];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const start = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.start(start);
      osc.stop(start + 0.32);
    });
    setTimeout(() => ctx.close().catch(() => {}), 2500);
  } catch {
    // Audio not available — silent fallback
  }
}

export function useNewLeadAlert(isAuthenticated: boolean, role: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Only admins and dispatchers receive lead alerts
    if (!isAuthenticated || !role || role === "technician" || role === "salesperson") return;

    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      console.log("[LeadAlert] Global new-lead alert listener active");
    });

    socket.on("NEW_LEAD", (lead: VelocityLead) => {
      // Refresh both lead lists immediately
      queryClient.invalidateQueries({ queryKey: ["/api/velocity-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });

      // Play audible alert
      playAlertSound();

      const name = lead.customerInfo?.name || "Unknown";
      const source = lead.source || "Webhook";
      const serviceType = lead.customerInfo?.serviceType;
      const phone = lead.customerInfo?.phone || "";

      toast({
        title: "🔪 New Lead — Act Now!",
        description: `${name}${phone ? ` · ${phone}` : ""} — ${serviceType || "Service needed"} via ${source}. Go to Lead Assassin to claim it.`,
        duration: 15000,
      });
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, role, toast]);
}
