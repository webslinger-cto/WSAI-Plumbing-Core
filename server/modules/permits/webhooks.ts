import crypto from "crypto";
import { db } from "../../db";
import { permitWebhookEndpoints } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const PERMITS_WEBHOOK_SECRET = process.env.PERMITS_WEBHOOK_SECRET;

export type WebhookEventName =
  | "permit.packet.detected"
  | "permit.packet.needs_template"
  | "permit.packet.ready_for_review"
  | "permit.packet.needs_customer_info"
  | "permit.packet.ready_to_submit"
  | "permit.packet.submitted"
  | "permit.template.updated"
  | "permit.error";

export interface WebhookPayload {
  event: WebhookEventName;
  timestamp: string;
  data: Record<string, any>;
  signature?: string;
}

function signPayload(payload: object, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
}

export async function emitWebhookEvent(
  eventName: WebhookEventName,
  data: Record<string, any>,
  tenantId?: string,
): Promise<void> {
  const endpoints = await db.query.permitWebhookEndpoints.findMany({
    where: and(
      eq(permitWebhookEndpoints.isActive, true),
      tenantId ? eq(permitWebhookEndpoints.tenantId, tenantId) : undefined,
    ),
  });
  
  const matchingEndpoints = endpoints.filter(endpoint => {
    const events = (endpoint.eventsJsonb as string[]) || [];
    return events.length === 0 || events.includes(eventName) || events.includes("*");
  });
  
  if (matchingEndpoints.length === 0) {
    return;
  }
  
  const basePayload: Omit<WebhookPayload, "signature"> = {
    event: eventName,
    timestamp: new Date().toISOString(),
    data: {
      ...data,
      tenantId,
    },
  };
  
  for (const endpoint of matchingEndpoints) {
    try {
      const secret = endpoint.secretKey || PERMITS_WEBHOOK_SECRET;
      const signature = secret ? signPayload(basePayload, secret) : undefined;
      
      const payload: WebhookPayload = {
        ...basePayload,
        signature,
      };
      
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": eventName,
          ...(signature ? { "X-Webhook-Signature": `sha256=${signature}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        console.error(`[Webhooks] Failed to deliver ${eventName} to ${endpoint.url}: ${response.status}`);
      } else {
        console.log(`[Webhooks] Delivered ${eventName} to ${endpoint.url}`);
      }
    } catch (error) {
      console.error(`[Webhooks] Error delivering ${eventName} to ${endpoint.url}:`, error);
    }
  }
}

export async function createWebhookEndpoint(
  name: string,
  url: string,
  events: string[] = [],
  tenantId?: string,
  secretKey?: string,
): Promise<{ id: string }> {
  const [endpoint] = await db.insert(permitWebhookEndpoints)
    .values({
      tenantId,
      name,
      url,
      eventsJsonb: events,
      secretKey: secretKey || crypto.randomBytes(32).toString("hex"),
      isActive: true,
    })
    .returning();
  
  return { id: endpoint.id };
}

export async function updateWebhookEndpoint(
  id: string,
  updates: {
    name?: string;
    url?: string;
    events?: string[];
    isActive?: boolean;
  },
): Promise<void> {
  await db.update(permitWebhookEndpoints)
    .set({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.url !== undefined ? { url: updates.url } : {}),
      ...(updates.events !== undefined ? { eventsJsonb: updates.events } : {}),
      ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(permitWebhookEndpoints.id, id));
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  await db.update(permitWebhookEndpoints)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(permitWebhookEndpoints.id, id));
}

export async function listWebhookEndpoints(tenantId?: string): Promise<any[]> {
  const endpoints = await db.query.permitWebhookEndpoints.findMany({
    where: and(
      eq(permitWebhookEndpoints.isActive, true),
      tenantId ? eq(permitWebhookEndpoints.tenantId, tenantId) : undefined,
    ),
  });
  
  return endpoints.map(e => ({
    id: e.id,
    name: e.name,
    url: e.url,
    events: e.eventsJsonb,
    isActive: e.isActive,
    createdAt: e.createdAt,
  }));
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = signPayload(JSON.parse(payload), secret);
  const providedSignature = signature.replace("sha256=", "");
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedSignature),
  );
}
