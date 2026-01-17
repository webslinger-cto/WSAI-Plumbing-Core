import type { Job, Lead } from "@shared/schema";

const BUILDER1_ENDPOINT = "https://replit-builder-1--jcotham.replit.app/api/v1/inbound/job";

interface Builder1JobPayload {
  event: "job_created" | "job_completed";
  job: {
    id: string;
    leadId: string | null;
    status: string;
    serviceType: string | null;
    scheduledDate: string | null;
    completedAt: string | null;
    totalRevenue: string | null;
    description: string | null;
    customerName: string;
    address: string;
    city: string | null;
    zipCode: string | null;
  };
  lead?: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    address: string | null;
    city: string | null;
    zipCode: string | null;
    source: string;
    serviceType: string | null;
  } | null;
  timestamp: string;
}

export async function pushJobToBuilder1(
  job: Job,
  lead: Lead | null | undefined,
  event: "job_created" | "job_completed"
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BUILDER1_API_KEY;
  
  if (!apiKey) {
    console.warn("[Builder1] BUILDER1_API_KEY not configured, skipping push");
    return { success: false, error: "API key not configured" };
  }

  // Safely serialize dates
  const serializeDate = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString();
    return date;
  };

  const payload: Builder1JobPayload = {
    event,
    job: {
      id: job.id,
      leadId: job.leadId ?? null,
      status: job.status,
      serviceType: job.serviceType ?? null,
      scheduledDate: serializeDate(job.scheduledDate),
      completedAt: serializeDate(job.completedAt),
      totalRevenue: job.totalRevenue ?? null,
      description: job.description ?? null,
      customerName: job.customerName,
      address: job.address,
      city: job.city ?? null,
      zipCode: job.zipCode ?? null,
    },
    timestamp: new Date().toISOString(),
  };

  if (lead) {
    payload.lead = {
      id: lead.id,
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      customerEmail: lead.customerEmail ?? null,
      address: lead.address ?? null,
      city: lead.city ?? null,
      zipCode: lead.zipCode ?? null,
      source: lead.source,
      serviceType: lead.serviceType ?? null,
    };
  }

  try {
    console.log(`[Builder1] Pushing ${event} for job ${job.id} to Builder 1...`);
    
    const response = await fetch(BUILDER1_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Builder1] Failed to push job: ${response.status} - ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    console.log(`[Builder1] Successfully pushed ${event} for job ${job.id}:`, result);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Builder1] Error pushing job:`, error);
    return { success: false, error: message };
  }
}
