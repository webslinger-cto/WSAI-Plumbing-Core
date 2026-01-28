import { db } from "../../db";
import { customers, customerAddresses, customerPaymentProfiles, leads, jobs, quotes } from "@shared/schema";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
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
};
