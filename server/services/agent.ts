import OpenAI from "openai";
import { storage } from "../storage";
import { db } from "../db";
import { payrollPeriods, payrollRecords } from "@shared/schema";
import { calculateTaxes } from "../taxCalculation";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

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
  description: "Schedule a job by setting its scheduled date and time.",
  requiredRole: "dispatcher",
  type: "write",
  parameters: z.object({
    jobId: z.string(),
    scheduledDate: z.string(),
    scheduledTime: z.string().optional(),
  }),
  execute: async (params) => {
    return storage.updateJob(params.jobId, {
      scheduledDate: new Date(params.scheduledDate),
      scheduledTimeStart: params.scheduledTime || null,
      status: "scheduled",
    });
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
