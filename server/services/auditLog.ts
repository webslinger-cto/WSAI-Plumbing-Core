/**
 * Audit log helper — writes a structured record to the audit_logs table.
 *
 * Usage:
 *   import { logAudit } from "./services/auditLog";
 *
 *   await logAudit(req, "invoice.created",  "invoice", invoice.id, { total });
 *   await logAudit(req, "job.completed",    "job",     job.id);
 *   await logAudit(req, "user.deleted",     "user",    userId);
 *   await logAudit(null, "settings.changed", "settings", settingsId, { fields: ["googleReviewUrl"] });
 */

import type { Request } from "express";
import { db } from "../db";
import { auditLogs } from "@shared/schema";

export async function logAudit(
  req: Request | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const userId: string | null =
      req != null ? ((req as any).user?.id ?? null) : null;

    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId: entityId ?? null,
      meta: meta ?? {},
    });
  } catch (err) {
    // Audit failures must never crash the primary request
    console.error("[AuditLog] Failed to write log:", err);
  }
}
