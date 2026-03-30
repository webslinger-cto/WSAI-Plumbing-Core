import PDFDocument from "pdfkit";
import { and, asc, desc, eq, ilike, inArray, sql, count } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import {
  companySettings,
  jobs,
  permitJurisdictions,
  permitPacketDocuments,
  permitPackets,
  permitRules,
  permitTypes,
  type CompanySettings,
  type Job,
} from "@shared/schema";

export type PermitPacketListItem = {
  packet: typeof permitPackets.$inferSelect;
  jurisdiction: typeof permitJurisdictions.$inferSelect;
  permitType: typeof permitTypes.$inferSelect;
  documents: Array<typeof permitPacketDocuments.$inferSelect>;
};

function normalize(s?: string | null) {
  return (s || "").trim();
}

function docToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function base64PdfDataUrl(buf: Buffer): string {
  return `data:application/pdf;base64,${buf.toString("base64")}`;
}

async function getCompanySettingsOrCreate(): Promise<CompanySettings> {
  const existing = await storage.getCompanySettings();
  if (existing) return existing;
  const created = await storage.updateCompanySettings({});
  if (!created) throw new Error("Failed to initialize company settings");
  return created;
}

async function ensurePermitCatalog() {
  const existingTypes = await db.select().from(permitTypes).limit(1);
  if (existingTypes.length === 0) {
    await db.insert(permitTypes).values([
      { code: "plumbing", name: "Plumbing Permit", description: "General plumbing permit" },
      { code: "sewer", name: "Sewer Repair Permit", description: "Sewer repair / replacement permit" },
      { code: "excavation", name: "Excavation Permit", description: "Excavation / dig permit" },
      { code: "row", name: "Right-of-Way / Street Opening", description: "Street opening / ROW permit" },
    ]);
  }

  const existingJur = await db.select().from(permitJurisdictions).limit(1);
  if (existingJur.length === 0) {
    await db.insert(permitJurisdictions).values({
      name: "City of Chicago",
      state: "IL",
      city: "Chicago",
      county: "Cook",
      submissionMethod: "portal",
      portalUrl: "",
      notes: "Seeded default jurisdiction. Update portal URL + form templates in admin later.",
      lastVerifiedAt: new Date(),
    });
  }

  const existingRules = await db.select().from(permitRules).limit(1);
  if (existingRules.length === 0) {
    const [chicago] = await db.select().from(permitJurisdictions).where(ilike(permitJurisdictions.name, "%chicago%")).limit(1);
    const types = await db.select().from(permitTypes).where(inArray(permitTypes.code, ["plumbing", "sewer", "excavation", "row"]));
    if (chicago && types.length > 0) {
      const byCode = Object.fromEntries(types.map(t => [t.code, t]));
      const toInsert = [] as any[];
      if (byCode.sewer) {
        toInsert.push({
          jurisdictionId: chicago.id,
          permitTypeId: byCode.sewer.id,
          conditions: { serviceTypeIncludes: ["sewer"], descriptionIncludes: ["sewer", "main"] },
          priority: 10,
          required: false,
        });
      }
      if (byCode.excavation) {
        toInsert.push({
          jurisdictionId: chicago.id,
          permitTypeId: byCode.excavation.id,
          conditions: { descriptionIncludes: ["excavat", "dig", "trench"] },
          priority: 20,
          required: false,
        });
      }
      if (byCode.row) {
        toInsert.push({
          jurisdictionId: chicago.id,
          permitTypeId: byCode.row.id,
          conditions: { descriptionIncludes: ["street", "sidewalk", "parkway", "row", "right-of-way"] },
          priority: 30,
          required: false,
        });
      }
      if (byCode.plumbing) {
        toInsert.push({
          jurisdictionId: chicago.id,
          permitTypeId: byCode.plumbing.id,
          conditions: { serviceTypeIncludes: ["plumb"], descriptionIncludes: ["plumb"] },
          priority: 40,
          required: false,
        });
      }
      if (toInsert.length) await db.insert(permitRules).values(toInsert);
    }
  }
}

function ruleMatchesJob(ruleConditions: any, job: Job): { matches: boolean; reason: string } {
  const serviceType = normalize(job.serviceType).toLowerCase();
  const desc = normalize(job.description).toLowerCase();

  const stIncludes: string[] = Array.isArray(ruleConditions?.serviceTypeIncludes) ? ruleConditions.serviceTypeIncludes : [];
  const descIncludes: string[] = Array.isArray(ruleConditions?.descriptionIncludes) ? ruleConditions.descriptionIncludes : [];

  const stMatch = stIncludes.length === 0 || stIncludes.some(k => serviceType.includes(String(k).toLowerCase()));
  const descMatch = descIncludes.length === 0 || descIncludes.some(k => desc.includes(String(k).toLowerCase()));

  const matches = stMatch && descMatch;
  const reason = matches
    ? `Matched rule (serviceTypeIncludes=${JSON.stringify(stIncludes)}, descriptionIncludes=${JSON.stringify(descIncludes)})`
    : "";
  return { matches, reason };
}

async function resolveJurisdictionForJob(job: Job) {
  const city = normalize(job.city);
  if (city) {
    const candidates = await db
      .select()
      .from(permitJurisdictions)
      .where(and(eq(permitJurisdictions.isActive, true), ilike(permitJurisdictions.city, city)))
      .orderBy(asc(permitJurisdictions.name))
      .limit(5);
    if (candidates.length) return candidates[0];
  }
  const [fallback] = await db
    .select()
    .from(permitJurisdictions)
    .where(eq(permitJurisdictions.isActive, true))
    .orderBy(asc(permitJurisdictions.name))
    .limit(1);
  return fallback;
}

export const permitService = {
  async isEnabled(): Promise<boolean> {
    const settings = await getCompanySettingsOrCreate();
    return !!settings.permitCenterEnabled;
  },

  async ensureCatalog() {
    await ensurePermitCatalog();
  },

  async onJobCreated(jobId: string, createdByUserId?: string) {
    const enabled = await this.isEnabled();
    if (!enabled) return;
    await this.ensureCatalog();
    await this.detectForJob(jobId, createdByUserId);
  },

  async detectForJob(jobId: string, createdByUserId?: string) {
    await this.ensureCatalog();

    const job = await storage.getJob(jobId);
    if (!job) throw new Error("Job not found");

    const jurisdiction = await resolveJurisdictionForJob(job);
    if (!jurisdiction) {
      return [];
    }

    const rules = await db
      .select({
        rule: permitRules,
        permitType: permitTypes,
      })
      .from(permitRules)
      .innerJoin(permitTypes, eq(permitTypes.id, permitRules.permitTypeId))
      .where(and(eq(permitRules.jurisdictionId, jurisdiction.id), eq(permitRules.isActive, true), eq(permitTypes.isActive, true)))
      .orderBy(asc(permitRules.priority));

    const matched = rules
      .map(r => {
        const m = ruleMatchesJob(r.rule.conditions, job);
        return { ...r, matches: m.matches, reason: m.reason };
      })
      .filter(r => r.matches);

    const toCreate = matched.length ? matched : [];

    const createdPackets: Array<typeof permitPackets.$inferSelect> = [];

    for (const item of toCreate) {
      const existing = await db
        .select()
        .from(permitPackets)
        .where(
          and(
            eq(permitPackets.jobId, jobId),
            eq(permitPackets.jurisdictionId, jurisdiction.id),
            eq(permitPackets.permitTypeId, item.permitType.id),
          ),
        )
        .limit(1);
      if (existing.length) {
        createdPackets.push(existing[0]);
        continue;
      }

      const [pkt] = await db
        .insert(permitPackets)
        .values({
          jobId,
          jurisdictionId: jurisdiction.id,
          permitTypeId: item.permitType.id,
          status: "detected",
          required: !!item.rule.required,
          detectedReason: item.reason,
          createdBy: createdByUserId,
          updatedAt: new Date(),
        })
        .returning();
      createdPackets.push(pkt);
    }

    return createdPackets;
  },

  async listByJob(jobId: string): Promise<PermitPacketListItem[]> {
    const packets = await db
      .select({
        packet: permitPackets,
        jurisdiction: permitJurisdictions,
        permitType: permitTypes,
      })
      .from(permitPackets)
      .innerJoin(permitJurisdictions, eq(permitJurisdictions.id, permitPackets.jurisdictionId))
      .innerJoin(permitTypes, eq(permitTypes.id, permitPackets.permitTypeId))
      .where(eq(permitPackets.jobId, jobId))
      .orderBy(asc(permitPackets.createdAt));

    const packetIds = packets.map(p => p.packet.id);
    const docs = packetIds.length
      ? await db.select().from(permitPacketDocuments).where(inArray(permitPacketDocuments.packetId, packetIds)).orderBy(asc(permitPacketDocuments.createdAt))
      : [];

    const docsByPacket = new Map<string, Array<typeof permitPacketDocuments.$inferSelect>>();
    for (const d of docs) {
      const arr = docsByPacket.get(d.packetId) || [];
      arr.push(d);
      docsByPacket.set(d.packetId, arr);
    }

    return packets.map(p => ({
      packet: p.packet,
      jurisdiction: p.jurisdiction,
      permitType: p.permitType,
      documents: docsByPacket.get(p.packet.id) || [],
    }));
  },

  async generatePacketPdf(packetId: string, actorUserId?: string) {
    const settings = await getCompanySettingsOrCreate();

    const [row] = await db
      .select({
        packet: permitPackets,
        jurisdiction: permitJurisdictions,
        permitType: permitTypes,
      })
      .from(permitPackets)
      .innerJoin(permitJurisdictions, eq(permitJurisdictions.id, permitPackets.jurisdictionId))
      .innerJoin(permitTypes, eq(permitTypes.id, permitPackets.permitTypeId))
      .where(eq(permitPackets.id, packetId))
      .limit(1);

    if (!row) throw new Error("Permit packet not found");

    const job = await storage.getJob(row.packet.jobId);
    if (!job) throw new Error("Job not found");

    await db.update(permitPackets).set({ status: "generating", updatedAt: new Date() }).where(eq(permitPackets.id, packetId));

    const doc = new PDFDocument({ margin: 50 });

    doc.fontSize(20).font("Helvetica-Bold").text("Permit Packet", { align: "center" });
    doc.moveDown(0.25);
    doc.fontSize(10).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Contractor / Company");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text(`${settings.companyName}`);
    if (settings.address) doc.text(`${settings.address}`);
    doc.text(`${settings.city || ""} ${settings.state || ""} ${settings.zipCode || ""}`.trim());
    if (settings.phone) doc.text(`Phone: ${settings.phone}`);
    if (settings.email) doc.text(`Email: ${settings.email}`);
    if (settings.licenseNumber) doc.text(`License #: ${settings.licenseNumber}`);
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Job / Property");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Customer: ${job.customerName}`);
    doc.text(`Address: ${job.address}${job.city ? ", " + job.city : ""}${job.zipCode ? " " + job.zipCode : ""}`);
    doc.text(`Service Type: ${job.serviceType}`);
    if (job.description) doc.text(`Description: ${job.description}`);
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Jurisdiction / Permit");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Jurisdiction: ${row.jurisdiction.name}`);
    if (row.jurisdiction.portalUrl) doc.text(`Portal: ${row.jurisdiction.portalUrl}`);
    doc.text(`Permit Type: ${row.permitType.name}`);
    doc.text(`Status: ${row.packet.status}`);
    if (row.packet.detectedReason) doc.text(`Detected Reason: ${row.packet.detectedReason}`);
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Customer Information (Fill at Finalization)");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text("Owner Name: ________________________________");
    doc.text("Owner Phone: _______________________________");
    doc.text("Owner Email: _______________________________");
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Checklist");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    const checklist = [
      "Verify required permit(s) for this scope.",
      "Attach proof of insurance / bonding if required.",
      "Attach license documentation if required.",
      "Attach site photos / sketch if required.",
      "Submit via portal/email/in-person as per jurisdiction instructions.",
    ];
    checklist.forEach((c) => doc.text(`• ${c}`));

    const buf = await docToBuffer(doc);
    const dataUrl = base64PdfDataUrl(buf);

    const filename = `permit-packet-${row.packet.id}.pdf`;

    const [docRow] = await db
      .insert(permitPacketDocuments)
      .values({
        packetId: row.packet.id,
        docType: "application_pdf",
        filename,
        mimeType: "application/pdf",
        fileSize: buf.length,
        sha256: "",
        url: dataUrl,
      })
      .returning();

    await db
      .update(permitPackets)
      .set({
        status: "ready_for_review",
        generatedAt: new Date(),
        updatedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(permitPackets.id, row.packet.id));

    return { packetId: row.packet.id, document: docRow };
  },

  async autoFilePermitsForJob(jobId: string, triggerReason: string = "auto"): Promise<{ detected: number; generated: number; finalized: number; errors: string[] }> {
    const enabled = await this.isEnabled();
    if (!enabled) return { detected: 0, generated: 0, finalized: 0, errors: ["Permit Center is disabled"] };

    const job = await storage.getJob(jobId);
    if (!job) return { detected: 0, generated: 0, finalized: 0, errors: ["Job not found"] };

    const result = { detected: 0, generated: 0, finalized: 0, errors: [] as string[] };

    try {
      await this.ensureCatalog();
      const packets = await this.detectForJob(jobId);
      result.detected = packets.length;

      for (const pkt of packets) {
        try {
          const genResult = await this.generatePacketPdf(pkt.id);
          result.generated++;

          try {
            await db.update(permitPackets).set({
              status: "ready_to_submit",
              updatedAt: new Date(),
            }).where(eq(permitPackets.id, pkt.id));
            result.finalized++;
          } catch (finalizeErr: any) {
            result.errors.push(`Finalize failed for packet ${pkt.id}: ${finalizeErr.message}`);
          }
        } catch (genErr: any) {
          result.errors.push(`PDF generation failed for packet ${pkt.id}: ${genErr.message}`);
        }
      }

      console.log(`[AutoPermit] ${triggerReason}: Job ${jobId} - detected=${result.detected}, generated=${result.generated}, finalized=${result.finalized}, errors=${result.errors.length}`);
    } catch (err: any) {
      result.errors.push(`Detection failed: ${err.message}`);
      console.error(`[AutoPermit] Detection failed for job ${jobId}:`, err);
    }

    return result;
  },

  async listAll(statusFilter?: string): Promise<(PermitPacketListItem & { job: Job })[]> {
    const conditions = [];
    if (statusFilter) {
      conditions.push(eq(permitPackets.status, statusFilter));
    }

    const packets = await db
      .select({
        packet: permitPackets,
        jurisdiction: permitJurisdictions,
        permitType: permitTypes,
        job: jobs,
      })
      .from(permitPackets)
      .innerJoin(permitJurisdictions, eq(permitJurisdictions.id, permitPackets.jurisdictionId))
      .innerJoin(permitTypes, eq(permitTypes.id, permitPackets.permitTypeId))
      .innerJoin(jobs, eq(jobs.id, permitPackets.jobId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(permitPackets.createdAt));

    const packetIds = packets.map(p => p.packet.id);
    const docs = packetIds.length
      ? await db.select().from(permitPacketDocuments).where(inArray(permitPacketDocuments.packetId, packetIds)).orderBy(asc(permitPacketDocuments.createdAt))
      : [];

    const docsByPacket = new Map<string, Array<typeof permitPacketDocuments.$inferSelect>>();
    for (const d of docs) {
      const arr = docsByPacket.get(d.packetId) || [];
      arr.push(d);
      docsByPacket.set(d.packetId, arr);
    }

    return packets.map(p => ({
      packet: p.packet,
      jurisdiction: p.jurisdiction,
      permitType: p.permitType,
      documents: docsByPacket.get(p.packet.id) || [],
      job: p.job,
    }));
  },

  async getStats(): Promise<Record<string, number>> {
    const rows = await db
      .select({
        status: permitPackets.status,
        count: count(),
      })
      .from(permitPackets)
      .groupBy(permitPackets.status);

    const stats: Record<string, number> = {
      detected: 0,
      generating: 0,
      needs_customer_info: 0,
      ready_for_review: 0,
      ready_to_submit: 0,
      submitted: 0,
      closed: 0,
      error: 0,
      total: 0,
    };

    for (const r of rows) {
      stats[r.status] = r.count;
      stats.total += r.count;
    }

    return stats;
  },
};
