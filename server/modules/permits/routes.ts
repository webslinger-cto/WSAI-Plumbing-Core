import type { Express } from "express";
import { permitService } from "./service";
import { storage } from "../../storage";
import { db } from "../../db";
import { permitTemplates, permitJurisdictions, permitPackets, permitPacketDocuments } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { isS3Configured, getSignedDownloadUrl, putPdf, computeHash } from "./storageS3";
import { isRedisConfigured, addPacketGenerateJob, addFormsCheckJob, addEmailSubmitJob } from "../../queue/permitsQueue";
import { finalizePacketWithCustomerInfo } from "./pdfFill";
import { submitPacketViaEmail, submitPacketAssisted } from "./emailSubmit";
import { checkJurisdictionForms } from "./formsCheck";
import { listWebhookEndpoints, createWebhookEndpoint, updateWebhookEndpoint, deleteWebhookEndpoint } from "./webhooks";
import crypto from "crypto";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export function registerPermitRoutes(app: Express, opts: { isAuthenticatedUser: (req: any) => Promise<boolean> }) {
  const requireEnabled = async (req: any, res: any): Promise<boolean> => {
    const settings = await storage.getCompanySettings();
    if (!settings?.permitCenterEnabled) {
      res.status(403).json({ error: "Permit Center is not enabled for this account" });
      return false;
    }
    return true;
  };

  const requireAdmin = async (req: any, res: any): Promise<boolean> => {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "god_mode")) {
      res.status(403).json({ error: "Admin access required" });
      return false;
    }
    return true;
  };

  const requireAuth = async (req: any, res: any): Promise<boolean> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return false;
    }
    return true;
  };

  const validatePacketStatus = async (packetId: string, allowedStatuses: string[]): Promise<{ valid: boolean; status?: string; error?: string }> => {
    const packet = await db.query.permitPackets.findFirst({
      where: eq(permitPackets.id, packetId),
    });
    
    if (!packet) {
      return { valid: false, error: "Packet not found" };
    }
    
    if (!allowedStatuses.includes(packet.status)) {
      return { valid: false, status: packet.status, error: `Invalid status. Current: ${packet.status}, allowed: ${allowedStatuses.join(", ")}` };
    }
    
    return { valid: true, status: packet.status };
  };

  app.get("/api/jobs/:jobId/permits", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAuth(req, res))) return;
      const items = await permitService.listByJob(req.params.jobId);
      res.json(items);
    } catch (error) {
      console.error("Permit list failed:", error);
      res.status(500).json({ error: "Failed to load permits" });
    }
  });

  app.post("/api/jobs/:jobId/permits/detect", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAuth(req, res))) return;
      const userId = req.user.id;
      const created = await permitService.detectForJob(req.params.jobId, userId);
      res.json({ created });
    } catch (error) {
      console.error("Permit detect failed:", error);
      res.status(500).json({ error: "Failed to detect permits" });
    }
  });

  app.post("/api/jobs/:jobId/permits/:packetId/generate", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAuth(req, res))) return;
      
      const { packetId } = req.params;
      const { templateId, useQueue } = req.body;
      
      const statusCheck = await validatePacketStatus(packetId, ["detected", "needs_template", "error"]);
      if (!statusCheck.valid) {
        return res.status(400).json({ error: statusCheck.error });
      }
      
      if (useQueue && isRedisConfigured()) {
        const idempotencyKey = `packet-${packetId}-${templateId}-${Date.now()}`;
        await addPacketGenerateJob({ packetId, templateId, idempotencyKey });
        res.json({ queued: true, message: "Generation job queued" });
      } else {
        const userId = req.user.id;
        const result = await permitService.generatePacketPdf(packetId, userId);
        res.json(result);
      }
    } catch (error) {
      console.error("Permit generate failed:", error);
      res.status(500).json({ error: "Failed to generate permit packet" });
    }
  });

  app.patch("/api/jobs/:jobId/permits/:packetId/finalize", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAuth(req, res))) return;
      
      const { packetId } = req.params;
      const { customerFields, doNotStorePII } = req.body;
      
      const statusCheck = await validatePacketStatus(packetId, ["needs_customer_info", "ready_for_review"]);
      if (!statusCheck.valid) {
        return res.status(400).json({ error: statusCheck.error });
      }
      
      const result = await finalizePacketWithCustomerInfo(packetId, customerFields || {}, doNotStorePII || false);
      res.json(result);
    } catch (error) {
      console.error("Permit finalize failed:", error);
      res.status(500).json({ error: "Failed to finalize permit packet" });
    }
  });

  app.post("/api/jobs/:jobId/permits/:packetId/submit", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAuth(req, res))) return;
      
      const { packetId } = req.params;
      const { method, destinationEmail, confirmationNumber, notes, useQueue } = req.body;
      
      const statusCheck = await validatePacketStatus(packetId, ["ready_to_submit"]);
      if (!statusCheck.valid) {
        return res.status(400).json({ error: statusCheck.error + ". Please finalize the permit first." });
      }
      
      const documents = await db.query.permitPacketDocuments.findMany({
        where: eq(permitPacketDocuments.packetId, packetId),
      });
      
      if (documents.length === 0) {
        return res.status(400).json({ error: "No documents found. Please generate a PDF first." });
      }
      
      if (method === "email") {
        if (!destinationEmail) {
          return res.status(400).json({ error: "Destination email required for email submission" });
        }
        
        if (useQueue && isRedisConfigured()) {
          const attachmentHashes = [packetId];
          const idempotencyKey = `email-${packetId}-${destinationEmail}-${crypto.createHash("md5").update(attachmentHashes.join(",")).digest("hex")}`;
          await addEmailSubmitJob({ packetId, destinationEmail, attachmentHashes, idempotencyKey });
          res.json({ queued: true, message: "Email submission job queued" });
        } else {
          const result = await submitPacketViaEmail(packetId, destinationEmail);
          res.json(result);
        }
      } else if (method === "assisted") {
        if (!confirmationNumber) {
          return res.status(400).json({ error: "Confirmation number required for assisted submission" });
        }
        const result = await submitPacketAssisted(packetId, confirmationNumber, notes);
        res.json(result);
      } else {
        res.status(400).json({ error: "Invalid submission method. Use 'email' or 'assisted'" });
      }
    } catch (error) {
      console.error("Permit submit failed:", error);
      res.status(500).json({ error: "Failed to submit permit packet" });
    }
  });

  app.get("/api/jobs/:jobId/permits/:packetId/documents", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAuth(req, res))) return;
      
      const { packetId } = req.params;
      
      const documents = await db.query.permitPacketDocuments.findMany({
        where: eq(permitPacketDocuments.packetId, packetId),
      });
      
      const docsWithUrls = await Promise.all(documents.map(async (doc) => {
        if (doc.fileKey && isS3Configured()) {
          const signedUrl = await getSignedDownloadUrl(doc.fileKey);
          return { ...doc, downloadUrl: signedUrl };
        }
        return { ...doc, downloadUrl: doc.url };
      }));
      
      res.json(docsWithUrls);
    } catch (error) {
      console.error("Permit documents fetch failed:", error);
      res.status(500).json({ error: "Failed to fetch permit documents" });
    }
  });

  app.get("/api/admin/permits/templates", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAdmin(req, res))) return;
      
      const templates = await db.query.permitTemplates.findMany({
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
      
      res.json(templates);
    } catch (error) {
      console.error("Templates list failed:", error);
      res.status(500).json({ error: "Failed to list templates" });
    }
  });

  app.post("/api/admin/permits/templates/:id/upload", upload.single("file"), async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAdmin(req, res))) return;
      
      const { id } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const buffer = file.buffer as Buffer;
      const sha256 = computeHash(buffer);
      
      let fileKey: string | null = null;
      if (isS3Configured()) {
        const uploadResult = await putPdf(buffer, "templates");
        fileKey = uploadResult.fileKey;
      }
      
      await db.update(permitTemplates)
        .set({
          fileKey,
          fileSha256: sha256,
          fileSize: buffer.length,
          updatedAt: new Date(),
        })
        .where(eq(permitTemplates.id, id));
      
      res.json({ success: true, fileKey, sha256, size: buffer.length });
    } catch (error) {
      console.error("Template upload failed:", error);
      res.status(500).json({ error: "Failed to upload template" });
    }
  });

  app.patch("/api/admin/permits/templates/:id/activate", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAdmin(req, res))) return;
      
      const { id } = req.params;
      
      const template = await db.query.permitTemplates.findFirst({
        where: eq(permitTemplates.id, id),
      });
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      await db.update(permitTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(permitTemplates.jurisdictionId, template.jurisdictionId),
          eq(permitTemplates.permitTypeId, template.permitTypeId),
        ));
      
      await db.update(permitTemplates)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(permitTemplates.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Template activate failed:", error);
      res.status(500).json({ error: "Failed to activate template" });
    }
  });

  app.post("/api/admin/permits/jurisdictions/:id/check-forms", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAdmin(req, res))) return;
      
      const { id } = req.params;
      const { useQueue } = req.body;
      
      if (useQueue && isRedisConfigured()) {
        const today = new Date().toISOString().slice(0, 10);
        const idempotencyKey = `forms-check-${id}-${today}`;
        await addFormsCheckJob({ jurisdictionId: id, idempotencyKey });
        res.json({ queued: true, message: "Forms check job queued" });
      } else {
        const result = await checkJurisdictionForms(id);
        res.json(result);
      }
    } catch (error) {
      console.error("Forms check failed:", error);
      res.status(500).json({ error: "Failed to check forms" });
    }
  });

  app.get("/api/admin/permits/webhooks", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAdmin(req, res))) return;
      
      const endpoints = await listWebhookEndpoints();
      res.json(endpoints);
    } catch (error) {
      console.error("Webhook list failed:", error);
      res.status(500).json({ error: "Failed to list webhooks" });
    }
  });

  app.post("/api/admin/permits/webhooks", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAdmin(req, res))) return;
      
      const { name, url, events } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ error: "Name and URL are required" });
      }
      
      const result = await createWebhookEndpoint(name, url, events || []);
      res.json(result);
    } catch (error) {
      console.error("Webhook create failed:", error);
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.patch("/api/admin/permits/webhooks/:id", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAdmin(req, res))) return;
      
      const { id } = req.params;
      const { name, url, events, isActive } = req.body;
      
      await updateWebhookEndpoint(id, { name, url, events, isActive });
      res.json({ success: true });
    } catch (error) {
      console.error("Webhook update failed:", error);
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  app.delete("/api/admin/permits/webhooks/:id", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAdmin(req, res))) return;
      
      const { id } = req.params;
      await deleteWebhookEndpoint(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Webhook delete failed:", error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  app.get("/api/permits/job-ids", async (req: any, res) => {
    try {
      if (!(await requireAuth(req, res))) return;
      const rows = await db.selectDistinct({ jobId: permitPackets.jobId }).from(permitPackets);
      res.json(rows.map(r => r.jobId).filter(Boolean));
    } catch (error) {
      console.error("Failed to fetch permit job IDs:", error);
      res.json([]);
    }
  });

  app.get("/api/permits/status", async (req: any, res) => {
    try {
      if (!(await requireEnabled(req, res))) return;
      if (!(await requireAuth(req, res))) return;
      
      res.json({
        s3Configured: isS3Configured(),
        redisConfigured: isRedisConfigured(),
      });
    } catch (error) {
      console.error("Permit status check failed:", error);
      res.status(500).json({ error: "Failed to check permit status" });
    }
  });
}
