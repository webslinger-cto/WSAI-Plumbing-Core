import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = ["admin", "dispatcher", "technician"] as const;
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
