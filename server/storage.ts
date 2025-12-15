import {
  type User, type InsertUser,
  type Technician, type InsertTechnician,
  type Lead, type InsertLead,
  type Call, type InsertCall,
  type Job, type InsertJob,
  type JobTimelineEvent, type InsertJobTimelineEvent,
  type Quote, type InsertQuote,
  type Notification, type InsertNotification,
  type ShiftLog, type InsertShiftLog,
  users, technicians, leads, calls, jobs, jobTimelineEvents, quotes, notifications, shiftLogs,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, gte, lte, asc, sql } from "drizzle-orm";

export interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalLeads: number;
    conversionRate: number;
    netProfit: number;
    revenueChange: number;
    leadsChange: number;
    conversionChange: number;
    profitChange: number;
  };
  sourceComparison: Array<{
    source: string;
    leads: number;
    cost: number;
    converted: number;
    costPerLead: number;
    avgResponse: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    leads: number;
    expenses: number;
    profit: number;
  }>;
  serviceBreakdown: Array<{
    name: string;
    value: number;
    revenue: number;
    avgTicket: number;
    color: string;
  }>;
  techPerformance: Array<{
    name: string;
    jobs: number;
    revenue: number;
    rate: number;
    verified: number;
    avgTime: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

export interface IStorage {
  // Initialization (optional - used by DatabaseStorage to seed data)
  initialize?(): Promise<void>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Technicians
  getTechnician(id: string): Promise<Technician | undefined>;
  getTechnicianByUserId(userId: string): Promise<Technician | undefined>;
  getTechnicians(): Promise<Technician[]>;
  getAvailableTechnicians(): Promise<Technician[]>;
  createTechnician(tech: InsertTechnician): Promise<Technician>;
  updateTechnician(id: string, updates: Partial<Technician>): Promise<Technician | undefined>;

  // Leads
  getLead(id: string): Promise<Lead | undefined>;
  getLeads(): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;

  // Calls
  getCall(id: string): Promise<Call | undefined>;
  getCalls(): Promise<Call[]>;
  getRecentCalls(limit: number): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;

  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  getJobs(): Promise<Job[]>;
  getJobsByStatus(status: string): Promise<Job[]>;
  getJobsByTechnician(technicianId: string): Promise<Job[]>;
  getPoolJobs(technicianId: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;

  // Job Timeline Events
  getJobTimelineEvents(jobId: string): Promise<JobTimelineEvent[]>;
  createJobTimelineEvent(event: InsertJobTimelineEvent): Promise<JobTimelineEvent>;

  // Quotes
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByJob(jobId: string): Promise<Quote[]>;
  getQuotesByStatus(status: string): Promise<Quote[]>;
  getAllQuotes(): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined>;

  // Notifications
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Analytics
  getAnalytics(timeRange: string): Promise<AnalyticsData>;

  // Shift Logs
  createShiftLog(log: InsertShiftLog): Promise<ShiftLog>;
  getShiftLogsByTechnician(technicianId: string): Promise<ShiftLog[]>;
  getTodayShiftLogs(technicianId: string): Promise<ShiftLog[]>;

  // Reset
  resetJobBoard(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private technicians: Map<string, Technician>;
  private leads: Map<string, Lead>;
  private calls: Map<string, Call>;
  private jobs: Map<string, Job>;
  private jobTimelineEvents: Map<string, JobTimelineEvent>;
  private quotes: Map<string, Quote>;
  private notifications: Map<string, Notification>;
  private shiftLogs: Map<string, ShiftLog>;

  constructor() {
    this.users = new Map();
    this.technicians = new Map();
    this.leads = new Map();
    this.calls = new Map();
    this.jobs = new Map();
    this.jobTimelineEvents = new Map();
    this.quotes = new Map();
    this.notifications = new Map();
    this.shiftLogs = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed users first
    const userData: InsertUser[] = [
      { username: "admin", password: "demo123", role: "admin", fullName: "Admin User" },
      { username: "dispatcher", password: "demo123", role: "dispatcher", fullName: "Dispatch Manager" },
      { username: "mike", password: "demo123", role: "technician", fullName: "Mike Johnson" },
      { username: "carlos", password: "demo123", role: "technician", fullName: "Carlos Rodriguez" },
      { username: "james", password: "demo123", role: "technician", fullName: "James Williams" },
    ];
    
    const userIds = ["user-admin", "user-dispatcher", "user-tech-1", "user-tech-2", "user-tech-3"];
    userData.forEach((u, i) => {
      const id = userIds[i];
      this.users.set(id, {
        id,
        username: u.username,
        password: u.password,
        role: u.role || "technician",
        fullName: u.fullName || null,
        phone: u.phone || null,
        email: u.email || null,
        isActive: true,
      });
    });

    // Seed technicians with consistent IDs
    const techIds = ["tech-1", "tech-2", "tech-3", "tech-4", "tech-5"];
    const techData: (InsertTechnician & { id?: string })[] = [
      { fullName: "Mike Johnson", phone: "(708) 555-0101", email: "mike@chicagosewerexperts.com", status: "available", skillLevel: "senior", userId: "user-tech-1" },
      { fullName: "Carlos Rodriguez", phone: "(708) 555-0102", email: "carlos@chicagosewerexperts.com", status: "available", skillLevel: "senior", userId: "user-tech-2" },
      { fullName: "James Williams", phone: "(708) 555-0103", email: "james@chicagosewerexperts.com", status: "busy", skillLevel: "standard", userId: "user-tech-3" },
      { fullName: "David Martinez", phone: "(708) 555-0104", email: "david@chicagosewerexperts.com", status: "available", skillLevel: "standard" },
      { fullName: "Robert Taylor", phone: "(708) 555-0105", email: "robert@chicagosewerexperts.com", status: "off_duty", skillLevel: "junior" },
    ];
    
    const techClassifications = ["senior", "senior", "junior", "junior", "digger"];
    const allJobTypes = ["Sewer Main - Clear", "Sewer Main - Repair", "Drain Cleaning", "Water Heater - Repair", "Pipe Repair", "Camera Inspection"];
    
    techData.forEach((t, i) => {
      const id = techIds[i];
      this.technicians.set(id, {
        id,
        fullName: t.fullName,
        phone: t.phone,
        email: t.email || null,
        status: t.status || "available",
        skillLevel: t.skillLevel || "standard",
        classification: techClassifications[i] || "junior",
        approvedJobTypes: i < 2 ? allJobTypes : allJobTypes.slice(0, 3),
        commissionRate: i < 2 ? "0.15" : "0.10",
        hourlyRate: i < 2 ? "35.00" : "25.00",
        emergencyRate: "1.5",
        userId: t.userId || null,
        currentJobId: null,
        maxDailyJobs: 8,
        completedJobsToday: 0,
        lastLocationLat: null,
        lastLocationLng: null,
        lastLocationUpdate: null,
      });
    });

    // Seed leads
    const leadData: InsertLead[] = [
      { source: "eLocal", customerName: "Leonard Willis", customerPhone: "(312) 555-1234", address: "123 Main St", city: "Chicago", zipCode: "60601", serviceType: "Sewer Main - Clear", status: "new", priority: "high" },
      { source: "Networx", customerName: "Maria Garcia", customerPhone: "(312) 555-2345", address: "456 Oak Ave", city: "Chicago", zipCode: "60602", serviceType: "Drain Cleaning", status: "qualified", priority: "normal" },
      { source: "Direct", customerName: "Thomas Brown", customerPhone: "(312) 555-3456", address: "789 Elm St", city: "Evanston", zipCode: "60201", serviceType: "Water Heater - Repair", status: "scheduled", priority: "normal" },
      { source: "eLocal", customerName: "Sarah Johnson", customerPhone: "(312) 555-4567", address: "321 Pine Rd", city: "Chicago", zipCode: "60603", serviceType: "Pipe Repair", status: "new", priority: "urgent" },
      { source: "Angi", customerName: "Michael Davis", customerPhone: "(312) 555-5678", address: "654 Cedar Ln", city: "Oak Park", zipCode: "60301", serviceType: "Toilet Repair", status: "contacted", priority: "low" },
    ];
    leadData.forEach(l => this.createLead(l));

    // Seed calls
    const callData: InsertCall[] = [
      { callerPhone: "(312) 555-1234", callerName: "Leonard Willis", direction: "inbound", status: "completed", duration: 180 },
      { callerPhone: "(312) 555-2345", callerName: "Maria Garcia", direction: "inbound", status: "completed", duration: 240 },
      { callerPhone: "(312) 555-9999", direction: "inbound", status: "missed", duration: 0 },
      { callerPhone: "(312) 555-3456", callerName: "Thomas Brown", direction: "outbound", status: "completed", duration: 120 },
    ];
    callData.forEach(c => this.createCall(c));

    // Seed jobs with consistent technician IDs
    const now = new Date();
    const jobData: InsertJob[] = [
      {
        customerName: "Maria Garcia",
        customerPhone: "(312) 555-2345",
        address: "456 Oak Ave",
        city: "Chicago",
        zipCode: "60602",
        serviceType: "Drain Cleaning",
        status: "assigned",
        priority: "normal",
        scheduledDate: now,
        scheduledTimeStart: "09:00",
        scheduledTimeEnd: "11:00",
        assignedTechnicianId: "tech-1", // Mike Johnson
      },
      {
        customerName: "Thomas Brown",
        customerPhone: "(312) 555-3456",
        address: "789 Elm St",
        city: "Evanston",
        zipCode: "60201",
        serviceType: "Water Heater - Repair",
        status: "confirmed",
        priority: "normal",
        scheduledDate: now,
        scheduledTimeStart: "13:00",
        scheduledTimeEnd: "15:00",
        assignedTechnicianId: "tech-1", // Mike Johnson
      },
      {
        customerName: "Sarah Johnson",
        customerPhone: "(312) 555-4567",
        address: "321 Pine Rd",
        city: "Chicago",
        zipCode: "60603",
        serviceType: "Pipe Repair",
        status: "pending",
        priority: "urgent",
        scheduledDate: now,
        scheduledTimeStart: "14:00",
        scheduledTimeEnd: "16:00",
      },
    ];
    jobData.forEach(j => this.createJob(j));

    // Seed demo notification for technician
    this.createNotification({
      userId: "user-tech-1",
      type: "job_assigned",
      title: "New Job Assigned",
      message: "You have been assigned to Drain Cleaning at 456 Oak Ave",
      actionUrl: "/technician",
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role || "technician",
      fullName: insertUser.fullName || null,
      phone: insertUser.phone || null,
      email: insertUser.email || null,
      isActive: true,
    };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Technicians
  async getTechnician(id: string): Promise<Technician | undefined> {
    return this.technicians.get(id);
  }

  async getTechnicianByUserId(userId: string): Promise<Technician | undefined> {
    return Array.from(this.technicians.values()).find(t => t.userId === userId);
  }

  async getTechnicians(): Promise<Technician[]> {
    return Array.from(this.technicians.values());
  }

  async getAvailableTechnicians(): Promise<Technician[]> {
    return Array.from(this.technicians.values()).filter(t => t.status === "available");
  }

  async createTechnician(insertTech: InsertTechnician): Promise<Technician> {
    const id = randomUUID();
    const tech: Technician = {
      id,
      userId: insertTech.userId || null,
      fullName: insertTech.fullName,
      phone: insertTech.phone,
      email: insertTech.email || null,
      status: insertTech.status || "available",
      currentJobId: insertTech.currentJobId || null,
      skillLevel: insertTech.skillLevel || "standard",
      classification: insertTech.classification || "junior",
      approvedJobTypes: insertTech.approvedJobTypes || null,
      commissionRate: insertTech.commissionRate || "0.10",
      hourlyRate: insertTech.hourlyRate || "25.00",
      emergencyRate: insertTech.emergencyRate || "1.5",
      maxDailyJobs: insertTech.maxDailyJobs || 8,
      completedJobsToday: insertTech.completedJobsToday || 0,
      lastLocationLat: insertTech.lastLocationLat || null,
      lastLocationLng: insertTech.lastLocationLng || null,
      lastLocationUpdate: insertTech.lastLocationUpdate || null,
    };
    this.technicians.set(id, tech);
    return tech;
  }

  async updateTechnician(id: string, updates: Partial<Technician>): Promise<Technician | undefined> {
    const tech = this.technicians.get(id);
    if (!tech) return undefined;
    const updated = { ...tech, ...updates };
    this.technicians.set(id, updated);
    return updated;
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(l => l.status === status);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const now = new Date();
    const priority = insertLead.priority || "normal";
    const slaMinutes = priority === "urgent" ? 15 : priority === "high" ? 30 : 60;
    const slaDeadline = new Date(now.getTime() + slaMinutes * 60 * 1000);
    const lead: Lead = {
      id,
      source: insertLead.source,
      customerName: insertLead.customerName,
      customerPhone: insertLead.customerPhone,
      customerEmail: insertLead.customerEmail || null,
      address: insertLead.address || null,
      city: insertLead.city || null,
      zipCode: insertLead.zipCode || null,
      serviceType: insertLead.serviceType || null,
      description: insertLead.description || null,
      status: insertLead.status || "new",
      priority,
      cost: insertLead.cost || null,
      createdAt: now,
      updatedAt: now,
      convertedAt: insertLead.convertedAt || null,
      assignedTo: insertLead.assignedTo || null,
      contactedAt: insertLead.contactedAt || null,
      slaDeadline,
      slaBreach: false,
      leadScore: insertLead.leadScore || 50,
      isDuplicate: insertLead.isDuplicate || false,
      duplicateOfId: insertLead.duplicateOfId || null,
      revenue: insertLead.revenue || null,
    };
    this.leads.set(id, lead);
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    const updated = { ...lead, ...updates, updatedAt: new Date() };
    this.leads.set(id, updated);
    return updated;
  }

  // Calls
  async getCall(id: string): Promise<Call | undefined> {
    return this.calls.get(id);
  }

  async getCalls(): Promise<Call[]> {
    return Array.from(this.calls.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecentCalls(limit: number): Promise<Call[]> {
    return (await this.getCalls()).slice(0, limit);
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const id = randomUUID();
    const call: Call = {
      id,
      leadId: insertCall.leadId || null,
      jobId: insertCall.jobId || null,
      callerPhone: insertCall.callerPhone,
      callerName: insertCall.callerName || null,
      direction: insertCall.direction || "inbound",
      status: insertCall.status || "completed",
      duration: insertCall.duration || null,
      recordingUrl: insertCall.recordingUrl || null,
      notes: insertCall.notes || null,
      handledBy: insertCall.handledBy || null,
      createdAt: new Date(),
    };
    this.calls.set(id, call);
    return call;
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(j => j.status === status);
  }

  async getJobsByTechnician(technicianId: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(j => j.assignedTechnicianId === technicianId);
  }

  async getPoolJobs(technicianId: string): Promise<Job[]> {
    const tech = this.technicians.get(technicianId);
    if (!tech) return [];
    
    const approvedTypes = tech.approvedJobTypes || [];
    
    return Array.from(this.jobs.values())
      .filter(j => {
        if (j.status !== "pending") return false;
        if (j.assignedTechnicianId) return false;
        if (approvedTypes.length === 0) return true;
        return approvedTypes.includes(j.serviceType);
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const now = new Date();
    const job: Job = {
      id,
      leadId: insertJob.leadId || null,
      customerName: insertJob.customerName,
      customerPhone: insertJob.customerPhone,
      customerEmail: insertJob.customerEmail || null,
      address: insertJob.address,
      city: insertJob.city || null,
      zipCode: insertJob.zipCode || null,
      latitude: insertJob.latitude || null,
      longitude: insertJob.longitude || null,
      serviceType: insertJob.serviceType,
      description: insertJob.description || null,
      status: insertJob.status || "pending",
      priority: insertJob.priority || "normal",
      scheduledDate: insertJob.scheduledDate || null,
      scheduledTimeStart: insertJob.scheduledTimeStart || null,
      scheduledTimeEnd: insertJob.scheduledTimeEnd || null,
      estimatedDuration: insertJob.estimatedDuration || null,
      assignedTechnicianId: insertJob.assignedTechnicianId || null,
      dispatcherId: insertJob.dispatcherId || null,
      createdAt: now,
      updatedAt: now,
      assignedAt: insertJob.assignedAt || null,
      confirmedAt: insertJob.confirmedAt || null,
      enRouteAt: insertJob.enRouteAt || null,
      arrivedAt: insertJob.arrivedAt || null,
      arrivalLat: insertJob.arrivalLat || null,
      arrivalLng: insertJob.arrivalLng || null,
      arrivalVerified: insertJob.arrivalVerified || null,
      arrivalDistance: insertJob.arrivalDistance || null,
      startedAt: insertJob.startedAt || null,
      completedAt: insertJob.completedAt || null,
    };
    this.jobs.set(id, job);
    
    // Create initial timeline event
    this.createJobTimelineEvent({
      jobId: id,
      eventType: "created",
      description: "Job created",
    });
    
    return job;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const updated = { ...job, ...updates, updatedAt: new Date() };
    this.jobs.set(id, updated);
    return updated;
  }

  // Job Timeline Events
  async getJobTimelineEvents(jobId: string): Promise<JobTimelineEvent[]> {
    return Array.from(this.jobTimelineEvents.values())
      .filter(e => e.jobId === jobId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createJobTimelineEvent(insertEvent: InsertJobTimelineEvent): Promise<JobTimelineEvent> {
    const id = randomUUID();
    const event: JobTimelineEvent = {
      id,
      jobId: insertEvent.jobId,
      eventType: insertEvent.eventType,
      description: insertEvent.description || null,
      createdBy: insertEvent.createdBy || null,
      createdAt: new Date(),
      metadata: insertEvent.metadata || null,
    };
    this.jobTimelineEvents.set(id, event);
    return event;
  }

  // Quotes
  async getQuote(id: string): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }

  async getQuotesByJob(jobId: string): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(q => q.jobId === jobId);
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const id = randomUUID();
    const quote: Quote = {
      id,
      jobId: insertQuote.jobId,
      technicianId: insertQuote.technicianId || null,
      customerName: insertQuote.customerName,
      customerPhone: insertQuote.customerPhone || null,
      customerEmail: insertQuote.customerEmail || null,
      address: insertQuote.address || null,
      lineItems: insertQuote.lineItems || null,
      laborEntries: insertQuote.laborEntries || null,
      subtotal: insertQuote.subtotal || null,
      laborTotal: insertQuote.laborTotal || "0",
      taxRate: insertQuote.taxRate || "0",
      taxAmount: insertQuote.taxAmount || "0",
      total: insertQuote.total || null,
      status: insertQuote.status || "draft",
      notes: insertQuote.notes || null,
      createdAt: new Date(),
      sentAt: insertQuote.sentAt || null,
      viewedAt: insertQuote.viewedAt || null,
      acceptedAt: insertQuote.acceptedAt || null,
      declinedAt: insertQuote.declinedAt || null,
      expiresAt: insertQuote.expiresAt || null,
    };
    this.quotes.set(id, quote);
    return quote;
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined> {
    const quote = this.quotes.get(id);
    if (!quote) return undefined;
    const updated = { ...quote, ...updates };
    this.quotes.set(id, updated);
    return updated;
  }

  // Notifications
  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return (await this.getNotificationsByUser(userId)).filter(n => !n.isRead);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      id,
      userId: insertNotification.userId,
      type: insertNotification.type,
      title: insertNotification.title,
      message: insertNotification.message,
      jobId: insertNotification.jobId || null,
      isRead: false,
      actionUrl: insertNotification.actionUrl || null,
      createdAt: new Date(),
      readAt: null,
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    const updated = { ...notification, isRead: true, readAt: new Date() };
    this.notifications.set(id, updated);
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const userNotifications = await this.getNotificationsByUser(userId);
    const now = new Date();
    userNotifications.forEach(n => {
      this.notifications.set(n.id, { ...n, isRead: true, readAt: now });
    });
  }

  async getAllQuotes(): Promise<Quote[]> {
    return Array.from(this.quotes.values());
  }

  async getQuotesByStatus(status: string): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(q => q.status === status);
  }

  async getAnalytics(timeRange: string): Promise<AnalyticsData> {
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (timeRange) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1);
        break;
      case "quarter":
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth() - 2, 1);
        break;
      case "year":
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
    }

    const allLeads = Array.from(this.leads.values());
    const allJobs = Array.from(this.jobs.values());
    const allQuotes = Array.from(this.quotes.values());
    const allTechs = Array.from(this.technicians.values());

    const currentLeads = allLeads.filter(l => new Date(l.createdAt) >= startDate);
    const prevLeads = allLeads.filter(l => new Date(l.createdAt) >= prevStartDate && new Date(l.createdAt) <= prevEndDate);
    const currentJobs = allJobs.filter(j => new Date(j.createdAt) >= startDate);
    const prevJobs = allJobs.filter(j => new Date(j.createdAt) >= prevStartDate && new Date(j.createdAt) <= prevEndDate);
    const currentQuotes = allQuotes.filter(q => new Date(q.createdAt) >= startDate);

    const totalRevenue = currentQuotes.reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);
    const prevRevenue = allQuotes.filter(q => new Date(q.createdAt) >= prevStartDate && new Date(q.createdAt) <= prevEndDate)
      .reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);

    const totalLeads = currentLeads.length;
    const convertedLeads = currentLeads.filter(l => l.status === "converted").length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const prevConvertedLeads = prevLeads.filter(l => l.status === "converted").length;
    const prevConversionRate = prevLeads.length > 0 ? (prevConvertedLeads / prevLeads.length) * 100 : 0;

    const expenseRate = 0.4;
    const netProfit = totalRevenue * (1 - expenseRate);
    const prevProfit = prevRevenue * (1 - expenseRate);

    const sourceStats = new Map<string, { leads: number; cost: number; converted: number }>();
    currentLeads.forEach(l => {
      const stats = sourceStats.get(l.source) || { leads: 0, cost: 0, converted: 0 };
      stats.leads++;
      stats.cost += parseFloat(l.cost || "0");
      if (l.status === "converted") stats.converted++;
      sourceStats.set(l.source, stats);
    });

    const sourceComparison = Array.from(sourceStats.entries()).map(([source, stats]) => ({
      source,
      leads: stats.leads,
      cost: stats.cost,
      converted: stats.converted,
      costPerLead: stats.leads > 0 ? Math.round(stats.cost / stats.leads) : 0,
      avgResponse: Math.floor(Math.random() * 15) + 5,
    }));

    const serviceStats = new Map<string, { count: number; revenue: number }>();
    currentJobs.forEach(j => {
      const stats = serviceStats.get(j.serviceType) || { count: 0, revenue: 0 };
      stats.count++;
      serviceStats.set(j.serviceType, stats);
    });
    currentQuotes.forEach(q => {
      const job = allJobs.find(j => j.id === q.jobId);
      if (job) {
        const stats = serviceStats.get(job.serviceType) || { count: 0, revenue: 0 };
        stats.revenue += parseFloat(q.total || "0");
        serviceStats.set(job.serviceType, stats);
      }
    });

    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(0 72% 51%)"];
    const serviceBreakdown = Array.from(serviceStats.entries()).map(([name, stats], i) => ({
      name,
      value: stats.count,
      revenue: stats.revenue,
      avgTicket: stats.count > 0 ? Math.round(stats.revenue / stats.count) : 0,
      color: colors[i % colors.length],
    }));

    const techStats = new Map<string, { jobs: number; revenue: number; verified: number }>();
    allTechs.forEach(t => techStats.set(t.id, { jobs: 0, revenue: 0, verified: 0 }));
    currentJobs.forEach(j => {
      if (j.assignedTechnicianId) {
        const stats = techStats.get(j.assignedTechnicianId) || { jobs: 0, revenue: 0, verified: 0 };
        stats.jobs++;
        if (j.arrivalVerified) stats.verified++;
        techStats.set(j.assignedTechnicianId, stats);
      }
    });
    currentQuotes.forEach(q => {
      if (q.technicianId) {
        const stats = techStats.get(q.technicianId) || { jobs: 0, revenue: 0, verified: 0 };
        stats.revenue += parseFloat(q.total || "0");
        techStats.set(q.technicianId, stats);
      }
    });

    const techPerformance = allTechs.map(t => {
      const stats = techStats.get(t.id) || { jobs: 0, revenue: 0, verified: 0 };
      return {
        name: t.fullName.split(" ")[0] + " " + (t.fullName.split(" ")[1]?.[0] || "") + ".",
        jobs: stats.jobs,
        revenue: stats.revenue,
        rate: stats.jobs > 0 ? Math.round((stats.verified / stats.jobs) * 100) : 0,
        verified: stats.verified,
        avgTime: 2 + Math.random() * 1.5,
      };
    }).filter(t => t.jobs > 0);

    const contacted = currentLeads.filter(l => ["contacted", "qualified", "scheduled", "converted"].includes(l.status)).length;
    const quoted = currentLeads.filter(l => ["scheduled", "converted"].includes(l.status)).length;

    const conversionFunnel = [
      { stage: "Leads", count: totalLeads, percentage: 100 },
      { stage: "Contacted", count: contacted, percentage: totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0 },
      { stage: "Quote Sent", count: quoted, percentage: totalLeads > 0 ? Math.round((quoted / totalLeads) * 100) : 0 },
      { stage: "Converted", count: convertedLeads, percentage: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0 },
    ];

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = new Map<string, { revenue: number; leads: number; expenses: number }>();
    months.forEach(m => monthlyData.set(m, { revenue: 0, leads: 0, expenses: 0 }));

    currentLeads.forEach(l => {
      const month = months[new Date(l.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      data.leads++;
    });
    currentQuotes.forEach(q => {
      const month = months[new Date(q.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      const rev = parseFloat(q.total || "0");
      data.revenue += rev;
      data.expenses += rev * expenseRate;
    });

    const monthlyRevenue = months.slice(0, now.getMonth() + 1).map(month => {
      const data = monthlyData.get(month)!;
      return {
        month,
        revenue: Math.round(data.revenue),
        leads: data.leads,
        expenses: Math.round(data.expenses),
        profit: Math.round(data.revenue - data.expenses),
      };
    });

    const calcChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    return {
      summary: {
        totalRevenue,
        totalLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        netProfit,
        revenueChange: Math.round(calcChange(totalRevenue, prevRevenue) * 10) / 10,
        leadsChange: Math.round(calcChange(totalLeads, prevLeads.length) * 10) / 10,
        conversionChange: Math.round((conversionRate - prevConversionRate) * 10) / 10,
        profitChange: Math.round(calcChange(netProfit, prevProfit) * 10) / 10,
      },
      sourceComparison,
      monthlyRevenue,
      serviceBreakdown,
      techPerformance,
      conversionFunnel,
    };
  }

  async createShiftLog(log: InsertShiftLog): Promise<ShiftLog> {
    const id = randomUUID();
    const shiftLog: ShiftLog = {
      id,
      technicianId: log.technicianId,
      action: log.action,
      timestamp: new Date(),
      notes: log.notes || null,
    };
    this.shiftLogs.set(id, shiftLog);
    return shiftLog;
  }

  async getShiftLogsByTechnician(technicianId: string): Promise<ShiftLog[]> {
    return Array.from(this.shiftLogs.values())
      .filter(l => l.technicianId === technicianId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getTodayShiftLogs(technicianId: string): Promise<ShiftLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from(this.shiftLogs.values())
      .filter(l => l.technicianId === technicianId && new Date(l.timestamp) >= today)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async resetJobBoard(): Promise<void> {
    Array.from(this.jobs.values()).forEach(j => {
      if (!["completed", "cancelled"].includes(j.status)) {
        this.jobs.set(j.id, {
          ...j,
          status: "pending",
          assignedTechnicianId: null,
          dispatcherId: null,
          assignedAt: null,
          confirmedAt: null,
          enRouteAt: null,
          arrivedAt: null,
          startedAt: null,
          completedAt: null,
          arrivalLat: null,
          arrivalLng: null,
          arrivalVerified: null,
          arrivalDistance: null,
        });
      }
    });
    Array.from(this.technicians.values()).forEach(t => {
      this.technicians.set(t.id, { ...t, status: "off_duty", currentJobId: null, completedJobsToday: 0 });
    });
  }
}

export class DatabaseStorage implements IStorage {
  // Initialize database with seed data if empty
  async initialize(): Promise<void> {
    // Check if admin user exists
    const existingAdmin = await this.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("Database already seeded, skipping initialization");
      return;
    }

    console.log("Seeding database with initial users and technicians...");

    // Seed users
    const userData = [
      { id: "user-admin", username: "admin", password: "demo123", role: "admin" as const, fullName: "Admin User" },
      { id: "user-dispatcher", username: "dispatcher", password: "demo123", role: "dispatcher" as const, fullName: "Dispatch Manager" },
      { id: "user-tech-1", username: "mike", password: "demo123", role: "technician" as const, fullName: "Mike Johnson" },
      { id: "user-tech-2", username: "carlos", password: "demo123", role: "technician" as const, fullName: "Carlos Rodriguez" },
      { id: "user-tech-3", username: "james", password: "demo123", role: "technician" as const, fullName: "James Williams" },
    ];

    for (const u of userData) {
      try {
        await db.insert(users).values({
          id: u.id,
          username: u.username,
          password: u.password,
          role: u.role,
          fullName: u.fullName,
          isActive: true,
        }).onConflictDoNothing();
      } catch (err) {
        console.log(`User ${u.username} may already exist, skipping`);
      }
    }

    // Seed technicians
    const techData = [
      { id: "tech-1", fullName: "Mike Johnson", phone: "(708) 555-0101", email: "mike@chicagosewerexperts.com", status: "available" as const, skillLevel: "senior" as const, userId: "user-tech-1" },
      { id: "tech-2", fullName: "Carlos Rodriguez", phone: "(708) 555-0102", email: "carlos@chicagosewerexperts.com", status: "available" as const, skillLevel: "senior" as const, userId: "user-tech-2" },
      { id: "tech-3", fullName: "James Williams", phone: "(708) 555-0103", email: "james@chicagosewerexperts.com", status: "busy" as const, skillLevel: "standard" as const, userId: "user-tech-3" },
      { id: "tech-4", fullName: "David Martinez", phone: "(708) 555-0104", email: "david@chicagosewerexperts.com", status: "available" as const, skillLevel: "standard" as const, userId: null },
      { id: "tech-5", fullName: "Robert Taylor", phone: "(708) 555-0105", email: "robert@chicagosewerexperts.com", status: "off_duty" as const, skillLevel: "junior" as const, userId: null },
    ];

    for (const t of techData) {
      try {
        await db.insert(technicians).values({
          id: t.id,
          fullName: t.fullName,
          phone: t.phone,
          email: t.email,
          status: t.status,
          skillLevel: t.skillLevel,
          userId: t.userId,
          maxDailyJobs: 8,
          completedJobsToday: 0,
        }).onConflictDoNothing();
      } catch (err) {
        console.log(`Technician ${t.fullName} may already exist, skipping`);
      }
    }

    console.log("Database seeding complete");
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Technicians
  async getTechnician(id: string): Promise<Technician | undefined> {
    const [tech] = await db.select().from(technicians).where(eq(technicians.id, id));
    return tech;
  }

  async getTechnicianByUserId(userId: string): Promise<Technician | undefined> {
    const [tech] = await db.select().from(technicians).where(eq(technicians.userId, userId));
    return tech;
  }

  async getTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  async getAvailableTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians).where(eq(technicians.status, "available"));
  }

  async createTechnician(insertTech: InsertTechnician): Promise<Technician> {
    const [tech] = await db.insert(technicians).values(insertTech).returning();
    return tech;
  }

  async updateTechnician(id: string, updates: Partial<Technician>): Promise<Technician | undefined> {
    const [tech] = await db.update(technicians).set(updates).where(eq(technicians.id, id)).returning();
    return tech;
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.status, status));
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const [lead] = await db.update(leads).set({ ...updates, updatedAt: new Date() }).where(eq(leads.id, id)).returning();
    return lead;
  }

  // Calls
  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call;
  }

  async getCalls(): Promise<Call[]> {
    return await db.select().from(calls).orderBy(desc(calls.createdAt));
  }

  async getRecentCalls(limit: number): Promise<Call[]> {
    return await db.select().from(calls).orderBy(desc(calls.createdAt)).limit(limit);
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db.insert(calls).values(insertCall).returning();
    return call;
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.status, status));
  }

  async getJobsByTechnician(technicianId: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.assignedTechnicianId, technicianId));
  }

  async getPoolJobs(technicianId: string): Promise<Job[]> {
    const tech = await this.getTechnician(technicianId);
    if (!tech) return [];
    
    const approvedTypes = tech.approvedJobTypes || [];
    const allPendingJobs = await db.select().from(jobs).where(eq(jobs.status, "pending"));
    
    return allPendingJobs
      .filter(j => {
        if (j.assignedTechnicianId) return false;
        if (approvedTypes.length === 0) return true;
        return approvedTypes.includes(j.serviceType);
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    await this.createJobTimelineEvent({
      jobId: job.id,
      eventType: "created",
      description: "Job created",
    });
    return job;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const [job] = await db.update(jobs).set({ ...updates, updatedAt: new Date() }).where(eq(jobs.id, id)).returning();
    return job;
  }

  // Job Timeline Events
  async getJobTimelineEvents(jobId: string): Promise<JobTimelineEvent[]> {
    return await db.select().from(jobTimelineEvents).where(eq(jobTimelineEvents.jobId, jobId)).orderBy(asc(jobTimelineEvents.createdAt));
  }

  async createJobTimelineEvent(insertEvent: InsertJobTimelineEvent): Promise<JobTimelineEvent> {
    const [event] = await db.insert(jobTimelineEvents).values(insertEvent).returning();
    return event;
  }

  // Quotes
  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async getQuotesByJob(jobId: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.jobId, jobId));
  }

  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes);
  }

  async getQuotesByStatus(status: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.status, status));
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const [quote] = await db.insert(quotes).values(insertQuote).returning();
    return quote;
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined> {
    const [quote] = await db.update(quotes).set(updates).where(eq(quotes.id, id)).returning();
    return quote;
  }

  // Notifications
  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.id, id)).returning();
    return notification;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.userId, userId));
  }

  // Analytics
  async getAnalytics(timeRange: string): Promise<AnalyticsData> {
    console.log('[Analytics] Starting getAnalytics with timeRange:', timeRange);
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (timeRange) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1);
        break;
      case "quarter":
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth() - 2, 1);
        break;
      case "year":
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
    }

    console.log('[Analytics] Fetching leads...');
    const allLeads = await db.select().from(leads);
    console.log('[Analytics] Fetched', allLeads.length, 'leads');
    
    console.log('[Analytics] Fetching jobs...');
    const allJobs = await db.select().from(jobs);
    console.log('[Analytics] Fetched', allJobs.length, 'jobs');
    
    console.log('[Analytics] Fetching quotes...');
    const allQuotes = await db.select().from(quotes);
    console.log('[Analytics] Fetched', allQuotes.length, 'quotes');
    
    console.log('[Analytics] Fetching technicians...');
    const allTechs = await db.select().from(technicians);
    console.log('[Analytics] Fetched', allTechs.length, 'technicians');

    const currentLeads = allLeads.filter(l => new Date(l.createdAt) >= startDate);
    const prevLeads = allLeads.filter(l => new Date(l.createdAt) >= prevStartDate && new Date(l.createdAt) <= prevEndDate);
    const currentJobs = allJobs.filter(j => new Date(j.createdAt) >= startDate);
    const currentQuotes = allQuotes.filter(q => new Date(q.createdAt) >= startDate);

    const totalRevenue = currentQuotes.reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);
    const prevRevenue = allQuotes.filter(q => new Date(q.createdAt) >= prevStartDate && new Date(q.createdAt) <= prevEndDate)
      .reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);

    const totalLeads = currentLeads.length;
    const convertedLeads = currentLeads.filter(l => l.status === "converted").length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const prevConvertedLeads = prevLeads.filter(l => l.status === "converted").length;
    const prevConversionRate = prevLeads.length > 0 ? (prevConvertedLeads / prevLeads.length) * 100 : 0;

    const expenseRate = 0.4;
    const netProfit = totalRevenue * (1 - expenseRate);
    const prevProfit = prevRevenue * (1 - expenseRate);

    const sourceStats = new Map<string, { leads: number; cost: number; converted: number }>();
    currentLeads.forEach(l => {
      const stats = sourceStats.get(l.source) || { leads: 0, cost: 0, converted: 0 };
      stats.leads++;
      stats.cost += parseFloat(l.cost || "0");
      if (l.status === "converted") stats.converted++;
      sourceStats.set(l.source, stats);
    });

    const sourceComparison = Array.from(sourceStats.entries()).map(([source, stats]) => ({
      source,
      leads: stats.leads,
      cost: stats.cost,
      converted: stats.converted,
      costPerLead: stats.leads > 0 ? Math.round(stats.cost / stats.leads) : 0,
      avgResponse: Math.floor(Math.random() * 15) + 5,
    }));

    const serviceStats = new Map<string, { count: number; revenue: number }>();
    currentJobs.forEach(j => {
      const stats = serviceStats.get(j.serviceType) || { count: 0, revenue: 0 };
      stats.count++;
      serviceStats.set(j.serviceType, stats);
    });
    currentQuotes.forEach(q => {
      const job = allJobs.find(j => j.id === q.jobId);
      if (job) {
        const stats = serviceStats.get(job.serviceType) || { count: 0, revenue: 0 };
        stats.revenue += parseFloat(q.total || "0");
        serviceStats.set(job.serviceType, stats);
      }
    });

    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(0 72% 51%)"];
    const serviceBreakdown = Array.from(serviceStats.entries()).map(([name, stats], i) => ({
      name,
      value: stats.count,
      revenue: stats.revenue,
      avgTicket: stats.count > 0 ? Math.round(stats.revenue / stats.count) : 0,
      color: colors[i % colors.length],
    }));

    const techStats = new Map<string, { jobs: number; revenue: number; verified: number }>();
    allTechs.forEach(t => techStats.set(t.id, { jobs: 0, revenue: 0, verified: 0 }));
    currentJobs.forEach(j => {
      if (j.assignedTechnicianId) {
        const stats = techStats.get(j.assignedTechnicianId) || { jobs: 0, revenue: 0, verified: 0 };
        stats.jobs++;
        if (j.arrivalVerified) stats.verified++;
        techStats.set(j.assignedTechnicianId, stats);
      }
    });
    currentQuotes.forEach(q => {
      if (q.technicianId) {
        const stats = techStats.get(q.technicianId) || { jobs: 0, revenue: 0, verified: 0 };
        stats.revenue += parseFloat(q.total || "0");
        techStats.set(q.technicianId, stats);
      }
    });

    const techPerformance = allTechs.map(t => {
      const stats = techStats.get(t.id) || { jobs: 0, revenue: 0, verified: 0 };
      return {
        name: t.fullName.split(" ")[0] + " " + (t.fullName.split(" ")[1]?.[0] || "") + ".",
        jobs: stats.jobs,
        revenue: stats.revenue,
        rate: stats.jobs > 0 ? Math.round((stats.verified / stats.jobs) * 100) : 0,
        verified: stats.verified,
        avgTime: 2 + Math.random() * 1.5,
      };
    }).filter(t => t.jobs > 0);

    const contacted = currentLeads.filter(l => ["contacted", "qualified", "scheduled", "converted"].includes(l.status)).length;
    const quoted = currentLeads.filter(l => ["scheduled", "converted"].includes(l.status)).length;

    const conversionFunnel = [
      { stage: "Leads", count: totalLeads, percentage: 100 },
      { stage: "Contacted", count: contacted, percentage: totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0 },
      { stage: "Quote Sent", count: quoted, percentage: totalLeads > 0 ? Math.round((quoted / totalLeads) * 100) : 0 },
      { stage: "Converted", count: convertedLeads, percentage: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0 },
    ];

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = new Map<string, { revenue: number; leads: number; expenses: number }>();
    months.forEach(m => monthlyData.set(m, { revenue: 0, leads: 0, expenses: 0 }));

    currentLeads.forEach(l => {
      const month = months[new Date(l.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      data.leads++;
    });
    currentQuotes.forEach(q => {
      const month = months[new Date(q.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      const rev = parseFloat(q.total || "0");
      data.revenue += rev;
      data.expenses += rev * expenseRate;
    });

    const monthlyRevenue = months.slice(0, now.getMonth() + 1).map(month => {
      const data = monthlyData.get(month)!;
      return {
        month,
        revenue: Math.round(data.revenue),
        leads: data.leads,
        expenses: Math.round(data.expenses),
        profit: Math.round(data.revenue - data.expenses),
      };
    });

    const calcChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    return {
      summary: {
        totalRevenue,
        totalLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        netProfit,
        revenueChange: Math.round(calcChange(totalRevenue, prevRevenue) * 10) / 10,
        leadsChange: Math.round(calcChange(totalLeads, prevLeads.length) * 10) / 10,
        conversionChange: Math.round((conversionRate - prevConversionRate) * 10) / 10,
        profitChange: Math.round(calcChange(netProfit, prevProfit) * 10) / 10,
      },
      sourceComparison,
      monthlyRevenue,
      serviceBreakdown,
      techPerformance,
      conversionFunnel,
    };
  }

  async createShiftLog(log: InsertShiftLog): Promise<ShiftLog> {
    const [newLog] = await db.insert(shiftLogs).values(log).returning();
    return newLog;
  }

  async getShiftLogsByTechnician(technicianId: string): Promise<ShiftLog[]> {
    return await db.select().from(shiftLogs).where(eq(shiftLogs.technicianId, technicianId)).orderBy(desc(shiftLogs.timestamp));
  }

  async getTodayShiftLogs(technicianId: string): Promise<ShiftLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await db.select().from(shiftLogs)
      .where(and(
        eq(shiftLogs.technicianId, technicianId),
        gte(shiftLogs.timestamp, today)
      ))
      .orderBy(asc(shiftLogs.timestamp));
  }

  async resetJobBoard(): Promise<void> {
    // Reset all active jobs to pending status and clear assignments (preserve job data)
    await db.update(jobs)
      .set({ 
        status: "pending",
        assignedTechnicianId: null,
        dispatcherId: null,
        assignedAt: null,
        confirmedAt: null,
        enRouteAt: null,
        arrivedAt: null,
        startedAt: null,
        completedAt: null,
        arrivalLat: null,
        arrivalLng: null,
        arrivalVerified: null,
        arrivalDistance: null,
      })
      .where(
        sql`${jobs.status} NOT IN ('completed', 'cancelled')`
      );

    // Set all technicians to off_duty and reset daily stats
    await db.update(technicians)
      .set({ 
        status: "off_duty", 
        currentJobId: null, 
        completedJobsToday: 0 
      });
  }
}

export const storage = new DatabaseStorage();
