import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = ["admin", "dispatcher", "technician", "salesperson"] as const;
export type UserRole = typeof userRoles[number];

// Users table with role
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("technician"),
  fullName: text("full_name"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  fullName: true,
  phone: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Technician classifications
export const technicianClassifications = ["senior", "junior", "digger"] as const;
export type TechnicianClassification = typeof technicianClassifications[number];

// Technicians table (extends user with tech-specific data)
export const technicians = pgTable("technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  status: text("status").notNull().default("available"), // available, busy, off_duty, on_break
  currentJobId: varchar("current_job_id"),
  skillLevel: text("skill_level").default("standard"), // junior, standard, senior (legacy)
  classification: text("classification").default("junior"), // senior, junior, digger
  approvedJobTypes: text("approved_job_types").array(), // array of service types tech can work
  commissionRate: decimal("commission_rate").default("0.10"), // default 10% commission
  hourlyRate: decimal("hourly_rate").default("25.00"), // hourly pay rate
  emergencyRate: decimal("emergency_rate").default("1.5"), // multiplier for emergency hours
  maxDailyJobs: integer("max_daily_jobs").default(8),
  completedJobsToday: integer("completed_jobs_today").default(0),
  lastLocationLat: decimal("last_location_lat"),
  lastLocationLng: decimal("last_location_lng"),
  lastLocationUpdate: timestamp("last_location_update"),
});

export const insertTechnicianSchema = createInsertSchema(technicians).omit({ id: true });
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;

// Salespersons table (similar to technicians but for sales role with commission tracking)
export const salespersons = pgTable("salespersons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  status: text("status").notNull().default("available"), // available, busy, off_duty, on_break
  commissionRate: decimal("commission_rate").default("0.15"), // default 15% of NET profit
  hourlyRate: decimal("hourly_rate").default("20.00"), // base hourly rate if applicable
  maxDailyLeads: integer("max_daily_leads").default(20),
  handledLeadsToday: integer("handled_leads_today").default(0),
  lastLocationLat: decimal("last_location_lat"),
  lastLocationLng: decimal("last_location_lng"),
  lastLocationUpdate: timestamp("last_location_update"),
  twilioRoutingPriority: integer("twilio_routing_priority").default(1), // lower = higher priority (sales first)
  coverageZones: text("coverage_zones").array(), // zip codes or areas covered
  specializations: text("specializations").array(), // types of sales they specialize in
  isActive: boolean("is_active").notNull().default(true),
});

export const insertSalespersonSchema = createInsertSchema(salespersons).omit({ id: true });
export type InsertSalesperson = z.infer<typeof insertSalespersonSchema>;
export type Salesperson = typeof salespersons.$inferSelect;

// Sales commissions tracking (calculated from NET profit)
export const salesCommissions = pgTable("sales_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salespersonId: varchar("salesperson_id").notNull().references(() => salespersons.id),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  leadId: varchar("lead_id").references(() => leads.id),
  jobRevenue: decimal("job_revenue"), // total revenue from job
  laborCost: decimal("labor_cost"),
  materialsCost: decimal("materials_cost"),
  travelExpense: decimal("travel_expense"),
  equipmentCost: decimal("equipment_cost"),
  otherExpenses: decimal("other_expenses"),
  totalCosts: decimal("total_costs"), // sum of all costs
  netProfit: decimal("net_profit"), // revenue - total costs
  commissionRate: decimal("commission_rate").notNull(), // rate at time of calculation
  commissionAmount: decimal("commission_amount").notNull(), // netProfit * commissionRate
  status: text("status").notNull().default("pending"), // pending, approved, paid
  calculatedAt: timestamp("calculated_at").notNull().default(sql`now()`),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"),
  paidAt: timestamp("paid_at"),
  payrollPeriod: text("payroll_period"), // e.g., "2024-01-15" for pay period reference
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertSalesCommissionSchema = createInsertSchema(salesCommissions).omit({ id: true, createdAt: true, calculatedAt: true });
export type InsertSalesCommission = z.infer<typeof insertSalesCommissionSchema>;
export type SalesCommission = typeof salesCommissions.$inferSelect;

// Salesperson location history for GPS tracking
export const salespersonLocations = pgTable("salesperson_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salespersonId: varchar("salesperson_id").notNull().references(() => salespersons.id),
  latitude: decimal("latitude").notNull(),
  longitude: decimal("longitude").notNull(),
  accuracy: decimal("accuracy"), // meters
  speed: decimal("speed"), // m/s
  heading: decimal("heading"), // degrees
  altitude: decimal("altitude"),
  batteryLevel: integer("battery_level"), // percentage
  isMoving: boolean("is_moving"),
  leadId: varchar("lead_id").references(() => leads.id), // current lead if any
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertSalespersonLocationSchema = createInsertSchema(salespersonLocations).omit({ id: true, createdAt: true });
export type InsertSalespersonLocation = z.infer<typeof insertSalespersonLocationSchema>;
export type SalespersonLocation = typeof salespersonLocations.$inferSelect;

// Lead sources
export const leadSources = ["eLocal", "Networx", "Angi", "HomeAdvisor", "Thumbtack", "Inquirly", "Direct", "Referral", "Website"] as const;
export type LeadSource = typeof leadSources[number];

// Lead statuses
export const leadStatuses = ["new", "contacted", "qualified", "scheduled", "converted", "lost", "duplicate", "spam"] as const;
export type LeadStatus = typeof leadStatuses[number];

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // eLocal, Networx, Angi, etc.
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  address: text("address"),
  city: text("city"),
  zipCode: text("zip_code"),
  serviceType: text("service_type"), // sewer_main, drain_cleaning, plumbing, etc.
  description: text("description"),
  status: text("status").notNull().default("new"),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  cost: decimal("cost"), // cost paid to lead source
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  convertedAt: timestamp("converted_at"),
  assignedTo: varchar("assigned_to"),
  contactedAt: timestamp("contacted_at"),
  slaDeadline: timestamp("sla_deadline"),
  slaBreach: boolean("sla_breach").default(false),
  leadScore: integer("lead_score").default(50),
  isDuplicate: boolean("is_duplicate").default(false),
  duplicateOfId: varchar("duplicate_of_id"),
  revenue: decimal("revenue"),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Calls table
export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  jobId: varchar("job_id"),
  callerPhone: text("caller_phone").notNull(),
  callerName: text("caller_name"),
  direction: text("direction").notNull().default("inbound"), // inbound, outbound
  status: text("status").notNull().default("completed"), // ringing, answered, completed, missed, voicemail
  duration: integer("duration"), // in seconds
  recordingUrl: text("recording_url"),
  notes: text("notes"),
  handledBy: varchar("handled_by"), // dispatcher/user id
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertCallSchema = createInsertSchema(calls).omit({ id: true, createdAt: true });
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

// Job statuses
export const jobStatuses = ["pending", "assigned", "confirmed", "en_route", "on_site", "in_progress", "completed", "cancelled"] as const;
export type JobStatus = typeof jobStatuses[number];

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  address: text("address").notNull(),
  city: text("city"),
  zipCode: text("zip_code"),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  serviceType: text("service_type").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").default("normal"),
  scheduledDate: timestamp("scheduled_date"),
  scheduledTimeStart: text("scheduled_time_start"), // e.g. "09:00"
  scheduledTimeEnd: text("scheduled_time_end"), // e.g. "11:00"
  estimatedDuration: integer("estimated_duration"), // minutes
  assignedTechnicianId: varchar("assigned_technician_id").references(() => technicians.id),
  assignedSalespersonId: varchar("assigned_salesperson_id").references(() => salespersons.id), // salesperson who originated/sold this job
  dispatcherId: varchar("dispatcher_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  assignedAt: timestamp("assigned_at"),
  confirmedAt: timestamp("confirmed_at"),
  enRouteAt: timestamp("en_route_at"),
  arrivedAt: timestamp("arrived_at"),
  arrivalLat: decimal("arrival_lat"),
  arrivalLng: decimal("arrival_lng"),
  arrivalVerified: boolean("arrival_verified"),
  arrivalDistance: decimal("arrival_distance"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Labor tracking
  laborHours: decimal("labor_hours"), // actual hours worked
  laborRate: decimal("labor_rate"), // hourly rate used for this job
  laborCost: decimal("labor_cost"), // laborHours * laborRate
  // Expense tracking
  materialsCost: decimal("materials_cost"),
  travelExpense: decimal("travel_expense"),
  equipmentCost: decimal("equipment_cost"),
  otherExpenses: decimal("other_expenses"),
  expenseNotes: text("expense_notes"),
  // Revenue and ROI
  totalCost: decimal("total_cost"), // sum of all costs
  totalRevenue: decimal("total_revenue"), // from accepted quote
  profit: decimal("profit"), // totalRevenue - totalCost
  // Cancellation tracking
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by"), // tech ID or admin ID who cancelled
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// Job timeline events (for time markers)
export const jobTimelineEvents = pgTable("job_timeline_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  eventType: text("event_type").notNull(), // created, assigned, confirmed, en_route, arrived, started, quote_sent, completed, note
  description: text("description"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  metadata: text("metadata"), // JSON string for extra data
});

export const insertJobTimelineEventSchema = createInsertSchema(jobTimelineEvents).omit({ id: true, createdAt: true });
export type InsertJobTimelineEvent = z.infer<typeof insertJobTimelineEventSchema>;
export type JobTimelineEvent = typeof jobTimelineEvents.$inferSelect;

// Quotes table
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  technicianId: varchar("technician_id").references(() => technicians.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  address: text("address"),
  lineItems: text("line_items"), // JSON string of line items
  laborEntries: text("labor_entries"), // JSON string of labor entries for payroll
  subtotal: decimal("subtotal"),
  laborTotal: decimal("labor_total").default("0"), // total labor cost
  taxRate: decimal("tax_rate").default("0"),
  taxAmount: decimal("tax_amount").default("0"),
  total: decimal("total"),
  status: text("status").notNull().default("draft"), // draft, sent, viewed, accepted, declined, expired
  notes: text("notes"),
  publicToken: varchar("public_token").unique(), // Token for public quote viewing link
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  expiresAt: timestamp("expires_at"),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Notifications table
export const notificationTypes = ["job_assigned", "job_confirmed", "job_arrived", "job_completed", "quote_sent", "quote_accepted", "message", "alert"] as const;
export type NotificationType = typeof notificationTypes[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  jobId: varchar("job_id"),
  isRead: boolean("is_read").notNull().default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  readAt: timestamp("read_at"),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Technician shift logs (track availability hours)
export const shiftLogs = pgTable("shift_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  technicianId: varchar("technician_id").notNull().references(() => technicians.id),
  action: text("action").notNull(), // clock_in, clock_out
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  notes: text("notes"),
});

export const insertShiftLogSchema = createInsertSchema(shiftLogs).omit({ id: true, timestamp: true });
export type InsertShiftLog = z.infer<typeof insertShiftLogSchema>;
export type ShiftLog = typeof shiftLogs.$inferSelect;

// Service types for the plumbing business
export const serviceTypes = [
  "Sewer Main - Clear",
  "Sewer Main - Repair",
  "Sewer Main - Replace",
  "Drain Cleaning",
  "Water Heater - Repair",
  "Water Heater - Replace",
  "Toilet Repair",
  "Faucet Repair",
  "Pipe Repair",
  "Pipe Replacement",
  "Sump Pump",
  "Ejector Pump",
  "Camera Inspection",
  "Hydro Jetting",
  "Other"
] as const;
export type ServiceType = typeof serviceTypes[number];

// Quote Templates for pre-built packages
export const quoteTemplates = pgTable("quote_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  serviceType: text("service_type"),
  lineItems: text("line_items").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertQuoteTemplateSchema = createInsertSchema(quoteTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuoteTemplate = z.infer<typeof insertQuoteTemplateSchema>;
export type QuoteTemplate = typeof quoteTemplates.$inferSelect;

// Customer interactions for timeline view
export const customerInteractions = pgTable("customer_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  jobId: varchar("job_id").references(() => jobs.id),
  customerPhone: text("customer_phone").notNull(),
  type: text("type").notNull(),
  direction: text("direction"),
  content: text("content"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertCustomerInteractionSchema = createInsertSchema(customerInteractions).omit({ id: true, createdAt: true });
export type InsertCustomerInteraction = z.infer<typeof insertCustomerInteractionSchema>;
export type CustomerInteraction = typeof customerInteractions.$inferSelect;

// SLA Settings
export const slaSettings = pgTable("sla_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  priority: text("priority").notNull(),
  responseTimeMinutes: integer("response_time_minutes").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertSlaSettingSchema = createInsertSchema(slaSettings).omit({ id: true });
export type InsertSlaSetting = z.infer<typeof insertSlaSettingSchema>;
export type SlaSetting = typeof slaSettings.$inferSelect;

// Contact attempts for tracking outreach
export const contactAttempts = pgTable("contact_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  jobId: varchar("job_id").references(() => jobs.id),
  type: text("type").notNull(), // email, sms, call, voicemail
  direction: text("direction").notNull().default("outbound"), // inbound, outbound
  status: text("status").notNull().default("sent"), // pending, sent, delivered, opened, clicked, bounced, failed
  subject: text("subject"),
  content: text("content"),
  templateId: text("template_id"),
  externalId: text("external_id"), // message ID from Resend/Twilio
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  sentBy: varchar("sent_by"), // user ID or 'automation'
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  failedReason: text("failed_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertContactAttemptSchema = createInsertSchema(contactAttempts).omit({ id: true, createdAt: true });
export type InsertContactAttempt = z.infer<typeof insertContactAttemptSchema>;
export type ContactAttempt = typeof contactAttempts.$inferSelect;

// Automation events for tracking workflow actions
export const automationEvents = pgTable("automation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // lead_created, lead_contacted, job_scheduled, quote_sent, etc.
  entityType: text("entity_type").notNull(), // lead, job, quote, technician
  entityId: varchar("entity_id").notNull(),
  triggerSource: text("trigger_source").notNull(), // webhook, manual, automation, schedule
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  actionsTaken: text("actions_taken"), // JSON array of actions
  errorMessage: text("error_message"),
  metadata: text("metadata"), // JSON string for extra data
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertAutomationEventSchema = createInsertSchema(automationEvents).omit({ id: true, createdAt: true });
export type InsertAutomationEvent = z.infer<typeof insertAutomationEventSchema>;
export type AutomationEvent = typeof automationEvents.$inferSelect;

// Automation settings for configuring triggers and actions
export const automationSettings = pgTable("automation_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(), // new_lead, lead_uncontacted, job_scheduled, quote_sent
  actionType: text("action_type").notNull(), // send_email, send_sms, create_task, notify_user
  isEnabled: boolean("is_enabled").notNull().default(true),
  delayMinutes: integer("delay_minutes").default(0),
  conditions: text("conditions"), // JSON conditions
  actionConfig: text("action_config"), // JSON action configuration
  emailSubject: text("email_subject"),
  emailTemplate: text("email_template"),
  smsTemplate: text("sms_template"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertAutomationSettingSchema = createInsertSchema(automationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutomationSetting = z.infer<typeof insertAutomationSettingSchema>;
export type AutomationSetting = typeof automationSettings.$inferSelect;

// Webhook logs for debugging integrations
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // zapier, elocal, networx, angi, etc.
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  headers: text("headers"), // JSON
  payload: text("payload"), // JSON
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  processingTimeMs: integer("processing_time_ms"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({ id: true, createdAt: true });
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;

// Job attachments (photos, videos, documents)
export const jobAttachments = pgTable("job_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  technicianId: varchar("technician_id").references(() => technicians.id),
  type: text("type").notNull(), // photo, video, document
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"), // bytes
  url: text("url"), // storage URL or base64 data
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  category: text("category"), // before, during, after, damage, parts, signature
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertJobAttachmentSchema = createInsertSchema(jobAttachments).omit({ id: true, createdAt: true });
export type InsertJobAttachment = z.infer<typeof insertJobAttachmentSchema>;
export type JobAttachment = typeof jobAttachments.$inferSelect;

// Job checklists for technicians
export const jobChecklists = pgTable("job_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  technicianId: varchar("technician_id").references(() => technicians.id),
  title: text("title").notNull(),
  items: text("items"), // JSON array of {id, text, checked, notes}
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertJobChecklistSchema = createInsertSchema(jobChecklists).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobChecklist = z.infer<typeof insertJobChecklistSchema>;
export type JobChecklist = typeof jobChecklists.$inferSelect;

// Technician location history for GPS tracking
export const technicianLocations = pgTable("technician_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  technicianId: varchar("technician_id").notNull().references(() => technicians.id),
  latitude: decimal("latitude").notNull(),
  longitude: decimal("longitude").notNull(),
  accuracy: decimal("accuracy"), // meters
  speed: decimal("speed"), // m/s
  heading: decimal("heading"), // degrees
  altitude: decimal("altitude"),
  batteryLevel: integer("battery_level"), // percentage
  isMoving: boolean("is_moving"),
  jobId: varchar("job_id").references(() => jobs.id), // current job if any
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertTechnicianLocationSchema = createInsertSchema(technicianLocations).omit({ id: true, createdAt: true });
export type InsertTechnicianLocation = z.infer<typeof insertTechnicianLocationSchema>;
export type TechnicianLocation = typeof technicianLocations.$inferSelect;

// Checklist templates (pre-defined checklists for different service types)
export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  serviceType: text("service_type"), // optional - applies to specific service types
  items: text("items"), // JSON array of {id, text, required}
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({ id: true, createdAt: true });
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
