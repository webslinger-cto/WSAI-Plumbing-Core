// Automation service for Chicago Sewer Experts CRM
// Handles automatic lead contact, estimate confirmation, and job tracking

import { storage } from "../storage";
import { sendEmail, generateLeadAcknowledgmentEmail, generateAppointmentReminderEmail } from "./email";
import type { Lead, Job, Technician } from "@shared/schema";

// Contact a lead automatically via email when they come in
export async function autoContactLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }

    if (!lead.customerEmail) {
      console.log(`Lead ${leadId} has no email address, skipping auto-contact`);
      return { success: false, error: "No email address provided" };
    }

    // Generate acknowledgment email
    const emailContent = generateLeadAcknowledgmentEmail(
      lead.customerName,
      lead.serviceType || "sewer service"
    );

    // Send email
    const result = await sendEmail({
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
      status: result.success ? "sent" : "failed",
      subject: emailContent.subject,
      content: emailContent.text,
      recipientEmail: lead.customerEmail,
      sentAt: result.success ? new Date() : null,
      externalId: result.messageId || null,
      failedReason: result.error || null,
    });

    // Update lead status to contacted
    if (result.success && lead.status === "new") {
      await storage.updateLead(leadId, { status: "contacted" });
    }

    return result;
  } catch (error) {
    console.error("Auto-contact error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Create a job from a lead when customer confirms they want an estimate
export async function createJobFromLead(
  leadId: string, 
  scheduledDate?: Date,
  scheduledTimeStart?: string,
  scheduledTimeEnd?: string
): Promise<{ success: boolean; job?: Job; error?: string }> {
  try {
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }

    // Create job from lead data
    const job = await storage.createJob({
      leadId: lead.id,
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      customerEmail: lead.customerEmail || undefined,
      address: lead.address || "Address pending",
      city: lead.city || undefined,
      zipCode: lead.zipCode || undefined,
      serviceType: lead.serviceType || "General Service",
      description: lead.description || undefined,
      status: "pending",
      priority: lead.priority || "normal",
      scheduledDate: scheduledDate || undefined,
      scheduledTimeStart: scheduledTimeStart || undefined,
      scheduledTimeEnd: scheduledTimeEnd || undefined,
    });

    // Update lead status to estimate_scheduled
    await storage.updateLead(leadId, { status: "estimate_scheduled" });

    // Log timeline event
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "created",
      description: `Job created from lead. Customer confirmed they want an estimate.`,
    });

    return { success: true, job };
  } catch (error) {
    console.error("Create job from lead error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Auto-assign a technician based on availability, skills, and location
export async function autoAssignTechnician(jobId: string): Promise<{ 
  success: boolean; 
  technician?: Technician; 
  error?: string 
}> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Get available technicians
    const technicians = await storage.getTechnicians();
    const availableTechs = technicians.filter(t => 
      t.status === "available" && 
      (t.approvedJobTypes === null || t.approvedJobTypes?.includes(job.serviceType))
    );

    if (availableTechs.length === 0) {
      return { success: false, error: "No available technicians" };
    }

    // Simple assignment: pick the first available tech who hasn't hit daily limit
    const assignedTech = availableTechs.find(t => 
      (t.completedJobsToday || 0) < (t.maxDailyJobs || 8)
    ) || availableTechs[0];

    // Assign technician to job
    await storage.updateJob(jobId, {
      assignedTechnicianId: assignedTech.id,
      status: "assigned",
      assignedAt: new Date(),
      laborRate: assignedTech.hourlyRate || "25.00",
    });

    // Log timeline event
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "assigned",
      description: `Auto-assigned to ${assignedTech.fullName}`,
    });

    return { success: true, technician: assignedTech };
  } catch (error) {
    console.error("Auto-assign error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Cancel a job with full tracking
export async function cancelJob(
  jobId: string, 
  cancelledBy: string, 
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Update job with cancellation info - all expense/labor data is preserved
    await storage.updateJob(jobId, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: cancelledBy,
      cancellationReason: reason,
    });

    // Log timeline event
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "cancelled",
      description: `Job cancelled. Reason: ${reason}`,
      createdBy: cancelledBy,
    });

    // Free up technician if one was assigned
    if (job.assignedTechnicianId) {
      const tech = await storage.getTechnician(job.assignedTechnicianId);
      if (tech && tech.currentJobId === jobId) {
        await storage.updateTechnician(job.assignedTechnicianId, {
          status: "available",
          currentJobId: null,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Cancel job error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Update job labor and expenses (for ROI tracking)
export async function updateJobCosts(
  jobId: string,
  costs: {
    laborHours?: string;
    materialsCost?: string;
    travelExpense?: string;
    equipmentCost?: string;
    otherExpenses?: string;
    expenseNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Calculate labor cost
    const laborHours = parseFloat(costs.laborHours || job.laborHours || "0");
    const laborRate = parseFloat(job.laborRate || "25.00");
    const laborCost = laborHours * laborRate;

    // Calculate total costs
    const materialsCost = parseFloat(costs.materialsCost || job.materialsCost || "0");
    const travelExpense = parseFloat(costs.travelExpense || job.travelExpense || "0");
    const equipmentCost = parseFloat(costs.equipmentCost || job.equipmentCost || "0");
    const otherExpenses = parseFloat(costs.otherExpenses || job.otherExpenses || "0");
    const totalCost = laborCost + materialsCost + travelExpense + equipmentCost + otherExpenses;

    // Calculate profit if we have revenue
    const totalRevenue = parseFloat(job.totalRevenue || "0");
    const profit = totalRevenue - totalCost;

    await storage.updateJob(jobId, {
      laborHours: costs.laborHours || job.laborHours,
      laborCost: laborCost.toFixed(2),
      materialsCost: costs.materialsCost || job.materialsCost,
      travelExpense: costs.travelExpense || job.travelExpense,
      equipmentCost: costs.equipmentCost || job.equipmentCost,
      otherExpenses: costs.otherExpenses || job.otherExpenses,
      expenseNotes: costs.expenseNotes || job.expenseNotes,
      totalCost: totalCost.toFixed(2),
      profit: profit.toFixed(2),
    });

    return { success: true };
  } catch (error) {
    console.error("Update job costs error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Complete a job with final cost calculation
export async function completeJob(
  jobId: string,
  finalData: {
    laborHours?: string;
    materialsCost?: string;
    travelExpense?: string;
    equipmentCost?: string;
    otherExpenses?: string;
    expenseNotes?: string;
    totalRevenue?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Update costs first
    if (Object.keys(finalData).length > 0) {
      await updateJobCosts(jobId, finalData);
    }

    // Set revenue if provided
    if (finalData.totalRevenue) {
      const totalCost = parseFloat(job.totalCost || "0");
      const totalRevenue = parseFloat(finalData.totalRevenue);
      const profit = totalRevenue - totalCost;

      await storage.updateJob(jobId, {
        totalRevenue: finalData.totalRevenue,
        profit: profit.toFixed(2),
      });
    }

    // Mark job as completed
    await storage.updateJob(jobId, {
      status: "completed",
      completedAt: new Date(),
    });

    // Log timeline event
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "completed",
      description: "Job completed",
    });

    // Update technician
    if (job.assignedTechnicianId) {
      const tech = await storage.getTechnician(job.assignedTechnicianId);
      if (tech) {
        await storage.updateTechnician(job.assignedTechnicianId, {
          status: "available",
          currentJobId: null,
          completedJobsToday: (tech.completedJobsToday || 0) + 1,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Complete job error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Send appointment reminder email
export async function sendAppointmentReminder(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (!job.customerEmail) {
      return { success: false, error: "No customer email" };
    }

    // Get technician name
    let techName = "Your Technician";
    if (job.assignedTechnicianId) {
      const tech = await storage.getTechnician(job.assignedTechnicianId);
      if (tech) {
        techName = tech.fullName;
      }
    }

    // Format date and time
    const dateStr = job.scheduledDate 
      ? new Date(job.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : "To be confirmed";
    const timeStr = job.scheduledTimeStart 
      ? `${job.scheduledTimeStart}${job.scheduledTimeEnd ? ` - ${job.scheduledTimeEnd}` : ""}`
      : "To be confirmed";

    const emailContent = generateAppointmentReminderEmail(
      job.customerName,
      dateStr,
      timeStr,
      techName,
      job.address
    );

    const result = await sendEmail({
      to: job.customerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    // Log contact attempt
    await storage.createContactAttempt({
      jobId: job.id,
      type: "email",
      direction: "outbound",
      status: result.success ? "sent" : "failed",
      subject: emailContent.subject,
      content: emailContent.text,
      recipientEmail: job.customerEmail,
      sentAt: result.success ? new Date() : null,
      externalId: result.messageId || null,
      failedReason: result.error || null,
    });

    return result;
  } catch (error) {
    console.error("Send reminder error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Calculate ROI for a job
export function calculateJobROI(job: Job): {
  totalRevenue: number;
  totalCost: number;
  laborCost: number;
  materialsCost: number;
  travelExpense: number;
  equipmentCost: number;
  otherExpenses: number;
  profit: number;
  profitMargin: number;
} {
  const totalRevenue = parseFloat(job.totalRevenue || "0");
  const laborCost = parseFloat(job.laborCost || "0");
  const materialsCost = parseFloat(job.materialsCost || "0");
  const travelExpense = parseFloat(job.travelExpense || "0");
  const equipmentCost = parseFloat(job.equipmentCost || "0");
  const otherExpenses = parseFloat(job.otherExpenses || "0");
  const totalCost = laborCost + materialsCost + travelExpense + equipmentCost + otherExpenses;
  const profit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    laborCost,
    materialsCost,
    travelExpense,
    equipmentCost,
    otherExpenses,
    profit,
    profitMargin,
  };
}
