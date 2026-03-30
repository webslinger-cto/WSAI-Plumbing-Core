import { db } from "../../db";
import { customers, customerAddresses, leads } from "@shared/schema";
import { eq, or, ilike, and, sql } from "drizzle-orm";

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length >= 10 ? digits.slice(-10) : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

interface MatchResult {
  matched: boolean;
  customerId: string | null;
  matchType: "phone" | "email" | "address_lastname" | "created" | null;
}

export async function matchOrCreateCustomer(lead: {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
}): Promise<MatchResult> {
  try {
    const normalizedPhone = normalizePhone(lead.customerPhone);
    const normalizedEmail = normalizeEmail(lead.customerEmail);

    if (normalizedPhone) {
      const [phoneMatch] = await db
        .select()
        .from(customers)
        .where(
          or(
            eq(customers.phonePrimary, normalizedPhone),
            eq(customers.phoneAlt, normalizedPhone),
            ilike(customers.phonePrimary, `%${normalizedPhone}%`)
          )
        )
        .limit(1);

      if (phoneMatch) {
        await db.update(leads).set({ customerId: phoneMatch.id }).where(eq(leads.id, lead.id));
        return { matched: true, customerId: phoneMatch.id, matchType: "phone" };
      }
    }

    if (normalizedEmail) {
      const [emailMatch] = await db
        .select()
        .from(customers)
        .where(ilike(customers.email, normalizedEmail))
        .limit(1);

      if (emailMatch) {
        await db.update(leads).set({ customerId: emailMatch.id }).where(eq(leads.id, lead.id));
        return { matched: true, customerId: emailMatch.id, matchType: "email" };
      }
    }

    if (lead.address && lead.customerName) {
      const nameParts = lead.customerName.trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];

      const addressMatches = await db
        .select({ customerId: customerAddresses.customerId })
        .from(customerAddresses)
        .innerJoin(customers, eq(customers.id, customerAddresses.customerId))
        .where(
          and(
            ilike(customerAddresses.street1, `%${lead.address.split(" ")[0]}%`),
            lead.zipCode ? eq(customerAddresses.zip, lead.zipCode) : sql`true`,
            ilike(customers.lastName, lastName)
          )
        )
        .limit(1);

      if (addressMatches.length > 0) {
        const { customerId } = addressMatches[0];
        await db.update(leads).set({ customerId }).where(eq(leads.id, lead.id));
        return { matched: true, customerId, matchType: "address_lastname" };
      }
    }

    const nameParts = lead.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const [newCustomer] = await db
      .insert(customers)
      .values({
        firstName,
        lastName: lastName || firstName,
        phonePrimary: normalizedPhone,
        email: normalizedEmail,
        status: "active",
      })
      .returning();

    if (lead.address && lead.city && lead.zipCode) {
      await db.insert(customerAddresses).values({
        customerId: newCustomer.id,
        street1: lead.address,
        city: lead.city,
        state: "IL",
        zip: lead.zipCode,
        isPrimary: true,
      });
    }

    await db.update(leads).set({ customerId: newCustomer.id }).where(eq(leads.id, lead.id));

    return { matched: false, customerId: newCustomer.id, matchType: "created" };
  } catch (error) {
    console.error("Customer match-or-create failed (non-blocking):", error);
    return { matched: false, customerId: null, matchType: null };
  }
}

export async function linkLeadToCustomer(leadId: string, customerId: string) {
  await db.update(leads).set({ customerId }).where(eq(leads.id, leadId));
}

export async function linkJobToCustomer(jobId: string, customerId: string) {
  const { jobs } = await import("@shared/schema");
  await db.update(jobs).set({ customerId }).where(eq(jobs.id, jobId));
}

export async function linkQuoteToCustomer(quoteId: string, customerId: string) {
  const { quotes } = await import("@shared/schema");
  await db.update(quotes).set({ customerId }).where(eq(quotes.id, quoteId));
}
