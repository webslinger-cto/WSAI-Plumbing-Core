import type { Express, Request, Response } from "express";
import { customerService } from "./service";
import { matchOrCreateCustomer } from "./matching";
import { z } from "zod";
import { db } from "../../db";
import { chatThreads, chatThreadParticipants } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../../storage";

const customerCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phonePrimary: z.string().optional(),
  phoneAlt: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  preferredContactMethod: z.enum(["call", "text", "email"]).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  preferences: z.record(z.any()).optional(),
  status: z.enum(["active", "do_not_service", "inactive"]).optional(),
  primaryAddress: z
    .object({
      street1: z.string().min(1),
      street2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      zip: z.string().min(1),
      label: z.string().optional(),
    })
    .optional(),
});

const addressSchema = z.object({
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  label: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const paymentProfileSchema = z.object({
  paymentType: z.enum(["cash", "card", "check", "ach"]),
  details: z.record(z.any()).optional(),
  isDefault: z.boolean().optional(),
});

export function registerCustomerRoutes(app: Express, { isAuthenticatedUser }: { isAuthenticatedUser: (req: Request, res: Response, next: () => void) => void }) {
  app.get("/api/customers", isAuthenticatedUser, async (req: any, res) => {
    try {
      const { search, status, tag, limit, offset } = req.query;
      const customers = await customerService.list({
        search: search as string,
        status: status as string,
        tag: tag as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(customers);
    } catch (error) {
      console.error("Customer list failed:", error);
      res.status(500).json({ error: "Failed to load customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticatedUser, async (req, res) => {
    try {
      const customer = await customerService.getById(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Customer get failed:", error);
      res.status(500).json({ error: "Failed to load customer" });
    }
  });

  app.post("/api/customers", isAuthenticatedUser, async (req, res) => {
    try {
      const parsed = customerCreateSchema.parse(req.body);
      const { primaryAddress, ...customerData } = parsed;

      const customer = await customerService.create(
        { 
          ...customerData, 
          tags: customerData.tags || [],
          preferences: customerData.preferences || {},
        },
        primaryAddress
      );
      res.status(201).json(customer);
    } catch (error) {
      console.error("Customer create failed:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticatedUser, async (req: any, res) => {
    try {
      const oldCustomer = await customerService.getById(req.params.id);
      const updated = await customerService.update(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Customer not found" });
      }

      if (oldCustomer) {
        const skipFields = ["updatedAt", "createdAt", "id"];
        const diffs: Record<string, { old: unknown; new: unknown }> = {};
        for (const key of Object.keys(req.body)) {
          if (skipFields.includes(key)) continue;
          const oldVal = (oldCustomer as any)[key];
          const newVal = req.body[key];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            diffs[key] = { old: oldVal ?? null, new: newVal ?? null };
          }
        }
        if (Object.keys(diffs).length > 0) {
          try {
            const userId = req.session?.passport?.user || null;
            let userName: string | null = null;
            let userRole: string | null = null;
            if (userId) {
              const u = await storage.getUser(userId);
              if (u) { userName = u.fullName || u.username; userRole = u.role; }
            }
            await storage.createAuditLog({
              entityType: "customer",
              entityId: req.params.id,
              action: "update",
              userId,
              userName,
              userRole,
              changedFields: diffs,
              summary: `Updated customer: ${Object.keys(diffs).join(", ")}`,
              ipAddress: req.ip || null,
              userAgent: req.headers["user-agent"] || null,
            });
          } catch (auditErr) {
            console.error("Customer audit log error:", auditErr);
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Customer update failed:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticatedUser, async (req: any, res) => {
    try {
      const customer = await customerService.getById(req.params.id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      const success = await storage.deleteCustomer(req.params.id);
      if (success) {
        try {
          const userId = req.session?.passport?.user || req.headers['x-user-id'] || null;
          let userName: string | null = null;
          let userRole: string | null = null;
          if (userId) {
            const u = await storage.getUser(userId);
            if (u) { userName = u.fullName || u.username; userRole = u.role; }
          }
          await storage.createAuditLog({
            entityType: "customer",
            entityId: req.params.id,
            action: "delete",
            userId,
            userName,
            userRole,
            changedFields: { customerName: { old: `${customer.firstName} ${customer.lastName}`, new: null } },
            summary: `Deleted customer "${customer.firstName} ${customer.lastName}" and all related data`,
            ipAddress: req.ip || null,
            userAgent: req.headers["user-agent"] || null,
          });
        } catch (auditErr) {
          console.error("Customer delete audit log error:", auditErr);
        }
        res.json({ success: true, message: `Customer "${customer.firstName} ${customer.lastName}" and all related data deleted` });
      } else {
        res.status(500).json({ error: "Failed to delete customer" });
      }
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: error.message || "Failed to delete customer" });
    }
  });

  app.post("/api/customers/:id/addresses", isAuthenticatedUser, async (req, res) => {
    try {
      const parsed = addressSchema.parse(req.body);
      const address = await customerService.addAddress(req.params.id, parsed);
      res.status(201).json(address);
    } catch (error) {
      console.error("Address create failed:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create address" });
    }
  });

  app.patch("/api/customers/:id/addresses/:addressId", isAuthenticatedUser, async (req, res) => {
    try {
      const updated = await customerService.updateAddress(req.params.id, req.params.addressId, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Address not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Address update failed:", error);
      res.status(500).json({ error: "Failed to update address" });
    }
  });

  app.post("/api/customers/:id/payment-profiles", isAuthenticatedUser, async (req, res) => {
    try {
      const parsed = paymentProfileSchema.parse(req.body);
      const profile = await customerService.addPaymentProfile(req.params.id, {
        ...parsed,
        details: parsed.details || {},
      });
      res.status(201).json(profile);
    } catch (error) {
      console.error("Payment profile create failed:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment profile" });
    }
  });

  app.patch("/api/customers/:id/payment-profiles/:profileId", isAuthenticatedUser, async (req, res) => {
    try {
      const updated = await customerService.updatePaymentProfile(req.params.id, req.params.profileId, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Payment profile not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Payment profile update failed:", error);
      res.status(500).json({ error: "Failed to update payment profile" });
    }
  });

  app.get("/api/customers/:id/jobs", isAuthenticatedUser, async (req, res) => {
    try {
      const jobs = await customerService.getRelatedJobs(req.params.id);
      res.json(jobs);
    } catch (error) {
      console.error("Customer jobs fetch failed:", error);
      res.status(500).json({ error: "Failed to load customer jobs" });
    }
  });

  app.get("/api/customers/:id/quotes", isAuthenticatedUser, async (req, res) => {
    try {
      const quotes = await customerService.getRelatedQuotes(req.params.id);
      res.json(quotes);
    } catch (error) {
      console.error("Customer quotes fetch failed:", error);
      res.status(500).json({ error: "Failed to load customer quotes" });
    }
  });

  app.get("/api/customers/:id/leads", isAuthenticatedUser, async (req, res) => {
    try {
      const leads = await customerService.getRelatedLeads(req.params.id);
      res.json(leads);
    } catch (error) {
      console.error("Customer leads fetch failed:", error);
      res.status(500).json({ error: "Failed to load customer leads" });
    }
  });

  app.get("/api/customers/:id/calls", isAuthenticatedUser, async (req, res) => {
    try {
      const callHistory = await customerService.getRelatedCalls(req.params.id);
      res.json(callHistory);
    } catch (error) {
      console.error("Customer calls fetch failed:", error);
      res.status(500).json({ error: "Failed to load customer calls" });
    }
  });

  app.get("/api/customers/:id/messages", isAuthenticatedUser, async (req, res) => {
    try {
      const messages = await customerService.getRelatedMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Customer messages fetch failed:", error);
      res.status(500).json({ error: "Failed to load customer messages" });
    }
  });

  app.get("/api/customers/:id/media", isAuthenticatedUser, async (req, res) => {
    try {
      const media = await customerService.getRelatedMedia(req.params.id);
      res.json(media);
    } catch (error) {
      console.error("Customer media fetch failed:", error);
      res.status(500).json({ error: "Failed to load customer media" });
    }
  });

  app.get("/api/customers/:id/audit-logs", isAuthenticatedUser, async (req, res) => {
    try {
      const logs = await customerService.getRelatedAuditLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Customer audit logs fetch failed:", error);
      res.status(500).json({ error: "Failed to load customer audit logs" });
    }
  });

  app.post("/api/customers/:id/chat-thread", isAuthenticatedUser, async (req: any, res) => {
    try {
      const customerId = req.params.id;
      const userId = req.user?.id || req.headers["x-user-id"];

      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }

      const customer = await customerService.getById(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const existing = await db
        .select()
        .from(chatThreads)
        .where(and(eq(chatThreads.customerId, customerId), eq(chatThreads.status, "active")))
        .limit(1);

      if (existing.length > 0) {
        return res.json({ threadId: existing[0].id, existing: true });
      }

      const [thread] = await db
        .insert(chatThreads)
        .values({
          customerId,
          visibility: "customer_visible",
          status: "active",
          subject: `${customer.firstName} ${customer.lastName}`,
          createdByType: "user",
          createdById: userId,
        })
        .returning();

      await db.insert(chatThreadParticipants).values({
        threadId: thread.id,
        participantType: "user",
        participantId: userId,
        roleAtTime: req.user?.role || "dispatcher",
        displayName: req.user?.fullName || req.user?.username,
      });

      res.status(201).json({ threadId: thread.id, existing: false });
    } catch (error) {
      console.error("Customer chat thread creation failed:", error);
      res.status(500).json({ error: "Failed to create chat thread" });
    }
  });
}
