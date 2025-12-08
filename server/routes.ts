import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertLeadSchema,
  insertCallSchema,
  insertJobSchema,
  insertJobTimelineEventSchema,
  insertQuoteSchema,
  insertNotificationSchema,
  insertTechnicianSchema,
} from "@shared/schema";
import { isWithinRadius } from "./geocoding";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json({ status: "ok", userCount: users.length });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ status: "error", error: String(error) });
    }
  });

  // Technicians
  app.get("/api/technicians", async (req, res) => {
    try {
      const technicians = await storage.getTechnicians();
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });

  app.get("/api/technicians/available", async (req, res) => {
    const technicians = await storage.getAvailableTechnicians();
    res.json(technicians);
  });

  app.get("/api/technicians/:id", async (req, res) => {
    const tech = await storage.getTechnician(req.params.id);
    if (!tech) return res.status(404).json({ error: "Technician not found" });
    res.json(tech);
  });

  app.post("/api/technicians", async (req, res) => {
    const result = insertTechnicianSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const tech = await storage.createTechnician(result.data);
    res.status(201).json(tech);
  });

  app.patch("/api/technicians/:id", async (req, res) => {
    const tech = await storage.updateTechnician(req.params.id, req.body);
    if (!tech) return res.status(404).json({ error: "Technician not found" });
    res.json(tech);
  });

  // Leads
  app.get("/api/leads", async (req, res) => {
    try {
      const { status } = req.query;
      const leads = status 
        ? await storage.getLeadsByStatus(status as string)
        : await storage.getLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  });

  app.post("/api/leads", async (req, res) => {
    const result = insertLeadSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const lead = await storage.createLead(result.data);
    res.status(201).json(lead);
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const lead = await storage.updateLead(req.params.id, req.body);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  });

  // Calls
  app.get("/api/calls", async (req, res) => {
    const { limit } = req.query;
    const calls = limit 
      ? await storage.getRecentCalls(parseInt(limit as string))
      : await storage.getCalls();
    res.json(calls);
  });

  app.get("/api/calls/:id", async (req, res) => {
    const call = await storage.getCall(req.params.id);
    if (!call) return res.status(404).json({ error: "Call not found" });
    res.json(call);
  });

  app.post("/api/calls", async (req, res) => {
    const result = insertCallSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const call = await storage.createCall(result.data);
    res.status(201).json(call);
  });

  // Jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const { status, technicianId } = req.query;
      let jobs;
      if (technicianId) {
        jobs = await storage.getJobsByTechnician(technicianId as string);
      } else if (status) {
        jobs = await storage.getJobsByStatus(status as string);
      } else {
        jobs = await storage.getJobs();
      }
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.post("/api/jobs", async (req, res) => {
    const result = insertJobSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const job = await storage.createJob(result.data);
    res.status(201).json(job);
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    const job = await storage.updateJob(req.params.id, req.body);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  // Job assignment workflow
  app.post("/api/jobs/:id/assign", async (req, res) => {
    const { technicianId, dispatcherId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const tech = await storage.getTechnician(technicianId);
    if (!tech) return res.status(404).json({ error: "Technician not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      assignedTechnicianId: technicianId,
      dispatcherId,
      status: "assigned",
      assignedAt: now,
    });
    
    // Create timeline event
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "assigned",
      description: `Assigned to ${tech.fullName}`,
      createdBy: dispatcherId,
    });
    
    // Create notification for technician
    if (tech.userId) {
      await storage.createNotification({
        userId: tech.userId,
        type: "job_assigned",
        title: "New Job Assigned",
        message: `You have been assigned to ${job.serviceType} at ${job.address}`,
        jobId: req.params.id,
        actionUrl: `/technician/jobs/${req.params.id}`,
      });
    }
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/confirm", async (req, res) => {
    const { technicianId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      status: "confirmed",
      confirmedAt: now,
    });
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "confirmed",
      description: "Technician confirmed assignment",
      createdBy: technicianId,
    });
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/en-route", async (req, res) => {
    const { technicianId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      status: "en_route",
      enRouteAt: now,
    });
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "en_route",
      description: "Technician en route to job",
      createdBy: technicianId,
    });
    
    // Update technician status
    if (technicianId) {
      await storage.updateTechnician(technicianId, { 
        status: "busy",
        currentJobId: req.params.id,
      });
    }
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/arrive", async (req, res) => {
    const { technicianId, latitude, longitude } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    let arrivalVerified: boolean | null = null;
    let arrivalDistance: number | null = null;
    
    const hasValidTechLocation = latitude !== undefined && latitude !== null;
    const hasValidJobLocation = job.latitude !== undefined && job.latitude !== null && 
                                job.longitude !== undefined && job.longitude !== null;
    
    if (hasValidTechLocation && hasValidJobLocation) {
      const result = isWithinRadius(
        latitude,
        longitude,
        parseFloat(job.latitude!),
        parseFloat(job.longitude!)
      );
      arrivalVerified = result.isWithin;
      arrivalDistance = result.distance;
    }
    
    const updated = await storage.updateJob(req.params.id, {
      status: "on_site",
      arrivedAt: now,
      arrivalLat: hasValidTechLocation ? String(latitude) : null,
      arrivalLng: hasValidTechLocation ? String(longitude) : null,
      arrivalVerified,
      arrivalDistance: arrivalDistance !== null ? String(arrivalDistance) : null,
    });
    
    const locationInfo = arrivalVerified !== null
      ? ` (${arrivalVerified ? "Location verified" : "Location not verified"} - ${arrivalDistance}m from job site)`
      : "";
    
    const metadata: Record<string, unknown> = {};
    if (hasValidTechLocation) {
      metadata.latitude = latitude;
      metadata.longitude = longitude;
    }
    if (arrivalVerified !== null) {
      metadata.arrivalVerified = arrivalVerified;
      metadata.arrivalDistance = arrivalDistance;
    }
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "arrived",
      description: `Technician arrived at job site${locationInfo}`,
      createdBy: technicianId,
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
    });
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/start", async (req, res) => {
    const { technicianId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      status: "in_progress",
      startedAt: now,
    });
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "started",
      description: "Work started",
      createdBy: technicianId,
    });
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/complete", async (req, res) => {
    const { technicianId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      status: "completed",
      completedAt: now,
    });
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "completed",
      description: "Job completed",
      createdBy: technicianId,
    });
    
    // Update technician status
    if (technicianId) {
      const tech = await storage.getTechnician(technicianId);
      if (tech) {
        await storage.updateTechnician(technicianId, { 
          status: "available",
          currentJobId: null,
          completedJobsToday: (tech.completedJobsToday || 0) + 1,
        });
      }
    }
    
    res.json(updated);
  });

  // Job Timeline
  app.get("/api/jobs/:id/timeline", async (req, res) => {
    const events = await storage.getJobTimelineEvents(req.params.id);
    res.json(events);
  });

  app.post("/api/jobs/:id/timeline", async (req, res) => {
    const result = insertJobTimelineEventSchema.safeParse({
      ...req.body,
      jobId: req.params.id,
    });
    if (!result.success) return res.status(400).json({ error: result.error });
    const event = await storage.createJobTimelineEvent(result.data);
    res.status(201).json(event);
  });

  // Quotes
  app.get("/api/quotes", async (req, res) => {
    const { jobId } = req.query;
    if (jobId) {
      const quotes = await storage.getQuotesByJob(jobId as string);
      res.json(quotes);
    } else {
      res.status(400).json({ error: "jobId query parameter required" });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    const quote = await storage.getQuote(req.params.id);
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    res.json(quote);
  });

  app.post("/api/quotes", async (req, res) => {
    const result = insertQuoteSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const quote = await storage.createQuote(result.data);
    
    // Create timeline event
    await storage.createJobTimelineEvent({
      jobId: result.data.jobId,
      eventType: "quote_sent",
      description: `Quote created for $${result.data.total}`,
      createdBy: result.data.technicianId || undefined,
    });
    
    res.status(201).json(quote);
  });

  app.patch("/api/quotes/:id", async (req, res) => {
    const updates = { ...req.body };
    const dateFields = ['sentAt', 'viewedAt', 'acceptedAt', 'declinedAt', 'expiresAt'];
    dateFields.forEach(field => {
      if (updates[field] && typeof updates[field] === 'string') {
        updates[field] = new Date(updates[field]);
      }
    });
    const quote = await storage.updateQuote(req.params.id, updates);
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    res.json(quote);
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId, unread } = req.query;
      if (!userId) return res.status(400).json({ error: "userId required" });
      
      const notifications = unread === "true"
        ? await storage.getUnreadNotifications(userId as string)
        : await storage.getNotificationsByUser(userId as string);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    const result = insertNotificationSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const notification = await storage.createNotification(result.data);
    res.status(201).json(notification);
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    const notification = await storage.markNotificationRead(req.params.id);
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  // Analytics
  app.get("/api/analytics", async (req, res) => {
    try {
      const { range } = req.query;
      const analytics = await storage.getAnalytics((range as string) || "year");
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ 
        error: "Failed to fetch analytics",
        summary: {
          totalRevenue: 0,
          totalLeads: 0,
          conversionRate: 0,
          netProfit: 0,
          revenueChange: 0,
          leadsChange: 0,
          conversionChange: 0,
          profitChange: 0,
        },
        sourceComparison: [],
        monthlyRevenue: [],
        serviceBreakdown: [],
        techPerformance: [],
        conversionFunnel: [],
      });
    }
  });

  return httpServer;
}
