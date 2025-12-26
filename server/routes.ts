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
  insertSalespersonSchema,
  insertShiftLogSchema,
  insertQuoteTemplateSchema,
  insertContactAttemptSchema,
  insertWebhookLogSchema,
  insertJobAttachmentSchema,
  insertJobChecklistSchema,
  insertTechnicianLocationSchema,
  insertChecklistTemplateSchema,
  insertPricebookItemSchema,
  insertPricebookCategorySchema,
  insertMarketingCampaignSchema,
  insertMarketingSpendSchema,
  type InsertLead,
} from "@shared/schema";
import { sendEmail, generateLeadAcknowledgmentEmail } from "./services/email";
import { isWithinRadius } from "./geocoding";
import { 
  autoContactLead, 
  createJobFromLead, 
  autoAssignTechnician, 
  cancelJob, 
  updateJobCosts, 
  completeJob,
  sendAppointmentReminder,
  sendTechnicianEnRouteSMS,
  sendJobCompleteSMS,
  calculateJobROI,
  notifyLeadRecipients,
  notifyJobCreated,
  notifyJobAssigned,
  notifyJobApproved,
  notifyQuoteCreated,
} from "./services/automation";
import * as smsService from "./services/sms";
import { dispatchToClosestTechnician } from "./services/dispatch";
import { generateApplicationPDF, generateComparisonPDF, generateHouseCallProComparisonPDF, generateTestResultsPDF, generateThreeWayComparisonPDF } from "./services/pdf-generator";

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

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // If technician, get the technician record and verify linkage
      let technician = null;
      if (user.role === "technician") {
        technician = await storage.getTechnicianByUserId(user.id);
        if (!technician) {
          return res.status(400).json({ 
            error: "Technician account not properly configured. Please contact an administrator." 
          });
        }
      }

      // If salesperson, get the salesperson record and verify linkage
      let salesperson = null;
      if (user.role === "salesperson") {
        salesperson = await storage.getSalespersonByUserId(user.id);
        if (!salesperson) {
          return res.status(400).json({ 
            error: "Salesperson account not properly configured. Please contact an administrator." 
          });
        }
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        technicianId: technician?.id || null,
        salespersonId: salesperson?.id || null,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
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

  // Salespersons
  app.get("/api/salespersons", async (req, res) => {
    try {
      const salespersons = await storage.getSalespersons();
      res.json(salespersons);
    } catch (error) {
      console.error("Error fetching salespersons:", error);
      res.status(500).json({ error: "Failed to fetch salespersons" });
    }
  });

  app.get("/api/salespersons/available", async (req, res) => {
    const salespersons = await storage.getAvailableSalespersons();
    res.json(salespersons);
  });

  app.get("/api/salespersons/:id", async (req, res) => {
    const sp = await storage.getSalesperson(req.params.id);
    if (!sp) return res.status(404).json({ error: "Salesperson not found" });
    res.json(sp);
  });

  app.get("/api/salespersons/:id/commissions", async (req, res) => {
    try {
      const commissions = await storage.getSalesCommissionsBySalesperson(req.params.id);
      res.json(commissions);
    } catch (error) {
      console.error("Error fetching salesperson commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.post("/api/salespersons", async (req, res) => {
    const result = insertSalespersonSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    try {
      const sp = await storage.createSalesperson(result.data);
      res.status(201).json(sp);
    } catch (error) {
      console.error("Error creating salesperson:", error);
      res.status(500).json({ error: "Failed to create salesperson" });
    }
  });

  app.patch("/api/salespersons/:id", async (req, res) => {
    const sp = await storage.updateSalesperson(req.params.id, req.body);
    if (!sp) return res.status(404).json({ error: "Salesperson not found" });
    res.json(sp);
  });

  // Sales Commissions
  app.get("/api/sales-commissions", async (req, res) => {
    try {
      const { salespersonId, status } = req.query;
      let commissions;
      if (salespersonId) {
        commissions = await storage.getSalesCommissionsBySalesperson(salespersonId as string);
      } else if (status) {
        commissions = await storage.getSalesCommissionsByStatus(status as string);
      } else {
        commissions = await storage.getSalesCommissionsByStatus("pending");
      }
      res.json(commissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.get("/api/sales-commissions/:id", async (req, res) => {
    const commission = await storage.getSalesCommission(req.params.id);
    if (!commission) return res.status(404).json({ error: "Commission not found" });
    res.json(commission);
  });

  app.post("/api/sales-commissions/calculate/:jobId", async (req, res) => {
    try {
      const { salespersonId } = req.body;
      if (!salespersonId) {
        return res.status(400).json({ error: "salespersonId is required" });
      }
      const commission = await storage.calculateJobCommission(req.params.jobId, salespersonId);
      if (!commission) {
        return res.status(400).json({ error: "Could not calculate commission - job may not be completed or has no profit" });
      }
      res.status(201).json(commission);
    } catch (error) {
      console.error("Error calculating commission:", error);
      res.status(500).json({ error: "Failed to calculate commission" });
    }
  });

  app.patch("/api/sales-commissions/:id", async (req, res) => {
    const commission = await storage.updateSalesCommission(req.params.id, req.body);
    if (!commission) return res.status(404).json({ error: "Commission not found" });
    res.json(commission);
  });

  // Salesperson Location Tracking
  app.get("/api/salespersons/:id/locations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const locations = await storage.getSalespersonLocations(req.params.id, limit);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching salesperson locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.get("/api/salespersons/locations/all", async (req, res) => {
    try {
      const locations = await storage.getAllSalespersonsLatestLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching all salesperson locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.post("/api/salespersons/:id/location", async (req, res) => {
    try {
      const { latitude, longitude, accuracy, speed, heading, altitude, batteryLevel, isMoving, leadId } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "latitude and longitude are required" });
      }
      
      const location = await storage.createSalespersonLocation({
        salespersonId: req.params.id,
        latitude: String(latitude),
        longitude: String(longitude),
        accuracy: accuracy ? String(accuracy) : null,
        speed: speed ? String(speed) : null,
        heading: heading ? String(heading) : null,
        altitude: altitude ? String(altitude) : null,
        batteryLevel: batteryLevel || null,
        isMoving: isMoving ?? null,
        leadId: leadId || null,
      });
      
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating salesperson location:", error);
      res.status(500).json({ error: "Failed to save location" });
    }
  });

  // Sales Analytics
  app.get("/api/sales-analytics/:salespersonId", async (req, res) => {
    try {
      const { salespersonId } = req.params;
      const salesperson = await storage.getSalesperson(salespersonId);
      if (!salesperson) {
        return res.status(404).json({ error: "Salesperson not found" });
      }

      const commissions = await storage.getSalesCommissionsBySalesperson(salespersonId);
      const allJobs = await storage.getJobs();
      const jobs = allJobs.filter(j => j.assignedSalespersonId === salespersonId);
      const quotes = await storage.getAllQuotes();
      const salespersonQuotes = quotes.filter(q => {
        const job = allJobs.find(j => j.id === q.jobId);
        return job?.assignedSalespersonId === salespersonId;
      });

      const totalCommissionEarned = commissions
        .filter(c => c.status === "paid")
        .reduce((sum, c) => sum + parseFloat(String(c.commissionAmount || 0)), 0);
      
      const pendingCommission = commissions
        .filter(c => c.status === "pending" || c.status === "approved")
        .reduce((sum, c) => sum + parseFloat(String(c.commissionAmount || 0)), 0);
      
      const totalJobsHandled = jobs.length;
      const completedJobs = jobs.filter(j => j.status === "completed").length;
      const totalQuotesSent = salespersonQuotes.filter(q => q.status !== "draft").length;
      const acceptedQuotes = salespersonQuotes.filter(q => q.status === "accepted").length;
      const conversionRate = totalQuotesSent > 0 ? (acceptedQuotes / totalQuotesSent) * 100 : 0;
      
      const totalRevenue = jobs
        .filter(j => j.status === "completed")
        .reduce((sum, j) => sum + parseFloat(String(j.totalRevenue || 0)), 0);

      res.json({
        salesperson: {
          id: salesperson.id,
          fullName: salesperson.fullName,
          commissionRate: salesperson.commissionRate,
        },
        summary: {
          totalCommissionEarned,
          pendingCommission,
          totalJobsHandled,
          completedJobs,
          totalQuotesSent,
          acceptedQuotes,
          conversionRate: conversionRate.toFixed(1),
          totalRevenue,
        },
        recentCommissions: commissions.slice(0, 10),
        recentJobs: jobs.slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Dispatch to closest technician
  app.post("/api/dispatch/closest-technician", async (req, res) => {
    try {
      const { address, jobId, customerName, serviceType } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }
      
      const result = await dispatchToClosestTechnician(address, jobId, customerName, serviceType);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({
        success: true,
        technician: {
          id: result.technician?.technician.id,
          name: result.technician?.technician.fullName,
          phone: result.technician?.technician.phone,
          email: result.technician?.technician.email,
          distanceMiles: result.technician?.distanceMiles,
        },
        coordinates: result.coordinates,
        emailSent: result.emailSent,
      });
    } catch (error) {
      console.error("Dispatch error:", error);
      res.status(500).json({ error: "Dispatch failed" });
    }
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

  // Lead scoring function
  function calculateLeadScore(lead: Partial<InsertLead>): number {
    let score = 50; // Base score
    
    // Service type scoring (emergency services = higher priority)
    const highValueServices = ["Sewer Main - Replace", "Sewer Main - Repair", "Water Heater - Replace", "Pipe Replacement"];
    const mediumValueServices = ["Sewer Main - Clear", "Water Heater - Repair", "Hydro Jetting", "Camera Inspection", "Ejector Pump", "Sump Pump"];
    const lowValueServices = ["Drain Cleaning", "Toilet Repair", "Faucet Repair"];
    
    if (lead.serviceType) {
      if (highValueServices.some(s => lead.serviceType?.includes(s))) {
        score += 25;
      } else if (mediumValueServices.some(s => lead.serviceType?.includes(s))) {
        score += 15;
      } else if (lowValueServices.some(s => lead.serviceType?.includes(s))) {
        score += 5;
      }
    }
    
    // Lead source quality scoring
    const highQualitySources = ["Direct", "Referral", "Website"];
    const mediumQualitySources = ["eLocal", "Networx"];
    const lowQualitySources = ["Thumbtack", "Angi", "HomeAdvisor", "Inquirly"];
    
    if (lead.source) {
      if (highQualitySources.includes(lead.source)) {
        score += 15;
      } else if (mediumQualitySources.includes(lead.source)) {
        score += 10;
      } else if (lowQualitySources.includes(lead.source)) {
        score += 5;
      }
    }
    
    // Priority scoring
    if (lead.priority === "urgent") {
      score += 20;
    } else if (lead.priority === "high") {
      score += 10;
    } else if (lead.priority === "low") {
      score -= 10;
    }
    
    // Chicago area zip codes get bonus (in-service area)
    const chicagoZips = ["60601", "60602", "60603", "60604", "60605", "60606", "60607", "60608", "60609", "60610", "60611", "60612", "60613", "60614", "60615", "60616", "60617", "60618", "60619", "60620", "60621", "60622", "60623", "60624", "60625", "60626", "60628", "60629", "60630", "60631", "60632", "60633", "60634", "60636", "60637", "60638", "60639", "60640", "60641", "60642", "60643", "60644", "60645", "60646", "60647", "60649", "60651", "60652", "60653", "60654", "60655", "60656", "60657", "60659", "60660", "60661"];
    
    if (lead.zipCode && chicagoZips.includes(lead.zipCode)) {
      score += 10;
    }
    
    // Cap score between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  app.post("/api/leads", async (req, res) => {
    const result = insertLeadSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    
    // Calculate lead score before creating
    const leadScore = calculateLeadScore(result.data);
    
    // Check for duplicate leads by phone number
    let isDuplicate = false;
    let duplicateOfId: string | null = null;
    
    if (result.data.customerPhone) {
      const existingLeads = await storage.findLeadsByPhone(result.data.customerPhone);
      if (existingLeads.length > 0) {
        // Find the oldest non-duplicate lead as the original
        const originalLead = existingLeads
          .filter(l => !l.isDuplicate)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        
        if (originalLead) {
          isDuplicate = true;
          duplicateOfId = originalLead.id;
        }
      }
    }
    
    const lead = await storage.createLead({ 
      ...result.data, 
      leadScore,
      isDuplicate,
      duplicateOfId,
      status: isDuplicate ? "duplicate" : (result.data.status || "new"),
    });
    
    // Notify team members about new lead (skip duplicates)
    if (!isDuplicate) {
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
    }
    
    res.status(201).json({ ...lead, wasDuplicateDetected: isDuplicate });
  });
  
  // Check for duplicate leads
  app.get("/api/leads/check-duplicate", async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ error: "Phone number required" });
      }
      
      const existingLeads = await storage.findLeadsByPhone(phone);
      const nonDuplicates = existingLeads.filter(l => !l.isDuplicate);
      
      res.json({
        isDuplicate: nonDuplicates.length > 0,
        originalLead: nonDuplicates[0] || null,
        matchCount: existingLeads.length,
      });
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      res.status(500).json({ error: "Failed to check for duplicates" });
    }
  });
  
  // Get all duplicate leads
  app.get("/api/leads/duplicates", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const duplicates = leads.filter(l => l.isDuplicate);
      res.json(duplicates);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      res.status(500).json({ error: "Failed to fetch duplicates" });
    }
  });

  // Customer Timeline - get all interactions by phone number
  app.get("/api/customer/timeline", async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ error: "Phone number required" });
      }
      const timeline = await storage.getCustomerTimeline(phone);
      res.json(timeline);
    } catch (error) {
      console.error("Error fetching customer timeline:", error);
      res.status(500).json({ error: "Failed to fetch customer timeline" });
    }
  });
  
  // Recalculate scores for all leads
  app.post("/api/leads/recalculate-scores", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const updates = await Promise.all(
        leads.map(async (lead) => {
          const newScore = calculateLeadScore(lead);
          return storage.updateLead(lead.id, { leadScore: newScore });
        })
      );
      res.json({ message: "Scores recalculated", updated: updates.length });
    } catch (error) {
      console.error("Error recalculating scores:", error);
      res.status(500).json({ error: "Failed to recalculate scores" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const lead = await storage.updateLead(req.params.id, req.body);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  });

  // Mark lead as contacted and check SLA
  app.post("/api/leads/:id/contact", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const now = new Date();
      const contactedAt = now;
      
      // Check if SLA was breached
      let slaBreach = false;
      if (lead.slaDeadline) {
        const deadline = new Date(lead.slaDeadline);
        slaBreach = now > deadline;
      }

      const updated = await storage.updateLead(req.params.id, {
        contactedAt,
        status: lead.status === "new" ? "contacted" : lead.status,
        slaBreach,
      });

      res.json({
        ...updated,
        slaBreached: slaBreach,
        responseTimeMinutes: lead.createdAt 
          ? Math.round((now.getTime() - new Date(lead.createdAt).getTime()) / 60000)
          : null,
      });
    } catch (error) {
      console.error("Error marking lead as contacted:", error);
      res.status(500).json({ error: "Failed to mark lead as contacted" });
    }
  });

  // Get SLA breach status for all leads
  app.get("/api/leads/sla-status", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const now = new Date();
      
      const slaStatus = leads.map(lead => {
        let status: "ok" | "warning" | "breached" | "contacted" = "ok";
        let remainingMinutes: number | null = null;
        
        if (lead.contactedAt) {
          status = "contacted";
        } else if (lead.slaDeadline) {
          const deadline = new Date(lead.slaDeadline);
          remainingMinutes = Math.round((deadline.getTime() - now.getTime()) / 60000);
          
          if (remainingMinutes <= 0) {
            status = "breached";
          } else if (remainingMinutes <= 5) {
            status = "warning";
          }
        }
        
        return {
          id: lead.id,
          status,
          remainingMinutes,
          slaDeadline: lead.slaDeadline,
          contactedAt: lead.contactedAt,
        };
      });
      
      res.json(slaStatus);
    } catch (error) {
      console.error("Error fetching SLA status:", error);
      res.status(500).json({ error: "Failed to fetch SLA status" });
    }
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

  app.get("/api/jobs/pool", async (req, res) => {
    try {
      const { technicianId } = req.query;
      if (!technicianId) {
        return res.status(400).json({ error: "technicianId required" });
      }
      const jobs = await storage.getPoolJobs(technicianId as string);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching pool jobs:", error);
      res.status(500).json({ error: "Failed to fetch pool jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      // Convert ISO date strings to Date objects for validation
      const body = { ...req.body };
      if (body.scheduledDate && typeof body.scheduledDate === 'string') {
        body.scheduledDate = new Date(body.scheduledDate);
      }
      // Handle timestamp fields that might come as strings
      const timestampFields = ['assignedAt', 'confirmedAt', 'enRouteAt', 'arrivedAt', 'startedAt', 'completedAt', 'cancelledAt'];
      timestampFields.forEach(field => {
        if (body[field] && typeof body[field] === 'string') {
          body[field] = new Date(body[field]);
        }
      });
      
      const result = insertJobSchema.safeParse(body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const job = await storage.createJob(result.data);
      
      // Notify office about new job
      notifyJobCreated(job).catch(err => 
        console.error(`Job creation notification failed for job ${job.id}:`, err)
      );
      
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      // Convert timestamp strings to Date objects
      const body = { ...req.body };
      const timestampFields = ['assignedAt', 'confirmedAt', 'enRouteAt', 'arrivedAt', 'startedAt', 'completedAt', 'cancelledAt'];
      timestampFields.forEach(field => {
        if (body[field] && typeof body[field] === 'string') {
          body[field] = new Date(body[field]);
        }
      });
      if (body.scheduledDate && typeof body.scheduledDate === 'string') {
        body.scheduledDate = new Date(body.scheduledDate);
      }
      
      const job = await storage.updateJob(req.params.id, body);
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  // Job claim (tech picks from pool)
  app.post("/api/jobs/:id/claim", async (req, res) => {
    try {
      const { technicianId } = req.body;
      if (!technicianId) {
        return res.status(400).json({ error: "technicianId required" });
      }
      
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      
      if (job.status !== "pending" || job.assignedTechnicianId) {
        return res.status(400).json({ error: "Job is no longer available" });
      }
      
      const tech = await storage.getTechnician(technicianId);
      if (!tech) return res.status(404).json({ error: "Technician not found" });
      
      const approvedTypes = tech.approvedJobTypes || [];
      if (approvedTypes.length > 0 && !approvedTypes.includes(job.serviceType)) {
        return res.status(403).json({ error: "You are not approved for this job type" });
      }
      
      const now = new Date();
      const updated = await storage.updateJob(req.params.id, {
        assignedTechnicianId: technicianId,
        status: "assigned",
        assignedAt: now,
      });
      
      await storage.createJobTimelineEvent({
        jobId: req.params.id,
        eventType: "assigned",
        description: `Claimed by ${tech.fullName}`,
        createdBy: technicianId,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error claiming job:", error);
      res.status(500).json({ error: "Failed to claim job" });
    }
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
    
    // Send email notification to technician
    notifyJobAssigned(updated!, tech.fullName).catch(err => 
      console.error(`Job assignment notification failed for job ${req.params.id}:`, err)
    );
    
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
    
    // Notify technician email that job is now in progress
    if (technicianId) {
      const tech = await storage.getTechnician(technicianId);
      notifyJobApproved(updated!, tech?.fullName).catch(err => 
        console.error(`Job in-progress notification failed for job ${req.params.id}:`, err)
      );
    }
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const { technicianId, laborHours, materialsCost, travelExpense, equipmentCost, otherExpenses, expenseNotes, totalRevenue } = req.body;

      // Use automation service to complete job with cost calculation
      const result = await completeJob(id, {
        laborHours,
        materialsCost,
        travelExpense,
        equipmentCost,
        otherExpenses,
        expenseNotes,
        totalRevenue,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Create timeline event
      await storage.createJobTimelineEvent({
        jobId: id,
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

      // Return updated job
      const job = await storage.getJob(id);
      res.json(job);
    } catch (error) {
      console.error("Complete job error:", error);
      res.status(500).json({ error: "Failed to complete job" });
    }
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
    try {
      const { jobId, status } = req.query;
      if (jobId) {
        const quotes = await storage.getQuotesByJob(jobId as string);
        res.json(quotes);
      } else if (status) {
        const quotes = await storage.getQuotesByStatus(status as string);
        res.json(quotes);
      } else {
        const quotes = await storage.getAllQuotes();
        res.json(quotes);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    const quote = await storage.getQuote(req.params.id);
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    res.json(quote);
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      // Convert ISO date strings to Date objects
      const body = { ...req.body };
      const dateFields = ['sentAt', 'viewedAt', 'acceptedAt', 'declinedAt', 'expiresAt'];
      dateFields.forEach(field => {
        if (body[field] && typeof body[field] === 'string') {
          body[field] = new Date(body[field]);
        }
      });
      
      const result = insertQuoteSchema.safeParse(body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const quote = await storage.createQuote(result.data);
      
      // Create timeline event
      await storage.createJobTimelineEvent({
        jobId: result.data.jobId,
        eventType: "quote_sent",
        description: `Quote created for $${result.data.total}`,
        createdBy: result.data.technicianId || undefined,
      });
      
      // Notify office about new quote
      notifyQuoteCreated({
        id: quote.id,
        customerName: quote.customerName,
        jobId: quote.jobId || undefined,
        total: quote.total,
      }).catch(err => 
        console.error(`Quote notification failed for quote ${quote.id}:`, err)
      );
      
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
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

  // Generate public link token for a quote
  app.post("/api/quotes/:id/generate-link", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // Generate a unique token if not already present
      const token = quote.publicToken || crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      const updatedQuote = await storage.updateQuote(req.params.id, { publicToken: token });
      
      res.json({ 
        token, 
        publicUrl: `/quote/${token}`,
        quote: updatedQuote 
      });
    } catch (error) {
      console.error("Error generating quote link:", error);
      res.status(500).json({ error: "Failed to generate quote link" });
    }
  });

  // Public quote viewing endpoint (no auth required)
  app.get("/api/public/quote/:token", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // Mark as viewed if first time viewing
      if (!quote.viewedAt) {
        await storage.updateQuote(quote.id, { viewedAt: new Date(), status: 'viewed' });
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error fetching public quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Public quote accept/decline actions
  app.post("/api/public/quote/:token/accept", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      const updatedQuote = await storage.updateQuote(quote.id, { 
        status: 'accepted', 
        acceptedAt: new Date() 
      });
      
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error accepting quote:", error);
      res.status(500).json({ error: "Failed to accept quote" });
    }
  });

  app.post("/api/public/quote/:token/decline", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      const updatedQuote = await storage.updateQuote(quote.id, { 
        status: 'declined', 
        declinedAt: new Date() 
      });
      
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error declining quote:", error);
      res.status(500).json({ error: "Failed to decline quote" });
    }
  });

  // Quote Templates
  app.get("/api/quote-templates", async (req, res) => {
    try {
      const templates = await storage.getQuoteTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching quote templates:", error);
      res.status(500).json({ error: "Failed to fetch quote templates" });
    }
  });

  app.get("/api/quote-templates/service/:serviceType", async (req, res) => {
    try {
      const templates = await storage.getQuoteTemplatesByServiceType(req.params.serviceType);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching quote templates by service:", error);
      res.status(500).json({ error: "Failed to fetch quote templates" });
    }
  });

  app.get("/api/quote-templates/:id", async (req, res) => {
    const template = await storage.getQuoteTemplate(req.params.id);
    if (!template) return res.status(404).json({ error: "Quote template not found" });
    res.json(template);
  });

  app.post("/api/quote-templates", async (req, res) => {
    try {
      const result = insertQuoteTemplateSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const template = await storage.createQuoteTemplate(result.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating quote template:", error);
      res.status(500).json({ error: "Failed to create quote template" });
    }
  });

  app.patch("/api/quote-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateQuoteTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ error: "Quote template not found" });
      res.json(template);
    } catch (error) {
      console.error("Error updating quote template:", error);
      res.status(500).json({ error: "Failed to update quote template" });
    }
  });

  app.delete("/api/quote-templates/:id", async (req, res) => {
    const success = await storage.deleteQuoteTemplate(req.params.id);
    if (!success) return res.status(404).json({ error: "Quote template not found" });
    res.json({ success: true });
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

  // Data Export
  app.get("/api/export", async (req, res) => {
    try {
      const { format } = req.query;
      
      // Gather all data
      const [leads, jobs, technicians, quotes] = await Promise.all([
        storage.getLeads(),
        storage.getJobs(),
        storage.getTechnicians(),
        storage.getAllQuotes(),
      ]);

      // Format data for export
      const exportData = {
        leads: leads.map(l => ({
          id: l.id,
          name: l.customerName,
          phone: l.customerPhone,
          email: l.customerEmail || '',
          address: l.address || '',
          city: l.city || '',
          zip: l.zipCode || '',
          source: l.source,
          status: l.status,
          service: l.serviceType || '',
          leadCost: Number(l.cost) || 0,
          createdAt: l.createdAt,
        })),
        jobs: jobs.map(j => ({
          id: j.id,
          leadId: j.leadId,
          technicianId: j.assignedTechnicianId || '',
          status: j.status,
          scheduledDate: j.scheduledDate || '',
          scheduledTime: j.scheduledTimeStart || '',
          customerName: j.customerName,
          serviceType: j.serviceType,
          address: j.address,
        })),
        technicians: technicians.map(t => ({
          id: t.id,
          name: t.fullName,
          phone: t.phone,
          email: t.email || '',
          status: t.status,
          skillLevel: t.skillLevel,
          completedJobsToday: t.completedJobsToday || 0,
        })),
        quotes: quotes.map(q => ({
          id: q.id,
          jobId: q.jobId,
          customerName: q.customerName,
          status: q.status,
          subtotal: Number(q.subtotal) || 0,
          tax: Number(q.taxAmount) || 0,
          total: Number(q.total) || 0,
          expiresAt: q.expiresAt || '',
          createdAt: q.createdAt,
        })),
      };

      if (format === 'csv') {
        // Generate CSV content
        let csv = '';
        
        // Leads section
        csv += 'LEADS\n';
        csv += 'ID,Name,Phone,Email,Address,City,Zip,Source,Status,Service,Lead Cost,Created\n';
        exportData.leads.forEach(l => {
          csv += `"${l.id}","${l.name}","${l.phone}","${l.email}","${l.address}","${l.city}","${l.zip}","${l.source}","${l.status}","${l.service}",${l.leadCost},"${l.createdAt}"\n`;
        });
        
        csv += '\nJOBS\n';
        csv += 'ID,Lead ID,Technician ID,Status,Customer,Service,Address,Scheduled Date,Scheduled Time\n';
        exportData.jobs.forEach(j => {
          csv += `"${j.id}","${j.leadId}","${j.technicianId}","${j.status}","${j.customerName}","${j.serviceType}","${j.address}","${j.scheduledDate}","${j.scheduledTime}"\n`;
        });
        
        csv += '\nTECHNICIANS\n';
        csv += 'ID,Name,Phone,Email,Status,Skill Level,Jobs Today\n';
        exportData.technicians.forEach(t => {
          csv += `"${t.id}","${t.name}","${t.phone}","${t.email}","${t.status}","${t.skillLevel}",${t.completedJobsToday}\n`;
        });
        
        csv += '\nQUOTES\n';
        csv += 'ID,Job ID,Customer Name,Status,Subtotal,Tax,Total,Expires,Created\n';
        exportData.quotes.forEach(q => {
          csv += `"${q.id}","${q.jobId}","${q.customerName}","${q.status}",${q.subtotal},${q.tax},${q.total},"${q.expiresAt}","${q.createdAt}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=crm-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } else {
        // Return JSON for PDF generation on frontend
        res.json(exportData);
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
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

  // Shift Logs (Technician Availability Time Tracking)
  app.post("/api/shift-logs", async (req, res) => {
    try {
      const result = insertShiftLogSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const log = await storage.createShiftLog(result.data);
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating shift log:", error);
      res.status(500).json({ error: "Failed to create shift log" });
    }
  });

  app.get("/api/technicians/:id/shift-logs", async (req, res) => {
    try {
      const logs = await storage.getShiftLogsByTechnician(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching shift logs:", error);
      res.status(500).json({ error: "Failed to fetch shift logs" });
    }
  });

  app.get("/api/technicians/:id/shift-logs/today", async (req, res) => {
    try {
      const logs = await storage.getTodayShiftLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching today's shift logs:", error);
      res.status(500).json({ error: "Failed to fetch today's shift logs" });
    }
  });

  // Admin: Reset Job Board
  app.post("/api/admin/reset-job-board", async (req, res) => {
    try {
      await storage.resetJobBoard();
      res.json({ success: true, message: "Job board reset successfully. All jobs cleared and technicians set to off duty." });
    } catch (error) {
      console.error("Error resetting job board:", error);
      res.status(500).json({ error: "Failed to reset job board" });
    }
  });

  // ==========================================
  // SMS Status Callback Webhooks
  // ==========================================

  // Twilio SMS status callback - tracks delivery status
  app.post("/api/webhooks/twilio/status", async (req, res) => {
    try {
      const {
        MessageSid,
        MessageStatus,
        To,
        From,
        ErrorCode,
        ErrorMessage,
      } = req.body;

      const logEntry = {
        timestamp: new Date().toISOString(),
        provider: "Twilio",
        messageSid: MessageSid,
        status: MessageStatus,
        to: To,
        from: From,
        errorCode: ErrorCode || null,
        errorMessage: ErrorMessage || null,
      };

      console.log(`[Twilio Status] ${MessageStatus} for ${To}:`, JSON.stringify(logEntry));

      // Log to webhook_logs table for tracking
      await storage.createWebhookLog({
        source: "twilio-status",
        payload: logEntry,
        status: MessageStatus === "delivered" ? "success" : 
                MessageStatus === "failed" || MessageStatus === "undelivered" ? "error" : "pending",
        errorMessage: ErrorCode ? `${ErrorCode}: ${ErrorMessage || "Unknown error"}` : null,
      });

      // Return 200 OK - Twilio expects this
      res.status(200).send("OK");
    } catch (error) {
      console.error("Twilio status webhook error:", error);
      // Still return 200 to prevent Twilio from retrying
      res.status(200).send("OK");
    }
  });

  // SignalWire SMS status callback - tracks delivery status  
  app.post("/api/webhooks/signalwire/status", async (req, res) => {
    try {
      const {
        MessageSid,
        MessageStatus,
        To,
        From,
        ErrorCode,
        ErrorMessage,
      } = req.body;

      const logEntry = {
        timestamp: new Date().toISOString(),
        provider: "SignalWire",
        messageSid: MessageSid,
        status: MessageStatus,
        to: To,
        from: From,
        errorCode: ErrorCode || null,
        errorMessage: ErrorMessage || null,
      };

      console.log(`[SignalWire Status] ${MessageStatus} for ${To}:`, JSON.stringify(logEntry));

      // Log to webhook_logs table for tracking
      await storage.createWebhookLog({
        source: "signalwire-status",
        payload: logEntry,
        status: MessageStatus === "delivered" ? "success" : 
                MessageStatus === "failed" || MessageStatus === "undelivered" ? "error" : "pending",
        errorMessage: ErrorCode ? `${ErrorCode}: ${ErrorMessage || "Unknown error"}` : null,
      });

      res.status(200).send("OK");
    } catch (error) {
      console.error("SignalWire status webhook error:", error);
      res.status(200).send("OK");
    }
  });

  // ==========================================
  // Twilio Call & SMS Forwarding Webhooks
  // ==========================================

  // Forwarding phone number for all incoming calls and texts
  const FORWARDING_PHONE_NUMBER = "+16302515628";

  // Twilio incoming voice call webhook - forwards calls to office
  app.post("/api/webhooks/twilio/voice", async (req, res) => {
    try {
      const { From, To, CallSid } = req.body;

      console.log(`[Twilio Voice] Incoming call from ${From} to ${To}, CallSid: ${CallSid}`);

      // Log the incoming call
      await storage.createWebhookLog({
        source: "twilio-voice-incoming",
        endpoint: "/api/webhooks/twilio/voice",
        method: "POST",
        payload: JSON.stringify({ from: From, to: To, callSid: CallSid, action: "forward" }),
      });

      // Return TwiML to forward the call
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while we connect you to Chicago Sewer Experts.</Say>
  <Dial callerId="${To}" timeout="30" action="/api/webhooks/twilio/voice-status">
    ${FORWARDING_PHONE_NUMBER}
  </Dial>
  <Say voice="alice">We're sorry, no one is available to take your call. Please leave a message after the beep.</Say>
  <Record maxLength="120" action="/api/webhooks/twilio/voicemail" />
</Response>`;

      res.type("text/xml").send(twiml);
    } catch (error) {
      console.error("Twilio voice webhook error:", error);
      // Return basic TwiML even on error
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're experiencing technical difficulties. Please call back later.</Say>
  <Hangup/>
</Response>`;
      res.type("text/xml").send(errorTwiml);
    }
  });

  // Twilio voice status callback - handles call completion
  app.post("/api/webhooks/twilio/voice-status", async (req, res) => {
    try {
      const { DialCallStatus, CallSid, From, To } = req.body;
      
      console.log(`[Twilio Voice Status] Call ${CallSid} status: ${DialCallStatus}`);
      
      await storage.createWebhookLog({
        source: "twilio-voice-status",
        endpoint: "/api/webhooks/twilio/voice-status",
        method: "POST",
        payload: JSON.stringify({ callSid: CallSid, status: DialCallStatus, from: From, to: To }),
      });

      // Just acknowledge - call is done
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    } catch (error) {
      console.error("Twilio voice status error:", error);
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // Twilio voicemail callback - handles voicemail recordings
  app.post("/api/webhooks/twilio/voicemail", async (req, res) => {
    try {
      const { RecordingUrl, RecordingSid, From, To, CallSid } = req.body;
      
      console.log(`[Twilio Voicemail] Recording from ${From}: ${RecordingUrl}`);
      
      await storage.createWebhookLog({
        source: "twilio-voicemail",
        endpoint: "/api/webhooks/twilio/voicemail",
        method: "POST",
        payload: JSON.stringify({ from: From, to: To, callSid: CallSid, recordingSid: RecordingSid, recordingUrl: RecordingUrl }),
      });

      // Send email notification about voicemail via Resend
      const { sendEmail } = await import("./services/email");
      await sendEmail({
        to: "CSEINTAKETEST@webslingerai.com",
        subject: `New Voicemail from ${From}`,
        html: `
          <h2>New Voicemail Received</h2>
          <p><strong>From:</strong> ${From}</p>
          <p><strong>To:</strong> ${To}</p>
          <p><strong>Recording:</strong> <a href="${RecordingUrl}.mp3">Listen to voicemail</a></p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
        text: `New voicemail from ${From}. Listen at: ${RecordingUrl}.mp3`,
      });

      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thank you for your message. We will get back to you soon.</Say></Response>`);
    } catch (error) {
      console.error("Twilio voicemail error:", error);
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // Twilio incoming SMS webhook - forwards texts to office number
  app.post("/api/webhooks/twilio/sms", async (req, res) => {
    try {
      const { From, To, Body, MessageSid } = req.body;

      console.log(`[Twilio SMS] Incoming text from ${From}: ${Body}`);

      // Log the incoming SMS
      await storage.createWebhookLog({
        source: "twilio-sms-incoming",
        endpoint: "/api/webhooks/twilio/sms",
        method: "POST",
        payload: JSON.stringify({ from: From, to: To, body: Body, messageSid: MessageSid }),
      });

      // Forward the SMS to the office number
      const { sendSMS } = await import("./services/sms");
      const forwardMessage = `[Fwd from ${From}]: ${Body}`;
      await sendSMS(FORWARDING_PHONE_NUMBER, forwardMessage);

      // Also send email notification via Resend
      const { sendEmail } = await import("./services/email");
      await sendEmail({
        to: "CSEINTAKETEST@webslingerai.com",
        subject: `New Text Message from ${From}`,
        html: `
          <h2>New Text Message Received</h2>
          <p><strong>From:</strong> ${From}</p>
          <p><strong>To:</strong> ${To}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="background: #f5f5f5; padding: 10px; border-left: 3px solid #b22222;">${Body}</blockquote>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
        text: `New text from ${From}: ${Body}`,
      });

      // Return TwiML acknowledgment
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your message! A Chicago Sewer Experts team member will respond shortly.</Message>
</Response>`;

      res.type("text/xml").send(twiml);
    } catch (error) {
      console.error("Twilio SMS webhook error:", error);
      // Still return valid TwiML
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // ==========================================
  // Lead Provider Webhooks
  // ==========================================

  // eLocal webhook - receives leads from eLocal
  app.post("/api/webhooks/elocal", async (req, res) => {
    try {
      const { first_name, last_name, phone, email, zip_code, need_id, description } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const customerName = [first_name, last_name].filter(Boolean).join(" ") || "Unknown";
      
      const leadData = {
        source: "eLocal",
        customerName,
        customerPhone: phone,
        customerEmail: email || undefined,
        zipCode: zip_code || undefined,
        serviceType: need_id || undefined,
        description: description || undefined,
        status: "new",
        priority: "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] eLocal lead created: ${lead.id}`);
      
      // Trigger auto-contact
      autoContactLead(lead.id).catch(err => 
        console.error(`Auto-contact failed for lead ${lead.id}:`, err)
      );
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("eLocal webhook error:", error);
      res.status(500).json({ error: "Failed to process eLocal lead" });
    }
  });

  // Angi/HomeAdvisor webhook - receives leads from Angi
  app.post("/api/webhooks/angi", async (req, res) => {
    try {
      // API key authentication (optional - set ANGI_WEBHOOK_KEY to enable)
      const expectedKey = process.env.ANGI_WEBHOOK_KEY;
      if (expectedKey) {
        const apiKey = req.headers["x-api-key"];
        if (apiKey !== expectedKey) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
      
      const { name, phone, email, address, zip_code, category, description } = req.body;
      
      // Phone is required for lead creation
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const leadData = {
        source: "Angi",
        customerName: name || "Unknown",
        customerPhone: phone,
        customerEmail: email || undefined,
        address: address || undefined,
        zipCode: zip_code || undefined,
        serviceType: category || undefined,
        description: description || undefined,
        status: "new",
        priority: "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Angi lead created: ${lead.id}`);
      
      // Trigger auto-contact
      autoContactLead(lead.id).catch(err => 
        console.error(`Auto-contact failed for lead ${lead.id}:`, err)
      );
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("Angi webhook error:", error);
      res.status(500).json({ error: "Failed to process Angi lead" });
    }
  });

  // Thumbtack webhook - receives leads from Thumbtack
  app.post("/api/webhooks/thumbtack", async (req, res) => {
    try {
      // HTTP Basic Auth (optional - set THUMBTACK_WEBHOOK_USER and THUMBTACK_WEBHOOK_PASS to enable)
      const expectedUser = process.env.THUMBTACK_WEBHOOK_USER;
      const expectedPass = process.env.THUMBTACK_WEBHOOK_PASS;
      if (expectedUser && expectedPass) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Basic ")) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        const base64Credentials = authHeader.slice(6);
        const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
        const [user, pass] = credentials.split(":");
        if (user !== expectedUser || pass !== expectedPass) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
      
      const { leadID, customer, request } = req.body;
      
      const customerName = customer?.name || "Unknown";
      const phone = customer?.phone;
      const email = customer?.email;
      
      // Phone is required for lead creation
      if (!phone) {
        return res.status(400).json({ error: "Customer phone is required" });
      }
      
      const category = request?.category || undefined;
      const description = request?.description || undefined;
      const location = request?.location || {};

      const leadData = {
        source: "Thumbtack",
        customerName,
        customerPhone: phone,
        customerEmail: email || undefined,
        address: location.address || undefined,
        city: location.city || undefined,
        zipCode: location.zipCode || undefined,
        serviceType: category,
        description: description,
        status: "new",
        priority: "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Thumbtack lead created: ${lead.id} (Thumbtack ID: ${leadID})`);
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id, thumbtackLeadId: leadID });
    } catch (error) {
      console.error("Thumbtack webhook error:", error);
      res.status(500).json({ error: "Failed to process Thumbtack lead" });
    }
  });

  // Networx webhook - receives leads from Networx
  app.post("/api/webhooks/networx", async (req, res) => {
    try {
      const { customer_name, phone, email, zip_code, service_type, description } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const leadData = {
        source: "Networx",
        customerName: customer_name || "Unknown",
        customerPhone: phone,
        customerEmail: email || undefined,
        zipCode: zip_code || undefined,
        serviceType: service_type || undefined,
        description: description || undefined,
        status: "new",
        priority: "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Networx lead created: ${lead.id}`);
      
      // Trigger auto-contact
      autoContactLead(lead.id).catch(err => 
        console.error(`Auto-contact failed for lead ${lead.id}:`, err)
      );
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("Networx webhook error:", error);
      res.status(500).json({ error: "Failed to process Networx lead" });
    }
  });

  // Zapier/Generic webhook - universal lead intake for Zapier, Google Forms, etc.
  app.post("/api/webhooks/zapier/lead", async (req, res) => {
    const startTime = Date.now();
    try {
      const { 
        customer_name, 
        name,
        phone, 
        customer_phone,
        email,
        customer_email,
        address,
        city,
        zip_code,
        zipCode,
        service_type,
        serviceType,
        description,
        notes,
        source,
        priority,
        send_email
      } = req.body;
      
      // Support multiple field naming conventions
      const customerPhone = phone || customer_phone;
      const customerName = customer_name || name || "Unknown";
      const customerEmail = email || customer_email;
      const customerZip = zip_code || zipCode;
      const customerService = service_type || serviceType;
      const customerDescription = description || notes;
      
      // Phone is optional for email leads
      const leadData = {
        source: source || "Zapier",
        customerName,
        customerPhone: customerPhone || "No phone provided",
        customerEmail: customerEmail || undefined,
        address: address || undefined,
        city: city || undefined,
        zipCode: customerZip || undefined,
        serviceType: customerService || undefined,
        description: customerDescription || undefined,
        status: "new" as const,
        priority: priority || "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        await storage.createWebhookLog({
          source: "zapier",
          endpoint: "/api/webhooks/zapier/lead",
          method: "POST",
          headers: JSON.stringify(req.headers),
          payload: JSON.stringify(req.body),
          responseStatus: 400,
          responseBody: JSON.stringify({ error: "Invalid lead data" }),
          processingTimeMs: Date.now() - startTime,
          error: JSON.stringify(validation.error.flatten()),
        });
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Zapier lead created: ${lead.id}`);
      
      // Auto-send acknowledgment email if email provided and send_email not explicitly false
      let emailSent = false;
      let emailError: string | null = null;
      
      if (customerEmail && send_email !== false) {
        try {
          const emailContent = generateLeadAcknowledgmentEmail(
            customerName,
            customerService || "plumbing service"
          );
          
          const emailResult = await sendEmail({
            to: customerEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });
          
          emailSent = emailResult.success;
          emailError = emailResult.error || null;
          
          // Log the contact attempt
          await storage.createContactAttempt({
            leadId: lead.id,
            type: "email",
            direction: "outbound",
            status: emailResult.success ? "sent" : "failed",
            subject: emailContent.subject,
            content: emailContent.html,
            templateId: "lead_acknowledgment",
            externalId: emailResult.messageId,
            recipientEmail: customerEmail,
            sentBy: "automation",
            sentAt: new Date(),
            failedReason: emailError,
          });
          
          if (emailResult.success) {
            // Update lead to contacted status
            await storage.updateLead(lead.id, {
              status: "contacted",
              contactedAt: new Date(),
            });
          }
        } catch (err) {
          console.error("Auto-email error:", err);
          emailError = err instanceof Error ? err.message : "Unknown error";
        }
      }
      
      // Notify team members about new lead
      let teamNotification = { emailsSent: 0, smsSent: 0, errors: [] as string[] };
      try {
        teamNotification = await notifyLeadRecipients(lead);
      } catch (err) {
        console.error("Team notification error:", err);
      }
      
      // Log successful webhook
      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/lead",
        method: "POST",
        headers: JSON.stringify(req.headers),
        payload: JSON.stringify(req.body),
        responseStatus: 200,
        responseBody: JSON.stringify({ success: true, leadId: lead.id }),
        processingTimeMs: Date.now() - startTime,
      });
      
      res.status(200).json({ 
        success: true, 
        leadId: lead.id,
        emailSent,
        emailError,
        teamNotifications: {
          emailsSent: teamNotification.emailsSent,
          smsSent: teamNotification.smsSent,
        },
      });
    } catch (error) {
      console.error("Zapier webhook error:", error);
      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/lead",
        method: "POST",
        headers: JSON.stringify(req.headers),
        payload: JSON.stringify(req.body),
        responseStatus: 500,
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({ error: "Failed to process lead" });
    }
  });
  
  // Manual email send endpoint
  app.post("/api/leads/:id/send-email", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      
      if (!lead.customerEmail) {
        return res.status(400).json({ error: "Lead has no email address" });
      }
      
      const { template = "acknowledgment" } = req.body;
      
      let emailContent;
      if (template === "acknowledgment") {
        emailContent = generateLeadAcknowledgmentEmail(
          lead.customerName,
          lead.serviceType || "plumbing service"
        );
      } else {
        return res.status(400).json({ error: "Unknown email template" });
      }
      
      const emailResult = await sendEmail({
        to: lead.customerEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
      
      // Log the contact attempt
      await storage.createContactAttempt({
        leadId: lead.id,
        type: "email",
        direction: "outbound",
        status: emailResult.success ? "sent" : "failed",
        subject: emailContent.subject,
        content: emailContent.html,
        templateId: template,
        externalId: emailResult.messageId,
        recipientEmail: lead.customerEmail,
        sentBy: req.body.userId || "manual",
        sentAt: new Date(),
        failedReason: emailResult.error,
      });
      
      if (emailResult.success && lead.status === "new") {
        await storage.updateLead(lead.id, {
          status: "contacted",
          contactedAt: new Date(),
        });
      }
      
      res.json({ 
        success: emailResult.success, 
        messageId: emailResult.messageId,
        error: emailResult.error,
      });
    } catch (error) {
      console.error("Email send error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });
  
  // Get contact attempts for a lead
  app.get("/api/leads/:id/contacts", async (req, res) => {
    try {
      const contacts = await storage.getContactAttemptsByLead(req.params.id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contact attempts:", error);
      res.status(500).json({ error: "Failed to fetch contact attempts" });
    }
  });
  
  // Get webhook logs
  app.get("/api/webhook-logs", async (req, res) => {
    try {
      const { limit = "50", source } = req.query;
      const logs = await storage.getWebhookLogs(parseInt(limit as string), source as string);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      res.status(500).json({ error: "Failed to fetch webhook logs" });
    }
  });

  // Inquirly webhook - receives leads from Inquirly conversational AI
  app.post("/api/webhooks/inquirly", async (req, res) => {
    try {
      const { 
        contact_name, 
        contact_phone, 
        contact_email, 
        contact_address,
        contact_zip,
        conversation_summary,
        service_requested,
        urgency
      } = req.body;
      
      // Phone is required for lead creation
      if (!contact_phone) {
        return res.status(400).json({ error: "Contact phone is required" });
      }

      // Map Inquirly urgency to our priority
      let priority = "normal";
      if (urgency === "high" || urgency === "emergency") {
        priority = "urgent";
      } else if (urgency === "medium") {
        priority = "high";
      }

      const leadData = {
        source: "Inquirly",
        customerName: contact_name || "Unknown",
        customerPhone: contact_phone,
        customerEmail: contact_email || undefined,
        address: contact_address || undefined,
        zipCode: contact_zip || undefined,
        serviceType: service_requested || undefined,
        description: conversation_summary || undefined,
        status: "new",
        priority,
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Inquirly lead created: ${lead.id}`);
      
      // Trigger auto-contact
      autoContactLead(lead.id).catch(err => 
        console.error(`Auto-contact failed for lead ${lead.id}:`, err)
      );
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("Inquirly webhook error:", error);
      res.status(500).json({ error: "Failed to process Inquirly lead" });
    }
  });

  // ==================== AUTOMATION API ENDPOINTS ====================

  // Confirm estimate - creates a job from a lead when customer confirms they want an estimate
  app.post("/api/leads/:id/confirm-estimate", async (req, res) => {
    try {
      const { id } = req.params;
      const { scheduledDate, scheduledTimeStart, scheduledTimeEnd, autoAssign } = req.body;

      const result = await createJobFromLead(
        id,
        scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTimeStart,
        scheduledTimeEnd
      );

      if (!result.success || !result.job) {
        return res.status(400).json({ error: result.error });
      }

      // Auto-assign technician if requested
      let assignedTech = null;
      if (autoAssign) {
        const assignResult = await autoAssignTechnician(result.job.id);
        if (assignResult.success) {
          assignedTech = assignResult.technician;
        }
      }

      res.json({ 
        success: true, 
        job: result.job, 
        assignedTechnician: assignedTech 
      });
    } catch (error) {
      console.error("Confirm estimate error:", error);
      res.status(500).json({ error: "Failed to confirm estimate" });
    }
  });

  // Cancel a job with full tracking
  app.post("/api/jobs/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const { cancelledBy, reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: "Cancellation reason is required" });
      }

      const result = await cancelJob(id, cancelledBy || "system", reason);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Cancel job error:", error);
      res.status(500).json({ error: "Failed to cancel job" });
    }
  });

  // Update job costs (labor, materials, expenses)
  app.patch("/api/jobs/:id/costs", async (req, res) => {
    try {
      const { id } = req.params;
      const { laborHours, materialsCost, travelExpense, equipmentCost, otherExpenses, expenseNotes } = req.body;

      const result = await updateJobCosts(id, {
        laborHours,
        materialsCost,
        travelExpense,
        equipmentCost,
        otherExpenses,
        expenseNotes,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Return updated job
      const job = await storage.getJob(id);
      res.json(job);
    } catch (error) {
      console.error("Update job costs error:", error);
      res.status(500).json({ error: "Failed to update job costs" });
    }
  });

  // Send appointment reminder (email + SMS)
  app.post("/api/jobs/:id/send-reminder", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await sendAppointmentReminder(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, emailSent: result.emailSent, smsSent: result.smsSent });
    } catch (error) {
      console.error("Send reminder error:", error);
      res.status(500).json({ error: "Failed to send reminder" });
    }
  });

  // Send SMS notification that technician is en route
  app.post("/api/jobs/:id/send-en-route-sms", async (req, res) => {
    try {
      const { id } = req.params;
      const { estimatedArrival } = req.body;

      const result = await sendTechnicianEnRouteSMS(id, estimatedArrival || "15-20 minutes");
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Send en route SMS error:", error);
      res.status(500).json({ error: "Failed to send en route SMS" });
    }
  });

  // Send SMS notification that job is complete
  app.post("/api/jobs/:id/send-complete-sms", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await sendJobCompleteSMS(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Send complete SMS error:", error);
      res.status(500).json({ error: "Failed to send job complete SMS" });
    }
  });

  // Send custom SMS to a phone number
  app.post("/api/sms/send", async (req, res) => {
    try {
      const { to, message, jobId } = req.body;

      if (!to || !message) {
        return res.status(400).json({ error: "Phone number and message required" });
      }

      const result = await smsService.sendSMS(to, message);
      
      // Log contact attempt if job is specified
      if (jobId) {
        await storage.createContactAttempt({
          jobId,
          type: "sms",
          direction: "outbound",
          status: result.success ? "sent" : "failed",
          content: message,
          recipientPhone: to,
          sentAt: result.success ? new Date() : null,
          externalId: result.messageId || null,
          failedReason: result.error || null,
        });
      }

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      console.error("Send SMS error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // Check SMS service status
  app.get("/api/sms/status", async (req, res) => {
    const debug = smsService.getDebugInfo();
    res.json({ 
      configured: smsService.isConfigured(),
      provider: debug.provider,
      fromNumberFormat: debug.fromNumberFormat,
      fromNumberLength: debug.fromNumberLength
    });
  });

  // Auto-assign technician to a job
  app.post("/api/jobs/:id/auto-assign", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await autoAssignTechnician(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Return updated job with technician
      const job = await storage.getJob(id);
      res.json({ job, technician: result.technician });
    } catch (error) {
      console.error("Auto-assign error:", error);
      res.status(500).json({ error: "Failed to auto-assign technician" });
    }
  });

  // Get job ROI analysis
  app.get("/api/jobs/:id/roi", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getJob(id);

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const roi = calculateJobROI(job);
      res.json({ job, roi });
    } catch (error) {
      console.error("Get job ROI error:", error);
      res.status(500).json({ error: "Failed to get job ROI" });
    }
  });

  // Get aggregated ROI analytics for all jobs
  app.get("/api/analytics/roi", async (req, res) => {
    try {
      const { startDate, endDate, includeCompleted = "true", includeCancelled = "true" } = req.query;
      
      const allJobs = await storage.getJobs();
      
      // Filter jobs by date and status
      let filteredJobs = allJobs.filter(job => {
        const jobDate = new Date(job.createdAt);
        if (startDate && jobDate < new Date(startDate as string)) return false;
        if (endDate && jobDate > new Date(endDate as string)) return false;
        if (includeCompleted !== "true" && job.status === "completed") return false;
        if (includeCancelled !== "true" && job.status === "cancelled") return false;
        return true;
      });

      // Calculate aggregate ROI
      const summary = {
        totalJobs: filteredJobs.length,
        completedJobs: filteredJobs.filter(j => j.status === "completed").length,
        cancelledJobs: filteredJobs.filter(j => j.status === "cancelled").length,
        totalRevenue: 0,
        totalCost: 0,
        totalLaborCost: 0,
        totalMaterialsCost: 0,
        totalTravelExpense: 0,
        totalEquipmentCost: 0,
        totalOtherExpenses: 0,
        totalProfit: 0,
        averageProfitMargin: 0,
      };

      filteredJobs.forEach(job => {
        const roi = calculateJobROI(job);
        summary.totalRevenue += roi.totalRevenue;
        summary.totalCost += roi.totalCost;
        summary.totalLaborCost += roi.laborCost;
        summary.totalMaterialsCost += roi.materialsCost;
        summary.totalTravelExpense += roi.travelExpense;
        summary.totalEquipmentCost += roi.equipmentCost;
        summary.totalOtherExpenses += roi.otherExpenses;
        summary.totalProfit += roi.profit;
      });

      summary.averageProfitMargin = summary.totalRevenue > 0 
        ? (summary.totalProfit / summary.totalRevenue) * 100 
        : 0;

      res.json(summary);
    } catch (error) {
      console.error("Get ROI analytics error:", error);
      res.status(500).json({ error: "Failed to get ROI analytics" });
    }
  });

  // Manual trigger for auto-contact on a lead
  app.post("/api/leads/:id/auto-contact", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await autoContactLead(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Auto-contact error:", error);
      res.status(500).json({ error: "Failed to auto-contact lead" });
    }
  });

  // ========================================
  // JOB ATTACHMENTS (Photos/Videos)
  // ========================================
  
  app.get("/api/jobs/:id/attachments", async (req, res) => {
    try {
      const attachments = await storage.getJobAttachments(req.params.id);
      res.json(attachments);
    } catch (error) {
      console.error("Get job attachments error:", error);
      res.status(500).json({ error: "Failed to get attachments" });
    }
  });

  app.post("/api/jobs/:id/attachments", async (req, res) => {
    try {
      const { fileData, ...rest } = req.body;
      
      const result = insertJobAttachmentSchema.safeParse({
        ...rest,
        jobId: req.params.id,
        url: fileData || rest.url,
      });
      if (!result.success) return res.status(400).json({ error: result.error });
      
      const attachment = await storage.createJobAttachment(result.data);
      
      // Create timeline event
      await storage.createJobTimelineEvent({
        jobId: req.params.id,
        eventType: "attachment_added",
        description: `${result.data.type} added: ${result.data.filename}`,
        createdBy: result.data.technicianId || undefined,
      });
      
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Create job attachment error:", error);
      res.status(500).json({ error: "Failed to create attachment" });
    }
  });

  app.delete("/api/attachments/:id", async (req, res) => {
    try {
      const success = await storage.deleteJobAttachment(req.params.id);
      if (!success) return res.status(404).json({ error: "Attachment not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete attachment error:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // ========================================
  // JOB CHECKLISTS
  // ========================================
  
  app.get("/api/jobs/:id/checklists", async (req, res) => {
    try {
      const checklists = await storage.getJobChecklists(req.params.id);
      res.json(checklists);
    } catch (error) {
      console.error("Get job checklists error:", error);
      res.status(500).json({ error: "Failed to get checklists" });
    }
  });

  app.post("/api/jobs/:id/checklists", async (req, res) => {
    try {
      const result = insertJobChecklistSchema.safeParse({
        ...req.body,
        jobId: req.params.id,
      });
      if (!result.success) return res.status(400).json({ error: result.error });
      
      const checklist = await storage.createJobChecklist(result.data);
      res.status(201).json(checklist);
    } catch (error) {
      console.error("Create job checklist error:", error);
      res.status(500).json({ error: "Failed to create checklist" });
    }
  });

  app.get("/api/checklists/:id", async (req, res) => {
    try {
      const checklist = await storage.getJobChecklist(req.params.id);
      if (!checklist) return res.status(404).json({ error: "Checklist not found" });
      res.json(checklist);
    } catch (error) {
      console.error("Get checklist error:", error);
      res.status(500).json({ error: "Failed to get checklist" });
    }
  });

  app.patch("/api/checklists/:id", async (req, res) => {
    try {
      const checklist = await storage.updateJobChecklist(req.params.id, req.body);
      if (!checklist) return res.status(404).json({ error: "Checklist not found" });
      res.json(checklist);
    } catch (error) {
      console.error("Update checklist error:", error);
      res.status(500).json({ error: "Failed to update checklist" });
    }
  });

  // ========================================
  // CHECKLIST TEMPLATES
  // ========================================
  
  app.get("/api/checklist-templates", async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get checklist templates error:", error);
      res.status(500).json({ error: "Failed to get checklist templates" });
    }
  });

  app.get("/api/checklist-templates/service/:serviceType", async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplatesByServiceType(req.params.serviceType);
      res.json(templates);
    } catch (error) {
      console.error("Get checklist templates by service error:", error);
      res.status(500).json({ error: "Failed to get checklist templates" });
    }
  });

  app.post("/api/checklist-templates", async (req, res) => {
    try {
      const result = insertChecklistTemplateSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      
      const template = await storage.createChecklistTemplate(result.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Create checklist template error:", error);
      res.status(500).json({ error: "Failed to create checklist template" });
    }
  });

  app.patch("/api/checklist-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateChecklistTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ error: "Checklist template not found" });
      res.json(template);
    } catch (error) {
      console.error("Update checklist template error:", error);
      res.status(500).json({ error: "Failed to update checklist template" });
    }
  });

  app.delete("/api/checklist-templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteChecklistTemplate(req.params.id);
      if (!success) return res.status(404).json({ error: "Checklist template not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete checklist template error:", error);
      res.status(500).json({ error: "Failed to delete checklist template" });
    }
  });

  // ========================================
  // PRICEBOOK MANAGEMENT
  // ========================================

  // Pricebook Items
  app.get("/api/pricebook/items", async (req, res) => {
    try {
      const items = await storage.getPricebookItems();
      res.json(items);
    } catch (error) {
      console.error("Get pricebook items error:", error);
      res.status(500).json({ error: "Failed to get pricebook items" });
    }
  });

  app.get("/api/pricebook/items/:id", async (req, res) => {
    try {
      const item = await storage.getPricebookItem(req.params.id);
      if (!item) return res.status(404).json({ error: "Pricebook item not found" });
      res.json(item);
    } catch (error) {
      console.error("Get pricebook item error:", error);
      res.status(500).json({ error: "Failed to get pricebook item" });
    }
  });

  app.get("/api/pricebook/items/category/:category", async (req, res) => {
    try {
      const items = await storage.getPricebookItemsByCategory(req.params.category);
      res.json(items);
    } catch (error) {
      console.error("Get pricebook items by category error:", error);
      res.status(500).json({ error: "Failed to get pricebook items" });
    }
  });

  app.post("/api/pricebook/items", async (req, res) => {
    try {
      const result = insertPricebookItemSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });

      const item = await storage.createPricebookItem(result.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Create pricebook item error:", error);
      res.status(500).json({ error: "Failed to create pricebook item" });
    }
  });

  app.patch("/api/pricebook/items/:id", async (req, res) => {
    try {
      const item = await storage.updatePricebookItem(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Pricebook item not found" });
      res.json(item);
    } catch (error) {
      console.error("Update pricebook item error:", error);
      res.status(500).json({ error: "Failed to update pricebook item" });
    }
  });

  app.delete("/api/pricebook/items/:id", async (req, res) => {
    try {
      const success = await storage.deletePricebookItem(req.params.id);
      if (!success) return res.status(404).json({ error: "Pricebook item not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete pricebook item error:", error);
      res.status(500).json({ error: "Failed to delete pricebook item" });
    }
  });

  // Pricebook Categories
  app.get("/api/pricebook/categories", async (req, res) => {
    try {
      const categories = await storage.getPricebookCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get pricebook categories error:", error);
      res.status(500).json({ error: "Failed to get pricebook categories" });
    }
  });

  app.post("/api/pricebook/categories", async (req, res) => {
    try {
      const result = insertPricebookCategorySchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });

      const category = await storage.createPricebookCategory(result.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Create pricebook category error:", error);
      res.status(500).json({ error: "Failed to create pricebook category" });
    }
  });

  app.patch("/api/pricebook/categories/:id", async (req, res) => {
    try {
      const category = await storage.updatePricebookCategory(req.params.id, req.body);
      if (!category) return res.status(404).json({ error: "Pricebook category not found" });
      res.json(category);
    } catch (error) {
      console.error("Update pricebook category error:", error);
      res.status(500).json({ error: "Failed to update pricebook category" });
    }
  });

  app.delete("/api/pricebook/categories/:id", async (req, res) => {
    try {
      const success = await storage.deletePricebookCategory(req.params.id);
      if (!success) return res.status(404).json({ error: "Pricebook category not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete pricebook category error:", error);
      res.status(500).json({ error: "Failed to delete pricebook category" });
    }
  });

  // ========================================
  // MARKETING ROI TRACKING
  // ========================================

  // Marketing Campaigns
  app.get("/api/marketing/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getMarketingCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Get marketing campaigns error:", error);
      res.status(500).json({ error: "Failed to get marketing campaigns" });
    }
  });

  app.get("/api/marketing/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getMarketingCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Marketing campaign not found" });
      res.json(campaign);
    } catch (error) {
      console.error("Get marketing campaign error:", error);
      res.status(500).json({ error: "Failed to get marketing campaign" });
    }
  });

  app.post("/api/marketing/campaigns", async (req, res) => {
    try {
      const result = insertMarketingCampaignSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });

      const campaign = await storage.createMarketingCampaign(result.data);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Create marketing campaign error:", error);
      res.status(500).json({ error: "Failed to create marketing campaign" });
    }
  });

  app.patch("/api/marketing/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.updateMarketingCampaign(req.params.id, req.body);
      if (!campaign) return res.status(404).json({ error: "Marketing campaign not found" });
      res.json(campaign);
    } catch (error) {
      console.error("Update marketing campaign error:", error);
      res.status(500).json({ error: "Failed to update marketing campaign" });
    }
  });

  app.delete("/api/marketing/campaigns/:id", async (req, res) => {
    try {
      const success = await storage.deleteMarketingCampaign(req.params.id);
      if (!success) return res.status(404).json({ error: "Marketing campaign not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete marketing campaign error:", error);
      res.status(500).json({ error: "Failed to delete marketing campaign" });
    }
  });

  // Marketing Spend
  app.get("/api/marketing/spend", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const spend = await storage.getMarketingSpend(campaignId);
      res.json(spend);
    } catch (error) {
      console.error("Get marketing spend error:", error);
      res.status(500).json({ error: "Failed to get marketing spend" });
    }
  });

  app.get("/api/marketing/spend/period/:period", async (req, res) => {
    try {
      const spend = await storage.getMarketingSpendByPeriod(req.params.period);
      res.json(spend);
    } catch (error) {
      console.error("Get marketing spend by period error:", error);
      res.status(500).json({ error: "Failed to get marketing spend" });
    }
  });

  app.post("/api/marketing/spend", async (req, res) => {
    try {
      const result = insertMarketingSpendSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });

      const spend = await storage.createMarketingSpend(result.data);
      res.status(201).json(spend);
    } catch (error) {
      console.error("Create marketing spend error:", error);
      res.status(500).json({ error: "Failed to create marketing spend" });
    }
  });

  app.patch("/api/marketing/spend/:id", async (req, res) => {
    try {
      const spend = await storage.updateMarketingSpend(req.params.id, req.body);
      if (!spend) return res.status(404).json({ error: "Marketing spend record not found" });
      res.json(spend);
    } catch (error) {
      console.error("Update marketing spend error:", error);
      res.status(500).json({ error: "Failed to update marketing spend" });
    }
  });

  // Marketing ROI Analytics
  app.get("/api/marketing/roi", async (req, res) => {
    try {
      const roi = await storage.getMarketingROI();
      res.json(roi);
    } catch (error) {
      console.error("Get marketing ROI error:", error);
      res.status(500).json({ error: "Failed to get marketing ROI" });
    }
  });

  // ========================================
  // GPS TRACKING / TECHNICIAN LOCATIONS
  // ========================================
  
  // Update technician location (called from mobile app)
  app.post("/api/technicians/:id/location", async (req, res) => {
    try {
      const result = insertTechnicianLocationSchema.safeParse({
        ...req.body,
        technicianId: req.params.id,
      });
      if (!result.success) return res.status(400).json({ error: result.error });
      
      const location = await storage.createTechnicianLocation(result.data);
      res.status(201).json(location);
    } catch (error) {
      console.error("Update technician location error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // Get technician location history
  app.get("/api/technicians/:id/locations", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const locations = await storage.getTechnicianLocations(req.params.id, limit);
      res.json(locations);
    } catch (error) {
      console.error("Get technician locations error:", error);
      res.status(500).json({ error: "Failed to get locations" });
    }
  });

  // Get latest location for a technician
  app.get("/api/technicians/:id/location/latest", async (req, res) => {
    try {
      const location = await storage.getLatestTechnicianLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "No location found" });
      res.json(location);
    } catch (error) {
      console.error("Get latest technician location error:", error);
      res.status(500).json({ error: "Failed to get location" });
    }
  });

  // Get all technicians' latest locations (for dispatch map)
  app.get("/api/technicians/locations/all", async (req, res) => {
    try {
      const locations = await storage.getAllTechniciansLatestLocations();
      
      // Enrich with technician details
      const technicians = await storage.getTechnicians();
      const enrichedLocations = locations.map(loc => {
        const tech = technicians.find(t => t.id === loc.technicianId);
        return {
          ...loc,
          technicianName: tech?.fullName || "Unknown",
          technicianStatus: tech?.status || "unknown",
          technicianPhone: tech?.phone || null,
        };
      });
      
      res.json(enrichedLocations);
    } catch (error) {
      console.error("Get all technician locations error:", error);
      res.status(500).json({ error: "Failed to get locations" });
    }
  });

  // ========================================
  // INCOMING EMAIL FORWARDING (via Zapier)
  // ========================================
  
  // Webhook endpoint to receive emails from Zapier and send SMS to team
  // Zapier setup: Email by Zapier (trigger) -> Webhooks POST (action)
  app.post("/api/webhooks/incoming-email-to-sms", async (req, res) => {
    try {
      const { 
        from, 
        subject, 
        body_plain,
        recipients // Phone numbers to text (comma-separated or array)
      } = req.body;

      console.log(`[Incoming Email -> SMS] From: ${from}, Subject: ${subject}`);

      // Get team member phone numbers
      let phoneNumbers: string[] = [];
      
      if (recipients) {
        phoneNumbers = Array.isArray(recipients) 
          ? recipients 
          : recipients.split(',').map((p: string) => p.trim());
      } else {
        // Default: get technician phone numbers
        const technicians = await storage.getTechnicians();
        phoneNumbers = technicians
          .filter(t => t.phone)
          .slice(0, 3) // Limit to 3 team members for SMS
          .map(t => t.phone!);
      }

      if (phoneNumbers.length === 0) {
        return res.status(400).json({ error: "No phone numbers configured for SMS alerts" });
      }

      // Truncate message for SMS (160 char limit)
      const truncatedBody = body_plain && body_plain.length > 100 
        ? body_plain.substring(0, 97) + "..." 
        : body_plain || "(No message)";
      
      const smsMessage = `New email from ${from || "Unknown"}:\n${subject || "(No subject)"}\n\n${truncatedBody}`;

      // Send SMS to each team member
      const smsPromises = phoneNumbers.map(phone => 
        smsService.sendSMS(phone, smsMessage)
      );

      const results = await Promise.allSettled(smsPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
      
      console.log(`[Incoming Email -> SMS] Sent to ${successCount}/${phoneNumbers.length} team members`);

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/incoming-email-to-sms",
        method: "POST",
        payload: JSON.stringify({ from, subject, recipientCount: phoneNumbers.length }),
        responseStatus: 200,
      });

      res.json({ 
        success: true, 
        message: `SMS sent to ${successCount} team members`,
        sentTo: phoneNumbers 
      });
    } catch (error) {
      console.error("Incoming email to SMS webhook error:", error);
      res.status(500).json({ error: "Failed to send SMS notifications" });
    }
  });

  // Webhook endpoint to receive emails from Zapier and forward to team via email
  // Zapier setup: Email by Zapier (trigger) -> Webhooks POST (action)
  app.post("/api/webhooks/incoming-email", async (req, res) => {
    try {
      const { 
        from, 
        subject, 
        body, 
        body_plain,
        to,
        recipients // Team member emails to forward to (comma-separated or array)
      } = req.body;

      console.log(`[Incoming Email] From: ${from}, Subject: ${subject}`);

      // Get team member emails - either from request or use defaults
      let teamEmails: string[] = [];
      
      if (recipients) {
        // If recipients provided in webhook
        teamEmails = Array.isArray(recipients) 
          ? recipients 
          : recipients.split(',').map((e: string) => e.trim());
      } else {
        // Default: get all admin/dispatcher users' emails
        const users = await storage.getUsers();
        const adminsAndDispatchers = users.filter(u => u.role === 'admin' || u.role === 'dispatcher');
        // For now, we'll use technician emails as fallback since users don't have emails
        const technicians = await storage.getTechnicians();
        teamEmails = technicians
          .filter(t => t.email)
          .slice(0, 5) // Limit to 5 team members
          .map(t => t.email!);
      }

      if (teamEmails.length === 0) {
        console.log("[Incoming Email] No team members to forward to");
        return res.status(400).json({ error: "No team members configured for email forwarding" });
      }

      // Forward the email to each team member
      const emailContent = body_plain || body || "(No message content)";
      const forwardSubject = `[Customer Email] ${subject || "(No subject)"}`;
      
      const emailPromises = teamEmails.map(email => 
        sendEmail({
          to: email,
          subject: forwardSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <div style="background: #1a1a2e; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">New Customer Email</h2>
              </div>
              <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
                <p><strong>From:</strong> ${from || "Unknown"}</p>
                <p><strong>To:</strong> ${to || "Your business email"}</p>
                <p><strong>Subject:</strong> ${subject || "(No subject)"}</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                <div style="background: white; padding: 15px; border-radius: 4px; white-space: pre-wrap;">
${emailContent}
                </div>
              </div>
              <div style="background: #1a1a2e; color: #888; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                Forwarded by Chicago Sewer Experts CRM
              </div>
            </div>
          `,
        })
      );

      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`[Incoming Email] Forwarded to ${successCount}/${teamEmails.length} team members`);

      // Log the webhook
      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/incoming-email",
        method: "POST",
        payload: JSON.stringify({ from, subject, to, recipientCount: teamEmails.length }),
        responseStatus: 200,
      });

      res.json({ 
        success: true, 
        message: `Email forwarded to ${successCount} team members`,
        forwardedTo: teamEmails 
      });
    } catch (error) {
      console.error("Incoming email webhook error:", error);
      
      try {
        await storage.createWebhookLog({
          source: "zapier",
          endpoint: "/api/webhooks/incoming-email",
          method: "POST",
          payload: JSON.stringify(req.body),
          responseStatus: 500,
          error: String(error),
        });
      } catch (logError) {
        console.error("Failed to log webhook error:", logError);
      }

      res.status(500).json({ error: "Failed to process incoming email" });
    }
  });

  // ========================================
  // ZAPIER SMS AUTOMATION ENDPOINTS
  // ========================================
  
  const OFFICE_FORWARDING_NUMBER = "+16302515628";
  const OFFICE_EMAIL = "CSEINTAKETEST@webslingerai.com";
  
  // Forward SMS to office number (630) 251-5628
  // Zapier setup: Twilio (New SMS) -> Webhooks POST to this endpoint
  app.post("/api/webhooks/zapier/forward-sms", async (req, res) => {
    try {
      const { 
        from_number,
        from,
        message,
        body,
        to_number,
        to,
        message_sid,
        timestamp
      } = req.body;

      const senderNumber = from_number || from || "Unknown";
      const messageBody = message || body || "(No message)";
      const originalTo = to_number || to || "Unknown";

      console.log(`[Zapier SMS Forward] From: ${senderNumber}, Message: ${messageBody.substring(0, 50)}...`);

      // Format the forwarding message
      const forwardMessage = `New text from ${senderNumber}:\n\n${messageBody}`;

      // Send SMS to office forwarding number
      const smsResult = await smsService.sendSMS(OFFICE_FORWARDING_NUMBER, forwardMessage);
      
      // Also send email notification
      let emailSent = false;
      try {
        await sendEmail({
          to: OFFICE_EMAIL,
          subject: `New SMS from ${senderNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <div style="background: #b22222; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">New SMS Received</h2>
              </div>
              <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
                <p><strong>From:</strong> ${senderNumber}</p>
                <p><strong>To:</strong> ${originalTo}</p>
                <p><strong>Time:</strong> ${timestamp || new Date().toLocaleString()}</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                <div style="background: white; padding: 15px; border-radius: 4px;">
                  ${messageBody}
                </div>
              </div>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr);
      }

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/forward-sms",
        method: "POST",
        payload: JSON.stringify({ from: senderNumber, message: messageBody.substring(0, 100) }),
        responseStatus: 200,
        responseBody: JSON.stringify({ success: true }),
        processingTimeMs: 0,
      });

      console.log(`[Zapier SMS Forward] Forwarded to ${OFFICE_FORWARDING_NUMBER}, SMS: ${smsResult.success}, Email: ${emailSent}`);

      res.json({ 
        success: true, 
        forwardedTo: OFFICE_FORWARDING_NUMBER,
        smsSent: smsResult.success,
        emailSent,
        messageId: smsResult.messageId,
      });
    } catch (error) {
      console.error("Zapier SMS forward webhook error:", error);
      res.status(500).json({ error: "Failed to forward SMS" });
    }
  });

  // Send SMS to a customer (Zapier action endpoint)
  // Zapier setup: Any trigger -> Webhooks POST to this endpoint
  app.post("/api/webhooks/zapier/send-sms", async (req, res) => {
    try {
      const { 
        to,
        phone,
        phone_number,
        message,
        body,
        template,
        customer_name
      } = req.body;

      const recipientPhone = to || phone || phone_number;
      let messageBody = message || body;

      if (!recipientPhone) {
        return res.status(400).json({ error: "Phone number is required (use 'to', 'phone', or 'phone_number' field)" });
      }

      // Use template if provided
      if (template && !messageBody) {
        const name = customer_name || "Valued Customer";
        switch (template) {
          case "acknowledgment":
            messageBody = `Hi ${name}, thank you for contacting Chicago Sewer Experts! We've received your inquiry and will be in touch shortly. For emergencies, call (630) 716-9792.`;
            break;
          case "appointment_reminder":
            messageBody = `Hi ${name}, this is a reminder about your upcoming appointment with Chicago Sewer Experts. Please reply CONFIRM to confirm or call us at (630) 716-9792 to reschedule.`;
            break;
          case "job_complete":
            messageBody = `Hi ${name}, your job with Chicago Sewer Experts has been completed. Thank you for your business! Please feel free to leave us a review.`;
            break;
          case "quote_ready":
            messageBody = `Hi ${name}, your quote from Chicago Sewer Experts is ready! Check your email for details or call us at (630) 716-9792 with any questions.`;
            break;
          default:
            return res.status(400).json({ error: `Unknown template: ${template}. Available: acknowledgment, appointment_reminder, job_complete, quote_ready` });
        }
      }

      if (!messageBody) {
        return res.status(400).json({ error: "Message is required (use 'message' or 'body' field, or specify a 'template')" });
      }

      console.log(`[Zapier Send SMS] To: ${recipientPhone}, Message: ${messageBody.substring(0, 50)}...`);

      const smsResult = await smsService.sendSMS(recipientPhone, messageBody);

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/send-sms",
        method: "POST",
        payload: JSON.stringify({ to: recipientPhone, messageLength: messageBody.length }),
        responseStatus: smsResult.success ? 200 : 500,
        responseBody: JSON.stringify({ success: smsResult.success }),
        processingTimeMs: 0,
      });

      res.json({ 
        success: smsResult.success, 
        messageId: smsResult.messageId,
        error: smsResult.error,
      });
    } catch (error) {
      console.error("Zapier send SMS webhook error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // Auto-reply to incoming SMS (triggered by Zapier when SMS arrives)
  // Zapier setup: Twilio (New SMS) -> Webhooks POST to this endpoint -> Send auto-reply
  app.post("/api/webhooks/zapier/auto-reply", async (req, res) => {
    try {
      const { 
        from_number,
        from,
        message,
        body,
        reply_message,
        template
      } = req.body;

      const senderNumber = from_number || from;
      const incomingMessage = (message || body || "").toLowerCase();

      if (!senderNumber) {
        return res.status(400).json({ error: "Sender phone number is required (use 'from_number' or 'from' field)" });
      }

      // Determine reply based on template, custom message, or keyword detection
      let replyMessage = reply_message;

      if (!replyMessage && template) {
        switch (template) {
          case "acknowledgment":
            replyMessage = "Thank you for contacting Chicago Sewer Experts! A team member will respond shortly. For emergencies, call (630) 716-9792.";
            break;
          case "after_hours":
            replyMessage = "Thank you for your message. Our office is currently closed. We'll respond during business hours (Mon-Sat 7AM-7PM). For emergencies, call (630) 716-9792.";
            break;
          case "confirm_received":
            replyMessage = "Got it! Thanks for confirming.";
            break;
          default:
            replyMessage = "Thank you for your message. A team member will be in touch soon.";
        }
      }

      // Keyword-based auto-replies if no template specified
      if (!replyMessage) {
        if (incomingMessage.includes("confirm") || incomingMessage.includes("yes")) {
          replyMessage = "Thank you for confirming your appointment with Chicago Sewer Experts! See you soon.";
        } else if (incomingMessage.includes("cancel") || incomingMessage.includes("reschedule")) {
          replyMessage = "We've received your request. Please call (630) 716-9792 to reschedule your appointment.";
        } else if (incomingMessage.includes("emergency") || incomingMessage.includes("urgent")) {
          replyMessage = "For emergencies, please call us immediately at (630) 716-9792. We're available 24/7 for urgent sewer issues.";
        } else if (incomingMessage.includes("quote") || incomingMessage.includes("estimate")) {
          replyMessage = "We'd be happy to provide a free estimate! A team member will call you within the hour, or call us at (630) 716-9792.";
        } else {
          replyMessage = "Thank you for contacting Chicago Sewer Experts! A team member will respond shortly. For emergencies, call (630) 716-9792.";
        }
      }

      console.log(`[Zapier Auto-Reply] To: ${senderNumber}, Reply: ${replyMessage.substring(0, 50)}...`);

      // Send the auto-reply
      const smsResult = await smsService.sendSMS(senderNumber, replyMessage);

      // Also forward the original message to office
      const forwardMessage = `Customer text from ${senderNumber}:\n\n${message || body || "(No message)"}\n\n[Auto-reply sent]`;
      await smsService.sendSMS(OFFICE_FORWARDING_NUMBER, forwardMessage);

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/auto-reply",
        method: "POST",
        payload: JSON.stringify({ from: senderNumber, incomingMessage: (message || body || "").substring(0, 100) }),
        responseStatus: 200,
        responseBody: JSON.stringify({ success: smsResult.success }),
        processingTimeMs: 0,
      });

      res.json({ 
        success: smsResult.success, 
        replySent: replyMessage,
        forwardedToOffice: OFFICE_FORWARDING_NUMBER,
        messageId: smsResult.messageId,
      });
    } catch (error) {
      console.error("Zapier auto-reply webhook error:", error);
      res.status(500).json({ error: "Failed to send auto-reply" });
    }
  });

  // Create job from Zapier (useful for form submissions, CRM integrations)
  app.post("/api/webhooks/zapier/create-job", async (req, res) => {
    try {
      const {
        customer_name,
        phone,
        email,
        address,
        city,
        zip_code,
        service_type,
        description,
        priority,
        scheduled_date,
        lead_id
      } = req.body;

      if (!customer_name || !phone) {
        return res.status(400).json({ error: "customer_name and phone are required" });
      }

      // First create or find the lead
      let leadId = lead_id;
      
      if (!leadId) {
        const leadData = {
          source: "Zapier",
          customerName: customer_name,
          customerPhone: phone,
          customerEmail: email,
          address,
          city,
          zipCode: zip_code,
          serviceType: service_type,
          description,
          status: "qualified" as const,
          priority: priority || "normal",
        };

        const lead = await storage.createLead(leadData);
        leadId = lead.id;
        console.log(`[Zapier Create Job] Created lead: ${leadId}`);
      }

      // Create the job with all required fields
      const jobData = {
        leadId,
        customerName: customer_name,
        customerPhone: phone,
        customerEmail: email || undefined,
        address: address || "Address TBD",
        city: city || undefined,
        zipCode: zip_code || undefined,
        serviceType: service_type || "General Service",
        description: description || `Service requested via Zapier. ${service_type || "General service"}`,
        status: "scheduled" as const,
        priority: priority || "normal",
        scheduledDate: scheduled_date ? new Date(scheduled_date) : new Date(),
        notes: `Job created via Zapier automation.`,
      };

      const job = await storage.createJob(jobData);
      console.log(`[Zapier Create Job] Created job: ${job.id}`);

      // Send notification to office
      await sendEmail({
        to: OFFICE_EMAIL,
        subject: `New Job Created via Zapier: ${customer_name}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>New Job Created</h2>
            <p><strong>Customer:</strong> ${customer_name}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Email:</strong> ${email || "Not provided"}</p>
            <p><strong>Address:</strong> ${address || "Not provided"}, ${city || ""} ${zip_code || ""}</p>
            <p><strong>Service:</strong> ${service_type || "Not specified"}</p>
            <p><strong>Description:</strong> ${description || "None"}</p>
            <p><strong>Scheduled:</strong> ${scheduled_date || "TBD"}</p>
          </div>
        `,
      });

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/create-job",
        method: "POST",
        payload: JSON.stringify({ customer_name, phone }),
        responseStatus: 200,
        responseBody: JSON.stringify({ success: true, jobId: job.id }),
        processingTimeMs: 0,
      });

      res.json({ 
        success: true, 
        jobId: job.id,
        leadId,
      });
    } catch (error) {
      console.error("Zapier create job webhook error:", error);
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  // Get Zapier webhook endpoints info
  app.get("/api/webhooks/zapier/info", (req, res) => {
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : "https://your-domain.replit.app";
    
    res.json({
      forwardingNumber: OFFICE_FORWARDING_NUMBER,
      endpoints: {
        createLead: {
          url: `${baseUrl}/api/webhooks/zapier/lead`,
          method: "POST",
          description: "Create a new lead in the CRM",
          fields: ["customer_name", "phone", "email", "address", "city", "zip_code", "service_type", "description", "source"]
        },
        forwardSms: {
          url: `${baseUrl}/api/webhooks/zapier/forward-sms`,
          method: "POST",
          description: "Forward incoming SMS to office number",
          fields: ["from_number", "message", "to_number"]
        },
        sendSms: {
          url: `${baseUrl}/api/webhooks/zapier/send-sms`,
          method: "POST",
          description: "Send SMS to a customer",
          fields: ["to", "message", "template", "customer_name"],
          templates: ["acknowledgment", "appointment_reminder", "job_complete", "quote_ready"]
        },
        autoReply: {
          url: `${baseUrl}/api/webhooks/zapier/auto-reply`,
          method: "POST",
          description: "Auto-reply to incoming SMS with smart responses",
          fields: ["from_number", "message", "reply_message", "template"],
          templates: ["acknowledgment", "after_hours", "confirm_received"]
        },
        createJob: {
          url: `${baseUrl}/api/webhooks/zapier/create-job`,
          method: "POST",
          description: "Create a new job from external source",
          fields: ["customer_name", "phone", "email", "address", "service_type", "description", "scheduled_date"]
        }
      }
    });
  });

  // ========================================
  // PDF DOCUMENTATION DOWNLOAD
  // ========================================

  app.get("/api/documentation/pdf", async (req, res) => {
    try {
      const doc = generateApplicationPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=Chicago-Sewer-Experts-CRM-Documentation.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  app.get("/api/docs/comparison", async (req, res) => {
    try {
      const doc = generateComparisonPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=CSE-CRM-vs-HomeAdvisor-Pro-Comparison.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Comparison PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate comparison PDF" });
    }
  });

  app.get("/api/docs/test-results", async (req, res) => {
    try {
      const doc = generateTestResultsPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=CSE-CRM-Test-Results.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Test results PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate test results PDF" });
    }
  });

  app.get("/api/docs/housecall-comparison", async (req, res) => {
    try {
      const doc = generateHouseCallProComparisonPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=CSE-CRM-vs-HouseCall-Pro.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("HouseCall Pro comparison PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate HouseCall Pro comparison PDF" });
    }
  });

  // 3-way comparison PDF (CSE vs HomeAdvisor vs HouseCall Pro)
  app.get("/api/docs/three-way-comparison", async (req, res) => {
    try {
      const doc = generateThreeWayComparisonPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=CSE-CRM-Competitor-Comparison.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Three-way comparison PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate comparison PDF" });
    }
  });

  return httpServer;
}
