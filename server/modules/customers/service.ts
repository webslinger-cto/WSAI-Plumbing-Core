import { db } from "../../db";
import { customers, customerAddresses, customerPaymentProfiles, leads, jobs, quotes, calls, contactAttempts, chatThreads, chatMessages, chatThreadParticipants, jobMedia, auditLogs } from "@shared/schema";
import { eq, and, or, ilike, sql, desc, inArray } from "drizzle-orm";
import type { InsertCustomer, InsertCustomerAddress, InsertCustomerPaymentProfile, Customer, CustomerAddress, CustomerPaymentProfile } from "@shared/schema";

export interface CustomerListFilters {
  search?: string;
  status?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerWithDetails extends Customer {
  addresses: CustomerAddress[];
  paymentProfiles: CustomerPaymentProfile[];
  jobCount?: number;
  quoteCount?: number;
  leadCount?: number;
}

export const customerService = {
  async list(filters: CustomerListFilters = {}) {
    const { search, status, tag, limit = 50, offset = 0 } = filters;

    let query = db.select().from(customers);
    const conditions: any[] = [];

    if (status && status !== "all") {
      conditions.push(eq(customers.status, status));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(customers.firstName, searchPattern),
          ilike(customers.lastName, searchPattern),
          ilike(customers.phonePrimary, searchPattern),
          ilike(customers.email, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    if (tag) {
      return results.filter((c) => {
        const tags = c.tags as string[];
        return tags && tags.includes(tag);
      });
    }

    return results;
  },

  async getById(id: string): Promise<CustomerWithDetails | null> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) return null;

    const addresses = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, id));

    const paymentProfiles = await db
      .select()
      .from(customerPaymentProfiles)
      .where(eq(customerPaymentProfiles.customerId, id));

    const [jobCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(eq(jobs.customerId, id));

    const [quoteCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(quotes)
      .where(eq(quotes.customerId, id));

    const [leadCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.customerId, id));

    return {
      ...customer,
      addresses,
      paymentProfiles,
      jobCount: jobCountResult?.count ?? 0,
      quoteCount: quoteCountResult?.count ?? 0,
      leadCount: leadCountResult?.count ?? 0,
    };
  },

  async create(data: InsertCustomer, primaryAddress?: Omit<InsertCustomerAddress, "customerId">) {
    const [customer] = await db.insert(customers).values(data).returning();

    if (primaryAddress) {
      await db.insert(customerAddresses).values({
        ...primaryAddress,
        customerId: customer.id,
        isPrimary: true,
      });
    }

    return customer;
  },

  async update(id: string, data: Partial<InsertCustomer>) {
    const [updated] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    return updated;
  },

  async addAddress(customerId: string, data: Omit<InsertCustomerAddress, "customerId">) {
    if (data.isPrimary) {
      await db
        .update(customerAddresses)
        .set({ isPrimary: false })
        .where(eq(customerAddresses.customerId, customerId));
    }

    const [address] = await db
      .insert(customerAddresses)
      .values({ ...data, customerId })
      .returning();

    return address;
  },

  async updateAddress(customerId: string, addressId: string, data: Partial<InsertCustomerAddress>) {
    if (data.isPrimary) {
      await db
        .update(customerAddresses)
        .set({ isPrimary: false })
        .where(eq(customerAddresses.customerId, customerId));
    }

    const [updated] = await db
      .update(customerAddresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customerId)))
      .returning();

    return updated;
  },

  async addPaymentProfile(customerId: string, data: Omit<InsertCustomerPaymentProfile, "customerId">) {
    if (data.isDefault) {
      await db
        .update(customerPaymentProfiles)
        .set({ isDefault: false })
        .where(eq(customerPaymentProfiles.customerId, customerId));
    }

    const [profile] = await db
      .insert(customerPaymentProfiles)
      .values({ ...data, customerId })
      .returning();

    return profile;
  },

  async updatePaymentProfile(customerId: string, profileId: string, data: Partial<InsertCustomerPaymentProfile>) {
    if (data.isDefault) {
      await db
        .update(customerPaymentProfiles)
        .set({ isDefault: false })
        .where(eq(customerPaymentProfiles.customerId, customerId));
    }

    const [updated] = await db
      .update(customerPaymentProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customerPaymentProfiles.id, profileId), eq(customerPaymentProfiles.customerId, customerId)))
      .returning();

    return updated;
  },

  async getRelatedJobs(customerId: string) {
    return db
      .select()
      .from(jobs)
      .where(eq(jobs.customerId, customerId))
      .orderBy(desc(jobs.createdAt))
      .limit(20);
  },

  async getRelatedQuotes(customerId: string) {
    return db
      .select()
      .from(quotes)
      .where(eq(quotes.customerId, customerId))
      .orderBy(desc(quotes.createdAt))
      .limit(20);
  },

  async getRelatedLeads(customerId: string) {
    return db
      .select()
      .from(leads)
      .where(eq(leads.customerId, customerId))
      .orderBy(desc(leads.createdAt))
      .limit(20);
  },

  async getRelatedCalls(customerId: string) {
    const customer = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer.length) return [];

    const c = customer[0];
    const phoneConditions: any[] = [];
    if (c.phonePrimary) phoneConditions.push(eq(calls.callerPhone, c.phonePrimary));
    if (c.phoneAlt) phoneConditions.push(eq(calls.callerPhone, c.phoneAlt));

    const relatedJobs = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.customerId, customerId));
    const relatedLeads = await db.select({ id: leads.id }).from(leads).where(eq(leads.customerId, customerId));
    const jobIds = relatedJobs.map(j => j.id);
    const leadIds = relatedLeads.map(l => l.id);

    const conditions: any[] = [...phoneConditions];
    if (jobIds.length > 0) conditions.push(inArray(calls.jobId, jobIds));
    if (leadIds.length > 0) conditions.push(inArray(calls.leadId, leadIds));

    if (conditions.length === 0) return [];

    return db
      .select()
      .from(calls)
      .where(or(...conditions))
      .orderBy(desc(calls.createdAt))
      .limit(50);
  },

  async getRelatedMessages(customerId: string) {
    const customer = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer.length) return { chatThreads: [], contactAttempts: [] };

    const c = customer[0];
    const threads = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.customerId, customerId))
      .orderBy(desc(chatThreads.createdAt))
      .limit(20);

    const threadIds = threads.map(t => t.id);
    let messages: any[] = [];
    if (threadIds.length > 0) {
      messages = await db
        .select()
        .from(chatMessages)
        .where(inArray(chatMessages.threadId, threadIds))
        .orderBy(desc(chatMessages.createdAt))
        .limit(100);
    }

    const relatedJobs = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.customerId, customerId));
    const relatedLeads = await db.select({ id: leads.id }).from(leads).where(eq(leads.customerId, customerId));
    const jobIds = relatedJobs.map(j => j.id);
    const leadIds = relatedLeads.map(l => l.id);

    const attemptConditions: any[] = [];
    if (c.phonePrimary) attemptConditions.push(eq(contactAttempts.recipientPhone, c.phonePrimary));
    if (c.phoneAlt) attemptConditions.push(eq(contactAttempts.recipientPhone, c.phoneAlt));
    if (c.email) attemptConditions.push(eq(contactAttempts.recipientEmail, c.email));
    if (jobIds.length > 0) attemptConditions.push(inArray(contactAttempts.jobId, jobIds));
    if (leadIds.length > 0) attemptConditions.push(inArray(contactAttempts.leadId, leadIds));

    let attempts: any[] = [];
    if (attemptConditions.length > 0) {
      attempts = await db
        .select()
        .from(contactAttempts)
        .where(or(...attemptConditions))
        .orderBy(desc(contactAttempts.createdAt))
        .limit(50);
    }

    return {
      chatThreads: threads.map(t => ({
        ...t,
        messages: messages.filter(m => m.threadId === t.id),
      })),
      contactAttempts: attempts,
    };
  },

  async getRelatedMedia(customerId: string) {
    const relatedJobs = await db
      .select({ id: jobs.id, customerName: jobs.customerName, serviceType: jobs.serviceType, address: jobs.address })
      .from(jobs)
      .where(eq(jobs.customerId, customerId));

    const jobIds = relatedJobs.map(j => j.id);
    if (jobIds.length === 0) return [];

    const media = await db
      .select()
      .from(jobMedia)
      .where(inArray(jobMedia.jobId, jobIds))
      .orderBy(desc(jobMedia.createdAt));

    return media.map(m => ({
      ...m,
      job: relatedJobs.find(j => j.id === m.jobId),
    }));
  },

  async getRelatedAuditLogs(customerId: string) {
    const relatedJobs = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.customerId, customerId));
    const relatedQuotes = await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.customerId, customerId));
    const relatedLeads = await db.select({ id: leads.id }).from(leads).where(eq(leads.customerId, customerId));

    const entityPairs: { type: string; ids: string[] }[] = [
      { type: "customer", ids: [customerId] },
      { type: "job", ids: relatedJobs.map(j => j.id) },
      { type: "quote", ids: relatedQuotes.map(q => q.id) },
      { type: "lead", ids: relatedLeads.map(l => l.id) },
    ];

    const conditions: any[] = [];
    for (const pair of entityPairs) {
      if (pair.ids.length > 0) {
        conditions.push(
          and(eq(auditLogs.entityType, pair.type), inArray(auditLogs.entityId, pair.ids))
        );
      }
    }

    if (conditions.length === 0) return [];

    return db
      .select()
      .from(auditLogs)
      .where(or(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
  },
};
