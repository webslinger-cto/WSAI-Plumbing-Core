import OpenAI from "openai";
import { storage } from "../storage";
import { db } from "../db";
import { payrollPeriods, payrollRecords, customers, chatThreads as chatThreadsTable } from "@shared/schema";
import { calculateTaxes } from "../taxCalculation";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, desc } from "drizzle-orm";
import { sendEmail } from "./email";
import * as smsService from "./sms";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ToolDefinition {
  name: string;
  description: string;
  requiredRole: "dispatcher" | "admin";
  type: "read" | "write";
  parameters: z.ZodType<any>;
  execute: (params: any) => Promise<any>;
}

export interface ProposedAction {
  id: string;
  toolName: string;
  description: string;
  parameters: Record<string, any>;
  risk: "low" | "medium" | "high";
}

export interface PlanResponse {
  message: string;
  actions: ProposedAction[];
  context?: any;
}

export interface ExecuteResponse {
  success: boolean;
  result?: any;
  error?: string;
  summary: string;
}

const toolRegistry: Map<string, ToolDefinition> = new Map();

function registerTool(tool: ToolDefinition) {
  toolRegistry.set(tool.name, tool);
}

registerTool({
  name: "search_leads",
  description: "Search all leads. Can filter by status.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({ status: z.string().optional() }),
  execute: async (params) => {
    if (params.status) {
      return storage.getLeadsByStatus(params.status);
    }
    return storage.getLeads();
  },
});

registerTool({
  name: "get_lead",
  description: "Get a single lead by its ID.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({ id: z.string() }),
  execute: async (params) => storage.getLead(params.id),
});

registerTool({
  name: "list_jobs",
  description: "List all jobs. Can filter by status or technician.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    status: z.string().optional(),
    technicianId: z.string().optional(),
  }),
  execute: async (params) => {
    if (params.status) return storage.getJobsByStatus(params.status);
    if (params.technicianId) return storage.getJobsByTechnician(params.technicianId);
    return storage.getJobs();
  },
});

registerTool({
  name: "get_job",
  description: "Get a single job by its ID.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({ id: z.string() }),
  execute: async (params) => storage.getJob(params.id),
});

registerTool({
  name: "list_technicians",
  description: "List all technicians with their availability and skills.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({}),
  execute: async () => storage.getTechnicians(),
});

registerTool({
  name: "list_quotes",
  description: "List all quotes. Can filter by status or lead.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    status: z.string().optional(),
    leadId: z.string().optional(),
  }),
  execute: async (params) => {
    if (params.leadId) {
      const jobs = await storage.getJobs();
      const leadJobs = jobs.filter((j: any) => j.leadId === params.leadId);
      const allQuotes = [];
      for (const job of leadJobs) {
        const quotes = await storage.getQuotesByJob(job.id);
        allQuotes.push(...quotes);
      }
      return allQuotes;
    }
    if (params.status) return storage.getQuotesByStatus(params.status);
    return storage.getQuotesByStatus("pending");
  },
});

registerTool({
  name: "create_lead",
  description: "Create a new lead with customer info, address, and service details.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    customerName: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    address: z.string(),
    serviceType: z.string(),
    description: z.string().optional(),
    source: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "emergency"]).optional(),
  }),
  execute: async (params) => {
    return storage.createLead({
      customerName: params.customerName,
      phone: params.phone,
      email: params.email || null,
      address: params.address,
      serviceType: params.serviceType,
      description: params.description || null,
      source: params.source || "ai_copilot",
      priority: params.priority || "medium",
      status: "new",
    } as any);
  },
});

registerTool({
  name: "update_lead_status",
  description: "Update a lead's status (new, contacted, qualified, converted, lost, follow_up).",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    id: z.string(),
    status: z.string(),
  }),
  execute: async (params) => storage.updateLead(params.id, { status: params.status }),
});

registerTool({
  name: "assign_lead",
  description: "Assign a lead to a technician by setting the assignedTo field.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    leadId: z.string(),
    technicianId: z.string(),
  }),
  execute: async (params) => {
    return storage.updateLead(params.leadId, { assignedTo: params.technicianId });
  },
});

registerTool({
  name: "update_job_status",
  description: "Update a job's status (pending, scheduled, en_route, in_progress, completed, cancelled).",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    id: z.string(),
    status: z.string(),
  }),
  execute: async (params) => storage.updateJob(params.id, { status: params.status }),
});

registerTool({
  name: "assign_technician_to_job",
  description: "Assign a technician to a job.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    jobId: z.string(),
    technicianId: z.string(),
  }),
  execute: async (params) => {
    return storage.updateJob(params.jobId, { assignedTechnicianId: params.technicianId });
  },
});

registerTool({
  name: "create_job_timeline_event",
  description: "Add a timeline event to a job for tracking purposes.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    jobId: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
  }),
  execute: async (params) => {
    return storage.createJobTimelineEvent({
      jobId: params.jobId,
      type: params.type,
      title: params.title,
      description: params.description || null,
    } as any);
  },
});

registerTool({
  name: "schedule_job",
  description: "Schedule a job by setting its scheduled date, start time, and optional end time. Use ISO date format (YYYY-MM-DD) for scheduledDate and 24h format (HH:MM) for times.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    jobId: z.string(),
    scheduledDate: z.string(),
    scheduledTime: z.string().optional(),
    scheduledTimeEnd: z.string().optional(),
    technicianId: z.string().optional(),
  }),
  execute: async (params) => {
    const existing = await storage.getJob(params.jobId);
    if (!existing) return { error: "Job not found" };
    const updates: Record<string, any> = {
      scheduledDate: new Date(params.scheduledDate),
      scheduledTimeStart: params.scheduledTime || null,
      scheduledTimeEnd: params.scheduledTimeEnd || null,
      status: "scheduled",
    };
    if (params.technicianId) {
      updates.assignedTechnicianId = params.technicianId;
    }
    const job = await storage.updateJob(params.jobId, updates);
    await storage.createJobTimelineEvent({
      jobId: params.jobId,
      eventType: "scheduled",
      description: `Job scheduled for ${params.scheduledDate}${params.scheduledTime ? ` at ${params.scheduledTime}` : ""}${params.technicianId ? ` (technician assigned)` : ""}`,
    });
    return job;
  },
});

registerTool({
  name: "get_calendar_schedule",
  description: "Get all scheduled jobs for a date range to see the calendar. Returns jobs with their scheduled dates, times, assigned technicians, and customer info. Use ISO date format (YYYY-MM-DD).",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    startDate: z.string(),
    endDate: z.string(),
    technicianId: z.string().optional(),
  }),
  execute: async (params) => {
    const allJobs = await storage.getJobs();
    const start = new Date(params.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);

    const scheduledJobs = allJobs.filter((j: any) => {
      if (!j.scheduledDate) return false;
      const jobDate = new Date(j.scheduledDate);
      if (jobDate < start || jobDate > end) return false;
      if (params.technicianId && j.assignedTechnicianId !== params.technicianId) return false;
      return true;
    });

    const technicians = await storage.getTechnicians();
    const techMap = new Map(technicians.map((t: any) => [t.id, t.fullName || t.name]));

    return scheduledJobs.map((j: any) => ({
      jobId: j.id,
      customerName: j.customerName,
      address: j.address,
      serviceType: j.serviceType,
      status: j.status,
      priority: j.priority,
      scheduledDate: j.scheduledDate,
      scheduledTimeStart: j.scheduledTimeStart,
      scheduledTimeEnd: j.scheduledTimeEnd,
      assignedTechnicianId: j.assignedTechnicianId,
      assignedTechnicianName: j.assignedTechnicianId ? techMap.get(j.assignedTechnicianId) || "Unknown" : "Unassigned",
      description: j.description,
    }));
  },
});

registerTool({
  name: "get_todays_schedule",
  description: "Get today's full schedule showing all jobs, technician assignments, and time slots. Quick view of the current day's calendar.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({}),
  execute: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const allJobs = await storage.getJobs();
    const todaysJobs = allJobs.filter((j: any) => {
      if (!j.scheduledDate) return false;
      const jobDate = new Date(j.scheduledDate);
      return jobDate >= today && jobDate <= endOfDay;
    });

    const technicians = await storage.getTechnicians();
    const techMap = new Map(technicians.map((t: any) => [t.id, { name: t.fullName || t.name, status: t.status }]));

    const schedule = todaysJobs
      .sort((a: any, b: any) => (a.scheduledTimeStart || "00:00").localeCompare(b.scheduledTimeStart || "00:00"))
      .map((j: any) => {
        const tech = j.assignedTechnicianId ? techMap.get(j.assignedTechnicianId) : null;
        return {
          jobId: j.id,
          time: j.scheduledTimeStart ? `${j.scheduledTimeStart}${j.scheduledTimeEnd ? `-${j.scheduledTimeEnd}` : ""}` : "No time set",
          customerName: j.customerName,
          address: j.address,
          serviceType: j.serviceType,
          status: j.status,
          priority: j.priority,
          technician: tech ? tech.name : "Unassigned",
          technicianStatus: tech ? tech.status : null,
        };
      });

    const availableTechs = technicians.filter((t: any) => t.status === "available").map((t: any) => ({
      id: t.id,
      name: t.fullName || t.name,
      status: t.status,
    }));

    return {
      date: today.toISOString().split("T")[0],
      totalJobs: schedule.length,
      schedule,
      availableTechnicians: availableTechs,
    };
  },
});

registerTool({
  name: "check_technician_availability",
  description: "Check a technician's availability on a specific date by looking at their scheduled jobs and current status. Returns open time slots.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    technicianId: z.string(),
    date: z.string(),
  }),
  execute: async (params) => {
    const tech = await storage.getTechnician(params.technicianId);
    if (!tech) return { error: "Technician not found" };

    const targetDate = new Date(params.date);
    targetDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const allJobs = await storage.getJobs();
    const techJobs = allJobs.filter((j: any) => {
      if (j.assignedTechnicianId !== params.technicianId) return false;
      if (!j.scheduledDate) return false;
      const jobDate = new Date(j.scheduledDate);
      return jobDate >= targetDate && jobDate <= endOfDay;
    });

    const scheduledSlots = techJobs.map((j: any) => ({
      jobId: j.id,
      timeStart: j.scheduledTimeStart || "Unknown",
      timeEnd: j.scheduledTimeEnd || "Unknown",
      customerName: j.customerName,
      serviceType: j.serviceType,
      status: j.status,
    })).sort((a: any, b: any) => (a.timeStart || "").localeCompare(b.timeStart || ""));

    return {
      technicianId: params.technicianId,
      technicianName: tech.fullName || tech.name,
      currentStatus: tech.status,
      date: params.date,
      scheduledJobs: scheduledSlots,
      jobCount: scheduledSlots.length,
      isAvailable: tech.status === "available" || tech.status === "off_duty",
    };
  },
});

registerTool({
  name: "reschedule_job",
  description: "Reschedule an existing job to a new date and/or time. Optionally reassign to a different technician.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    jobId: z.string(),
    newDate: z.string(),
    newTimeStart: z.string().optional(),
    newTimeEnd: z.string().optional(),
    technicianId: z.string().optional(),
    reason: z.string().optional(),
  }),
  execute: async (params) => {
    const job = await storage.getJob(params.jobId);
    if (!job) return { error: "Job not found" };

    const updates: Record<string, any> = {
      scheduledDate: new Date(params.newDate),
      scheduledTimeStart: params.newTimeStart || job.scheduledTimeStart || null,
      scheduledTimeEnd: params.newTimeEnd || job.scheduledTimeEnd || null,
    };
    if (params.technicianId) {
      updates.assignedTechnicianId = params.technicianId;
    }

    const updated = await storage.updateJob(params.jobId, updates);
    const oldDate = job.scheduledDate ? new Date(job.scheduledDate).toISOString().split("T")[0] : "unscheduled";
    await storage.createJobTimelineEvent({
      jobId: params.jobId,
      eventType: "rescheduled",
      description: `Job rescheduled from ${oldDate} to ${params.newDate}${params.reason ? `. Reason: ${params.reason}` : ""}`,
    });
    return updated;
  },
});

registerTool({
  name: "create_and_schedule_job",
  description: "Create a new job AND schedule it in one step. Use this when you have customer info from a call recording or intake and want to immediately put it on the calendar. Requires customer name, phone, address, service type, and scheduling details.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    customerName: z.string(),
    customerPhone: z.string(),
    customerEmail: z.string().optional(),
    address: z.string(),
    serviceType: z.string(),
    description: z.string().optional(),
    priority: z.enum(["low", "normal", "high", "emergency"]).optional(),
    scheduledDate: z.string(),
    scheduledTimeStart: z.string().optional(),
    scheduledTimeEnd: z.string().optional(),
    technicianId: z.string().optional(),
  }),
  execute: async (params) => {
    const jobData: Record<string, any> = {
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail || null,
      address: params.address,
      serviceType: params.serviceType,
      description: params.description || null,
      priority: params.priority || "normal",
      status: "scheduled",
      scheduledDate: new Date(params.scheduledDate),
      scheduledTimeStart: params.scheduledTimeStart || null,
      scheduledTimeEnd: params.scheduledTimeEnd || null,
    };
    if (params.technicianId) {
      jobData.assignedTechnicianId = params.technicianId;
    }

    const job = await storage.createJob(jobData as any);
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "job_created",
      description: `Job created and scheduled for ${params.scheduledDate}${params.scheduledTimeStart ? ` at ${params.scheduledTimeStart}` : ""}`,
    });
    return job;
  },
});

registerTool({
  name: "list_payroll_periods",
  description: "List all payroll periods with their status (open, processing, closed). Admin only.",
  requiredRole: "admin",
  type: "read",
  parameters: z.object({}),
  execute: async () => {
    const periods = await storage.getPayrollPeriods();
    return periods.map(p => ({
      id: p.id,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      processedAt: p.processedAt,
    }));
  },
});

registerTool({
  name: "get_payroll_summary",
  description: "Get payroll records for a specific period, or the current/most recent period if no periodId given. Shows each technician's gross pay, net pay, hours, commissions. Admin only.",
  requiredRole: "admin",
  type: "read",
  parameters: z.object({
    periodId: z.string().optional(),
  }),
  execute: async (params) => {
    let periodId = params.periodId;
    if (!periodId) {
      const current = await storage.getCurrentPayrollPeriod();
      if (current) {
        periodId = current.id;
      } else {
        const all = await storage.getPayrollPeriods();
        if (all.length > 0) periodId = all[0].id;
        else return { error: "No payroll periods found" };
      }
    }
    const records = await storage.getPayrollRecordsByPeriod(periodId);
    const technicians = await storage.getTechnicians();
    const techMap = new Map(technicians.map(t => [t.id, t.fullName]));
    return {
      periodId,
      records: records.map(r => ({
        id: r.id,
        technicianName: techMap.get(r.technicianId || "") || r.userId,
        regularHours: r.regularHours,
        overtimeHours: r.overtimeHours,
        regularPay: r.regularPay,
        overtimePay: r.overtimePay,
        commissionPay: r.commissionPay,
        grossPay: r.grossPay,
        netPay: r.netPay,
        isPaid: r.isPaid,
      })),
    };
  },
});

registerTool({
  name: "process_payroll",
  description: "Process payroll for a date range. Calculates pay for all technicians based on completed jobs in that period, including regular hours, overtime, commissions, taxes, and lead fee deductions. Creates a new payroll period and individual records. Admin only. IMPORTANT: This is a financial action - use with care.",
  requiredRole: "admin",
  type: "write",
  parameters: z.object({
    startDate: z.string().describe("Start date of the pay period (YYYY-MM-DD format)"),
    endDate: z.string().describe("End date of the pay period (YYYY-MM-DD format)"),
  }),
  execute: async (params) => {
    const periodStart = new Date(params.startDate);
    const periodEnd = new Date(params.endDate);

    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new Error("Invalid date format. Use YYYY-MM-DD.");
    }
    if (periodEnd <= periodStart) {
      throw new Error("End date must be after start date.");
    }

    const allTechnicians = await storage.getTechnicians();
    const allJobs = await storage.getJobs();

    const periodJobs = allJobs.filter(j => {
      if (j.status !== "completed" || !j.completedAt) return false;
      const completedAt = new Date(j.completedAt);
      return completedAt >= periodStart && completedAt <= periodEnd;
    });

    if (periodJobs.length === 0) {
      return { message: "No completed jobs found in this date range.", jobsFound: 0 };
    }

    const result = await db.transaction(async (tx) => {
      const [period] = await tx.insert(payrollPeriods).values({
        startDate: periodStart,
        endDate: periodEnd,
        status: "processing",
        processedAt: new Date(),
        processedBy: null,
      }).returning();

      const records: any[] = [];

      for (const tech of allTechnicians) {
        const techJobs = periodJobs.filter(j => j.assignedTechnicianId === tech.id);
        if (techJobs.length === 0) continue;

        const hourlyRate = parseFloat(String(tech.hourlyRate)) || 25;
        const commissionRate = parseFloat(String(tech.commissionRate)) || 0.1;
        const emergencyMultiplier = parseFloat(String(tech.emergencyRate)) || 1.5;

        let regularHours = 0;
        let overtimeHours = 0;

        techJobs.forEach(job => {
          if (job.startedAt && job.completedAt) {
            const started = new Date(job.startedAt);
            const completed = new Date(job.completedAt);
            const hours = (completed.getTime() - started.getTime()) / (1000 * 60 * 60);
            const isEmergency = job.priority === "urgent" || job.priority === "high";
            if (isEmergency) overtimeHours += hours;
            else regularHours += hours;
          } else if (job.estimatedDuration) {
            regularHours += job.estimatedDuration / 60;
          }
        });

        const totalRevenue = techJobs.reduce((sum, j) => sum + (parseFloat(String(j.totalRevenue)) || 0), 0);
        const regularPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * emergencyMultiplier;
        const commissionPay = totalRevenue * commissionRate;
        const leadFeeDeductions = techJobs.length * 125;
        const grossPay = regularPay + overtimePay + commissionPay;

        let payRate = null;
        if (tech.userId) {
          payRate = await storage.getActiveEmployeePayRate(tech.userId);
        }
        const employmentType = payRate?.employmentType === "salary" ? "salary" : "hourly";

        const taxResult = calculateTaxes({
          grossPay,
          employmentType,
          residenceState: "IL",
          filingStatus: "single",
        });

        const totalDeductions = leadFeeDeductions;
        const netPay = grossPay - taxResult.totalTax - totalDeductions;
        const userId = tech.userId || tech.id;

        const [record] = await tx.insert(payrollRecords).values({
          userId,
          technicianId: tech.id,
          periodId: period.id,
          employmentType,
          regularHours: String(Math.round(regularHours * 100) / 100),
          overtimeHours: String(Math.round(overtimeHours * 100) / 100),
          hourlyRate: String(hourlyRate),
          overtimeRate: String(Math.round(hourlyRate * emergencyMultiplier * 100) / 100),
          regularPay: String(Math.round(regularPay * 100) / 100),
          overtimePay: String(Math.round(overtimePay * 100) / 100),
          commissionPay: String(Math.round(commissionPay * 100) / 100),
          bonusPay: "0",
          leadFeeDeductions: String(leadFeeDeductions),
          materialDeductions: "0",
          permitDeductions: "0",
          deductions: String(totalDeductions),
          federalTax: String(taxResult.federalTax),
          stateTax: String(taxResult.stateTax),
          socialSecurity: String(taxResult.socialSecurity),
          medicare: String(taxResult.medicare),
          grossPay: String(Math.round(grossPay * 100) / 100),
          netPay: String(Math.round(netPay * 100) / 100),
          isPaid: false,
        }).returning();

        records.push({
          technicianName: tech.fullName,
          grossPay: record.grossPay,
          netPay: record.netPay,
          regularHours: record.regularHours,
          overtimeHours: record.overtimeHours,
          commissionPay: record.commissionPay,
          jobsInPeriod: techJobs.length,
        });
      }

      await tx.update(payrollPeriods)
        .set({ status: "closed" })
        .where(eq(payrollPeriods.id, period.id));

      return {
        periodId: period.id,
        startDate: params.startDate,
        endDate: params.endDate,
        status: "closed",
        totalEmployees: records.length,
        totalGrossPay: records.reduce((s: number, r: any) => s + parseFloat(r.grossPay), 0).toFixed(2),
        totalNetPay: records.reduce((s: number, r: any) => s + parseFloat(r.netPay), 0).toFixed(2),
        totalJobs: periodJobs.length,
        records,
      };
    });

    return result;
  },
});

registerTool({
  name: "get_stale_quotes",
  description: "Get open/stale quotes that haven't been accepted or declined, with aging information. Includes quotes with status: draft, sent, viewed. Returns urgency levels based on days since last activity.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    urgency: z.enum(["all", "low", "medium", "high", "critical"]).optional(),
  }),
  execute: async (params) => {
    const allQuotes = await storage.getAllQuotes();
    const now = new Date();
    const stale = allQuotes
      .filter((q: any) => ["draft", "sent", "viewed"].includes(q.status))
      .map((q: any) => {
        const lastActivity = q.viewedAt || q.sentAt || q.createdAt;
        const days = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
        let urgency: string = "low";
        if (days >= 14) urgency = "critical";
        else if (days >= 7) urgency = "high";
        else if (days >= 3) urgency = "medium";
        return {
          id: q.id, customerName: q.customerName, customerPhone: q.customerPhone,
          customerEmail: q.customerEmail, address: q.address, status: q.status,
          total: q.total, daysSinceLastActivity: days, urgency,
          lastActivityType: q.viewedAt ? "viewed" : q.sentAt ? "sent" : "created",
          serviceType: q.serviceType || null,
        };
      })
      .filter((q: any) => !params.urgency || params.urgency === "all" || q.urgency === params.urgency)
      .sort((a: any, b: any) => b.daysSinceLastActivity - a.daysSinceLastActivity);
    return { total: stale.length, quotes: stale.slice(0, 25) };
  },
});

registerTool({
  name: "get_unconverted_leads",
  description: "Get leads that haven't been converted to jobs yet, with aging information. Includes leads with status: new, contacted, qualified, estimated, quoted. Returns urgency levels based on days since last update.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    urgency: z.enum(["all", "low", "medium", "high", "critical"]).optional(),
    status: z.string().optional(),
  }),
  execute: async (params) => {
    const allLeads = await storage.getLeads();
    const now = new Date();
    const unconverted = allLeads
      .filter((l: any) => {
        const validStatuses = ["new", "contacted", "qualified", "estimated", "quoted"];
        if (params.status) return l.status === params.status;
        return validStatuses.includes(l.status);
      })
      .map((l: any) => {
        const lastUpdated = l.updatedAt || l.createdAt;
        const days = Math.floor((now.getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
        let urgency: string = "low";
        if (days >= 14) urgency = "critical";
        else if (days >= 7) urgency = "high";
        else if (days >= 3) urgency = "medium";
        return {
          id: l.id, customerName: l.customerName, phone: l.phone,
          email: l.customerEmail, address: l.address, status: l.status,
          source: l.source, serviceType: l.serviceType, priority: l.priority,
          description: l.description, daysSinceLastUpdate: days, urgency,
        };
      })
      .filter((l: any) => !params.urgency || params.urgency === "all" || l.urgency === params.urgency)
      .sort((a: any, b: any) => b.daysSinceLastUpdate - a.daysSinceLastUpdate);
    return { total: unconverted.length, leads: unconverted.slice(0, 25) };
  },
});

registerTool({
  name: "generate_followup_message",
  description: "Generate an AI-powered personalized follow-up message for a customer with an open quote or unconverted lead. Returns the message text for review before sending.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    customerName: z.string(),
    channel: z.enum(["sms", "email"]),
    type: z.enum(["quote", "lead"]),
    serviceType: z.string().optional(),
    address: z.string().optional(),
    description: z.string().optional(),
    quoteTotal: z.string().optional(),
    status: z.string().optional(),
    daysSinceLastActivity: z.number().optional(),
  }),
  execute: async (params) => {
    const channelInstructions = params.channel === "email"
      ? "Write a professional but warm follow-up email. Include a subject line on the first line formatted as 'Subject: ...' followed by the email body."
      : "Write a concise, friendly SMS follow-up message. Keep it under 300 characters. Do not include a subject line.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `You are a customer follow-up specialist for Emergency Chicago Sewer Experts, a sewer and plumbing company in Chicago.
Generate a ${params.channel} follow-up for:
- Name: ${params.customerName}
- Type: ${params.type === "quote" ? "Open Quote" : "Unconverted Lead"}
- Status: ${params.status || "unknown"}
- Service: ${params.serviceType || "Sewer/Plumbing"}
${params.address ? `- Address: ${params.address}` : ""}
${params.description ? `- Issue: ${params.description}` : ""}
${params.quoteTotal ? `- Quote: $${params.quoteTotal}` : ""}
- Days idle: ${params.daysSinceLastActivity || "unknown"}

${channelInstructions}
Be professional, reference their service need, create gentle urgency, and sign off as Emergency Chicago Sewer Experts.`,
      }],
      max_tokens: 400,
      temperature: 0.7,
    });

    const message = completion.choices[0]?.message?.content || "";
    let subject = "";
    let body = message;
    if (params.channel === "email") {
      const subjectMatch = message.match(/^Subject:\s*(.+?)[\n\r]/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        body = message.replace(/^Subject:\s*.+?[\n\r]+/i, "").trim();
      }
    }
    return { message: body, subject, channel: params.channel };
  },
});

registerTool({
  name: "send_followup_sms",
  description: "Send a follow-up SMS to a customer and log the contact attempt. Use generate_followup_message first to create the message, then propose this action for approval.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    to: z.string(),
    message: z.string(),
    leadId: z.string().optional(),
    customerName: z.string().optional(),
  }),
  execute: async (params) => {
    const result = await smsService.sendSMS(params.to, params.message);
    await storage.createContactAttempt({
      leadId: params.leadId || null,
      type: "sms",
      direction: "outbound",
      status: result.success ? "sent" : "failed",
      content: params.message,
      templateId: "ai_followup",
      recipientPhone: params.to,
      sentBy: "ai_followup_assistant",
      sentAt: result.success ? new Date() : null,
      externalId: result.messageId || null,
      failedReason: result.error || null,
    });
    if (result.success && params.leadId) {
      const lead = await storage.getLead(params.leadId);
      if (lead && lead.status === "new") {
        await storage.updateLead(params.leadId, { status: "contacted" });
      }
    }
    return { success: result.success, messageId: result.messageId, error: result.error };
  },
});

// === IN-APP MESSAGING TOOLS ===

registerTool({
  name: "get_chat_threads",
  description: "Get chat threads, optionally filtered by jobId, leadId, visibility (internal/customer_visible), or status (active/closed). Returns threads with participant info and last message preview.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    jobId: z.string().optional(),
    leadId: z.string().optional(),
    visibility: z.enum(["internal", "customer_visible"]).optional(),
    status: z.enum(["active", "closed"]).optional(),
    limit: z.number().optional().default(20),
  }),
  execute: async (params) => {
    if (params.jobId) {
      const vis = params.visibility || "internal";
      const thread = await storage.getChatThreadByJob(params.jobId, vis as any);
      if (!thread) return { threads: [], message: "No thread found for this job" };
      const participants = await storage.getChatThreadParticipants(thread.id);
      const messages = await storage.getChatMessages(thread.id, { limit: 1 });
      return { threads: [{ ...thread, participants, lastMessage: messages[messages.length - 1] || null }] };
    }
    if (params.leadId) {
      const vis = params.visibility || "internal";
      const thread = await storage.getChatThreadByLead(params.leadId, vis as any);
      if (!thread) return { threads: [], message: "No thread found for this lead" };
      const participants = await storage.getChatThreadParticipants(thread.id);
      const messages = await storage.getChatMessages(thread.id, { limit: 1 });
      return { threads: [{ ...thread, participants, lastMessage: messages[messages.length - 1] || null }] };
    }
    let allDbThreads = await db.select().from(chatThreadsTable)
      .orderBy(desc(chatThreadsTable.lastMessageAt));
    if (params.status) {
      allDbThreads = allDbThreads.filter((t: any) => t.status === params.status);
    }
    if (params.visibility) {
      allDbThreads = allDbThreads.filter((t: any) => t.visibility === params.visibility);
    }
    const limited = allDbThreads.slice(0, params.limit);
    const enriched = await Promise.all(limited.map(async (thread: any) => {
      const participants = await storage.getChatThreadParticipants(thread.id);
      const messages = await storage.getChatMessages(thread.id, { limit: 1 });
      return { ...thread, participants, lastMessage: messages[messages.length - 1] || null };
    }));
    return { threads: enriched };
  },
});

registerTool({
  name: "get_thread_messages",
  description: "Get messages from a specific chat thread. Returns the most recent messages with sender info.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    threadId: z.string(),
    limit: z.number().optional().default(50),
  }),
  execute: async (params) => {
    const thread = await storage.getChatThread(params.threadId);
    if (!thread) return { error: "Thread not found" };
    const messages = await storage.getChatMessages(params.threadId, { limit: params.limit });
    const participants = await storage.getChatThreadParticipants(params.threadId);
    return { thread, participants, messages };
  },
});

registerTool({
  name: "send_chat_message",
  description: "Send a message to a chat thread. Can target an existing thread by threadId, or automatically find/create a thread by jobId or leadId. Set audience to 'internal' for staff-only or 'customer_visible' for customer-facing threads. The AI sends as 'AI Assistant'.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    threadId: z.string().optional(),
    jobId: z.string().optional(),
    leadId: z.string().optional(),
    message: z.string(),
    audience: z.enum(["internal", "customer_visible"]).default("internal"),
  }),
  execute: async (params) => {
    let threadId = params.threadId;

    if (!threadId && params.jobId) {
      let thread = await storage.getChatThreadByJob(params.jobId, params.audience as any);
      if (!thread) {
        const job = await storage.getJob(params.jobId);
        if (!job) return { error: "Job not found" };
        thread = await storage.createChatThread({
          relatedJobId: params.jobId,
          visibility: params.audience,
          status: "active",
          subject: `Job #${job.id.slice(0, 8)} - ${job.serviceType} - ${job.customerName}`,
          createdByType: "user",
          createdById: "ai_assistant",
        });
        const users = await storage.getUsers();
        const assignedTech = job.assignedTechnicianId ? await storage.getTechnician(job.assignedTechnicianId) : null;
        const staffToAdd = users.filter(u => 
          u.role === "admin" || u.role === "dispatcher" || 
          (u.role === "technician" && assignedTech?.userId && u.id === assignedTech.userId)
        );
        for (const user of staffToAdd) {
          await storage.addChatThreadParticipant({
            threadId: thread.id,
            participantType: "user",
            participantId: user.id,
            roleAtTime: user.role,
            displayName: user.fullName || user.username,
          });
        }
        if (params.audience === "customer_visible" && job.customerPhone) {
          await storage.addChatThreadParticipant({
            threadId: thread.id,
            participantType: "customer",
            participantId: job.customerPhone,
            roleAtTime: "customer",
            displayName: job.customerName,
          });
        }
      }
      threadId = thread.id;
    }

    if (!threadId && params.leadId) {
      let thread = await storage.getChatThreadByLead(params.leadId, params.audience as any);
      if (!thread) {
        const lead = await storage.getLead(params.leadId);
        if (!lead) return { error: "Lead not found" };
        thread = await storage.createChatThread({
          relatedLeadId: params.leadId,
          visibility: params.audience,
          status: "active",
          subject: `Lead #${lead.id.slice(0, 8)} - ${lead.serviceType || "Inquiry"} - ${lead.customerName}`,
          createdByType: "user",
          createdById: "ai_assistant",
        });
        const users = await storage.getUsers();
        for (const user of users.filter(u => u.role === "admin" || u.role === "dispatcher")) {
          await storage.addChatThreadParticipant({
            threadId: thread.id,
            participantType: "user",
            participantId: user.id,
            roleAtTime: user.role,
            displayName: user.fullName || user.username,
          });
        }
        if (params.audience === "customer_visible" && lead.customerPhone) {
          await storage.addChatThreadParticipant({
            threadId: thread.id,
            participantType: "customer",
            participantId: lead.customerPhone,
            roleAtTime: "customer",
            displayName: lead.customerName,
          });
        }
      }
      threadId = thread.id;
    }

    if (!threadId) return { error: "Must provide threadId, jobId, or leadId" };

    const msg = await storage.createChatMessage({
      threadId,
      senderType: "user",
      senderId: "ai_assistant",
      senderDisplayName: "AI Assistant",
      body: params.message,
      meta: { source: "ai_copilot" },
    });

    return { success: true, threadId, messageId: msg.id, message: "Message sent successfully" };
  },
});

// === CUSTOMER PROFILE TOOL ===

registerTool({
  name: "get_customer_profile",
  description: "Get comprehensive customer profile data by phone number or customer name. Returns customer info, addresses, related jobs, leads, quotes, call history, contact attempts, and recent chat threads. Use this to understand a customer's full history before taking action.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    phone: z.string().optional(),
    customerName: z.string().optional(),
    customerId: z.string().optional(),
  }),
  execute: async (params) => {
    let customerPhone = params.phone;
    let profile: any = {};

    if (params.customerId) {
      const result = await db.select().from(customers).where(eq(customers.id, params.customerId));
      if (result.length > 0) {
        profile.customer = result[0];
        customerPhone = result[0].phonePrimary;
      }
    }

    if (!customerPhone && params.customerName) {
      const allLeads = await storage.getLeads();
      const matchingLead = allLeads.find(l => 
        l.customerName.toLowerCase().includes(params.customerName!.toLowerCase())
      );
      if (matchingLead) {
        customerPhone = matchingLead.customerPhone;
      } else {
        const allJobs = await storage.getJobs();
        const matchingJob = allJobs.find(j => 
          j.customerName.toLowerCase().includes(params.customerName!.toLowerCase())
        );
        if (matchingJob) customerPhone = matchingJob.customerPhone;
      }
    }

    if (!customerPhone) {
      return { error: "Could not find customer. Provide a phone number, customer name, or customer ID." };
    }

    const timeline = await storage.getCustomerTimeline(customerPhone);
    profile.phone = customerPhone;
    profile.leads = timeline.leads.map(l => ({
      id: l.id, customerName: l.customerName, status: l.status, source: l.source,
      serviceType: l.serviceType, address: l.address, city: l.city, zipCode: l.zipCode,
      createdAt: l.createdAt, priority: l.priority, description: l.description,
    }));
    profile.jobs = timeline.jobs.map(j => ({
      id: j.id, customerName: j.customerName, status: j.status, serviceType: j.serviceType,
      address: j.address, city: j.city, scheduledDate: j.scheduledDate,
      assignedTechnicianId: j.assignedTechnicianId, priority: j.priority,
      totalCost: j.totalCost, completedAt: j.completedAt, createdAt: j.createdAt,
    }));
    profile.quotes = timeline.quotes.map(q => ({
      id: q.id, customerName: q.customerName, status: q.status, total: q.total,
      createdAt: q.createdAt, sentAt: q.sentAt, acceptedAt: q.acceptedAt,
    }));
    profile.calls = timeline.calls.map(c => ({
      id: c.id, direction: c.direction, outcome: c.outcome, duration: c.duration,
      notes: c.notes, createdAt: c.createdAt,
    }));

    const contactAttempts: any[] = [];
    for (const lead of timeline.leads) {
      const attempts = await storage.getContactAttemptsByLead(lead.id);
      contactAttempts.push(...attempts.map(a => ({
        id: a.id, type: a.type, direction: a.direction, status: a.status,
        content: a.content?.slice(0, 200), sentAt: a.sentAt, leadId: a.leadId,
      })));
    }
    profile.contactAttempts = contactAttempts.slice(0, 20);

    profile.summary = {
      totalLeads: profile.leads.length,
      totalJobs: profile.jobs.length,
      totalQuotes: profile.quotes.length,
      totalCalls: profile.calls.length,
      totalContactAttempts: contactAttempts.length,
      activeJobs: profile.jobs.filter((j: any) => !["completed", "cancelled"].includes(j.status)).length,
      openQuotes: profile.quotes.filter((q: any) => !["accepted", "declined", "expired"].includes(q.status)).length,
      customerName: profile.leads[0]?.customerName || profile.jobs[0]?.customerName || params.customerName || "Unknown",
      email: timeline.leads[0]?.customerEmail || timeline.jobs[0]?.customerEmail || null,
    };

    return profile;
  },
});

registerTool({
  name: "send_followup_email",
  description: "Send a follow-up email to a customer and log the contact attempt. Use generate_followup_message first to create the message, then propose this action for approval.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    to: z.string(),
    subject: z.string(),
    message: z.string(),
    leadId: z.string().optional(),
    customerName: z.string().optional(),
  }),
  execute: async (params) => {
    const result = await sendEmail({
      to: params.to,
      subject: params.subject,
      html: params.message,
      text: params.message.replace(/<[^>]*>/g, ""),
    });
    await storage.createContactAttempt({
      leadId: params.leadId || null,
      type: "email",
      direction: "outbound",
      status: result.success ? "sent" : "failed",
      subject: params.subject,
      content: params.message,
      templateId: "ai_followup",
      recipientEmail: params.to,
      sentBy: "ai_followup_assistant",
      sentAt: result.success ? new Date() : null,
      externalId: result.messageId || null,
      failedReason: result.error || null,
    });
    if (result.success && params.leadId) {
      const lead = await storage.getLead(params.leadId);
      if (lead && lead.status === "new") {
        await storage.updateLead(params.leadId, { status: "contacted" });
      }
    }
    return { success: result.success, messageId: result.messageId, error: result.error };
  },
});

registerTool({
  name: "web_search",
  description: "Search the web for real-time information like material pricing, plumbing code requirements, product specs, supplier availability, permit regulations, weather conditions, or any other external data. Use this when the answer is not in the CRM database. Uses AI-powered research to find current data and pricing.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    query: z.string().describe("Natural language search query - be specific about what you need"),
  }),
  execute: async (params) => {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a research assistant for a plumbing and sewer services company in Chicago, IL. 
Your job is to provide accurate, current market information when asked.

RULES:
- Provide specific prices, product names, part numbers, and specifications when available.
- Include supplier names (Home Depot, Lowe's, Ferguson, Supply House, etc.) when relevant.
- For pricing, provide realistic current market ranges. Cite typical retail sources.
- For code/regulations, reference the specific Chicago or Illinois codes.
- Format your response as structured data with clear categories.
- Be specific and actionable — this data will be used for real business estimates and quotes.
- Always note that prices may vary by location and should be verified with suppliers.`
          },
          {
            role: "user",
            content: params.query,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const answer = completion.choices[0]?.message?.content || "No results found.";
      return {
        query: params.query,
        answer,
        source: "AI-powered market research (prices should be verified with local suppliers)",
      };
    } catch (error: any) {
      return { error: `Web search failed: ${error.message}` };
    }
  },
});

registerTool({
  name: "web_fetch",
  description: "Fetch the content of a specific web page URL to get detailed product info, pricing, or specifications from supplier websites.",
  requiredRole: "dispatcher",
  type: "read",
  parameters: z.object({
    url: z.string().describe("Full HTTPS URL to fetch"),
  }),
  execute: async (params) => {
    try {
      const response = await fetch(params.url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });

      if (!response.ok) {
        return { error: `Failed to fetch URL: ${response.status}` };
      }

      const html = await response.text();
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      return { url: params.url, content: textContent };
    } catch (error: any) {
      return { error: `Failed to fetch page: ${error.message}` };
    }
  },
});

function getToolsForRole(role: string): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  toolRegistry.forEach((tool) => {
    if (role === "admin" || tool.requiredRole === "dispatcher") {
      tools.push(tool);
    }
  });
  return tools;
}

function buildSystemPrompt(role: string): string {
  const tools = getToolsForRole(role);
  const toolDescriptions = tools.map((t) => {
    const paramSchema = t.parameters instanceof z.ZodObject
      ? Object.keys((t.parameters as z.ZodObject<any>).shape).join(", ")
      : "none";
    return `- ${t.name} (${t.type}): ${t.description} [params: ${paramSchema}]`;
  }).join("\n");

  return `You are an AI assistant for Emergency Chicago Sewer Experts CRM. You help dispatchers and admins manage leads, jobs, technicians, quotes, scheduling, payroll, and permits.

CRITICAL RULES:
1. You NEVER auto-execute write operations. You always PROPOSE actions and wait for approval.
2. For read operations, you can execute them directly to gather information.
3. When you need to make changes, return them as proposed_actions in your response.
4. Be concise and professional. Use plain language.
5. When proposing actions, explain what each action will do and why.
6. For payroll processing, always show the date range and estimated number of employees that will be affected before proposing the action. Mark payroll actions as "high" risk since they involve financial calculations.
7. For permit operations, explain which permits will be detected/filed and for which jobs.

FOLLOW-UP ASSISTANT:
- Use get_stale_quotes to find open quotes that haven't been accepted. Filter by urgency (low/medium/high/critical).
- Use get_unconverted_leads to find leads that haven't become jobs yet. Filter by urgency or status.
- When a user asks to follow up with customers, first use the read tools to identify who needs follow-up.
- Use generate_followup_message to create a personalized SMS or email for a specific customer. Always review the generated message before proposing to send it.
- For sending, propose send_followup_sms or send_followup_email as write actions. Always include the leadId when available.
- Prioritize critical and high urgency items first - these are customers who haven't been contacted in 7+ days.
- When the user asks "who needs follow-up?" or "show me stale quotes", use the read tools to gather data and present a summary with actionable recommendations.

IN-APP MESSAGING:
- You have full access to the in-app messaging system. Use get_chat_threads to view active threads, filtered by jobId, leadId, visibility, or status.
- Use get_thread_messages to read conversation history in any thread.
- Use send_chat_message to send messages. You can target a specific threadId, or provide a jobId or leadId to auto-find or create the right thread.
- Set audience to "internal" for staff-only discussions, or "customer_visible" for messages the customer will see.
- When sending customer-facing messages, be professional and friendly. Use the company name "Emergency Chicago Sewer Experts".
- Job status changes automatically post updates to relevant chat threads, so you don't need to manually notify about status changes.
- When proposing to send a message, always show the user what will be sent and to which audience before executing.

CUSTOMER PROFILES:
- Use get_customer_profile to look up comprehensive customer data by phone number, customer name, or customer ID.
- This returns the full customer history: leads, jobs, quotes, calls, contact attempts, and a summary with counts.
- Always check the customer profile before taking action on a customer to understand their history and current status.
- Use customer profile data to personalize follow-ups and make informed decisions about service recommendations.

WEB SEARCH & EXTERNAL DATA:
- You can search the web for real-time information using web_search. Use this for material pricing, plumbing supply costs, product specifications, Chicago building code requirements, permit regulations, supplier availability, weather conditions, or any data not in the CRM.
- After searching, use web_fetch to get detailed content from a specific page (e.g. a supplier's product page or a pricing table).
- When the user asks about pricing for materials (PVC pipe, fittings, pumps, etc.), search for current market prices and present them clearly with sources.
- Always cite your sources when presenting external data so the user knows where the information came from.
- Web search is a read operation — you can use it freely without user approval.

CALENDAR & SCHEDULING:
- You have full access to the calendar. Use get_todays_schedule to quickly see today's workload.
- Use get_calendar_schedule with a date range to view any period on the calendar.
- Use check_technician_availability to find open time slots before scheduling.
- When scheduling from a call recording or customer intake, use create_and_schedule_job to create and schedule in one step.
- Use reschedule_job to move jobs to different dates/times, always include a reason.
- When scheduling, always check technician availability first to avoid double-booking.
- Use 24-hour format for times (e.g., "09:00", "14:30") and ISO format for dates (e.g., "2026-02-15").
- For estimates/inspections, schedule 1-2 hour windows. For full jobs, schedule 2-4 hour windows depending on service type.
- If a customer from a call recording wants to schedule, extract their preferred date/time, check availability, then propose creating and scheduling the job.

Available tools:
${toolDescriptions}

When you want to propose write actions, include them in your response as JSON in this exact format:
<PROPOSED_ACTIONS>
[{"toolName": "tool_name", "parameters": {...}, "description": "What this does", "risk": "low|medium|high"}]
</PROPOSED_ACTIONS>

For read operations you need to perform, include them as:
<READ_ACTIONS>
[{"toolName": "tool_name", "parameters": {...}}]
</READ_ACTIONS>

Current user role: ${role}
Always respond helpfully and propose concrete actions when the user asks you to do something.`;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generatePlan(
  userMessage: string,
  role: string,
  conversationHistory: ChatMessage[] = []
): Promise<PlanResponse> {
  const systemPrompt = buildSystemPrompt(role);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const readActions: { toolName: string; parameters: any }[] = [];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 2048,
    temperature: 0.3,
  });

  const responseText = completion.choices[0]?.message?.content || "";

  const readMatch = responseText.match(/<READ_ACTIONS>([\s\S]*?)<\/READ_ACTIONS>/);
  let contextData: Record<string, any> = {};

  if (readMatch) {
    try {
      const reads = JSON.parse(readMatch[1]);
      for (const read of reads) {
        const tool = toolRegistry.get(read.toolName);
        if (tool && tool.type === "read") {
          const isAllowed = role === "admin" || tool.requiredRole === "dispatcher";
          if (isAllowed) {
            try {
              const result = await tool.execute(read.parameters || {});
              contextData[read.toolName] = result;
            } catch (e: any) {
              contextData[read.toolName] = { error: e.message };
            }
          }
        }
      }
    } catch {}
  }

  let proposedActions: ProposedAction[] = [];
  const proposedMatch = responseText.match(/<PROPOSED_ACTIONS>([\s\S]*?)<\/PROPOSED_ACTIONS>/);
  if (proposedMatch) {
    try {
      const parsed = JSON.parse(proposedMatch[1]);
      proposedActions = parsed.map((a: any) => ({
        id: nanoid(10),
        toolName: a.toolName,
        description: a.description || "",
        parameters: a.parameters || {},
        risk: a.risk || "low",
      }));
    } catch {}
  }

  let cleanMessage = responseText
    .replace(/<READ_ACTIONS>[\s\S]*?<\/READ_ACTIONS>/g, "")
    .replace(/<PROPOSED_ACTIONS>[\s\S]*?<\/PROPOSED_ACTIONS>/g, "")
    .trim();

  if (Object.keys(contextData).length > 0 && !proposedActions.length) {
    const followUp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: userMessage },
        { role: "assistant", content: responseText },
        {
          role: "system",
          content: `Here is the data from read operations:\n${JSON.stringify(contextData, null, 2)}\n\nNow provide a helpful summary to the user based on this data. If write actions are needed, include them as <PROPOSED_ACTIONS>. Do NOT include <READ_ACTIONS> again.`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    });

    const followUpText = followUp.choices[0]?.message?.content || "";
    const followUpProposed = followUpText.match(/<PROPOSED_ACTIONS>([\s\S]*?)<\/PROPOSED_ACTIONS>/);
    if (followUpProposed) {
      try {
        const parsed = JSON.parse(followUpProposed[1]);
        proposedActions = parsed.map((a: any) => ({
          id: nanoid(10),
          toolName: a.toolName,
          description: a.description || "",
          parameters: a.parameters || {},
          risk: a.risk || "low",
        }));
      } catch {}
    }

    cleanMessage = followUpText
      .replace(/<READ_ACTIONS>[\s\S]*?<\/READ_ACTIONS>/g, "")
      .replace(/<PROPOSED_ACTIONS>[\s\S]*?<\/PROPOSED_ACTIONS>/g, "")
      .trim();
  }

  return {
    message: cleanMessage,
    actions: proposedActions,
    context: Object.keys(contextData).length > 0 ? contextData : undefined,
  };
}

export async function executeAction(
  action: ProposedAction,
  role: string,
  userId: string
): Promise<ExecuteResponse> {
  const tool = toolRegistry.get(action.toolName);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${action.toolName}`, summary: "Tool not found" };
  }

  if (tool.type !== "write") {
    return { success: false, error: "Only write actions require execution approval", summary: "Invalid action type" };
  }

  const isAllowed = role === "admin" || tool.requiredRole === "dispatcher";
  if (!isAllowed) {
    return { success: false, error: "Insufficient permissions", summary: "Access denied" };
  }

  try {
    const validatedParams = tool.parameters.parse(action.parameters);
    const result = await tool.execute(validatedParams);

    try {
      if (action.toolName.includes("job") || action.toolName.includes("Job")) {
        const jobId = validatedParams.jobId || validatedParams.id || (result && result.id);
        if (jobId) {
          await storage.createJobTimelineEvent({
            jobId,
            type: "ai_copilot",
            title: `AI Copilot: ${action.description}`,
            description: `Executed by user ${userId} via AI Copilot`,
          } as any);
        }
      }
    } catch {}

    return {
      success: true,
      result,
      summary: `Successfully executed: ${action.description}`,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message,
      summary: `Failed to execute: ${action.description}`,
    };
  }
}

export function getAvailableTools(role: string) {
  return getToolsForRole(role).map((t) => ({
    name: t.name,
    description: t.description,
    type: t.type,
    requiredRole: t.requiredRole,
  }));
}
