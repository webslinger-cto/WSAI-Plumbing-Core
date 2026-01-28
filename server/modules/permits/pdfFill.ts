import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { db } from "../../db";
import { permitPackets, permitPacketDocuments, permitTemplates, jobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { putPdf, isS3Configured, getSignedDownloadUrl } from "./storageS3";
import { emitWebhookEvent } from "./webhooks";

interface FieldMap {
  [acroFormFieldName: string]: {
    source: "job" | "customer" | "company" | "static";
    field?: string;
    value?: string;
  };
}

interface OverlayPosition {
  x: number;
  y: number;
  page: number;
  fontSize?: number;
  maxWidth?: number;
}

interface OverlayMap {
  [dataKey: string]: OverlayPosition;
}

interface CustomerFieldPolicy {
  fields: string[];
  requiresConsent?: boolean;
}

export async function generatePacketFromTemplate(
  packetId: string,
  templateId: string,
): Promise<{ documentId: string; fileKey?: string; url?: string }> {
  const packet = await db.query.permitPackets.findFirst({
    where: eq(permitPackets.id, packetId),
  });
  
  if (!packet) {
    throw new Error(`Packet ${packetId} not found`);
  }
  
  const template = await db.query.permitTemplates.findFirst({
    where: eq(permitTemplates.id, templateId),
  });
  
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }
  
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, packet.jobId),
  });
  
  if (!job) {
    throw new Error(`Job ${packet.jobId} not found`);
  }
  
  await db.update(permitPackets)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(permitPackets.id, packetId));
  
  try {
    let pdfBytes: Uint8Array;
    
    if (template.fileKey && isS3Configured()) {
      const signedUrl = await getSignedDownloadUrl(template.fileKey);
      const response = await fetch(signedUrl);
      const arrayBuffer = await response.arrayBuffer();
      pdfBytes = new Uint8Array(arrayBuffer);
    } else {
      pdfBytes = await createBlankPdf();
    }
    
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    const fieldMap = template.fieldMapJsonb as FieldMap;
    const overlayMap = template.overlayMapJsonb as OverlayMap;
    const customerPolicy = template.customerFieldPolicyJsonb as CustomerFieldPolicy;
    
    const dataContext = buildDataContext(job, packet, customerPolicy);
    
    await fillAcroFormFields(pdfDoc, fieldMap, dataContext);
    
    await fillOverlayText(pdfDoc, overlayMap, dataContext);
    
    const filledPdfBytes = await pdfDoc.save();
    const filledBuffer = Buffer.from(filledPdfBytes);
    
    let fileKey: string | undefined;
    let fileSize = filledBuffer.length;
    let url: string | undefined;
    
    if (isS3Configured()) {
      const uploadResult = await putPdf(filledBuffer, "packets");
      fileKey = uploadResult.fileKey;
      fileSize = uploadResult.size;
    } else {
      url = `data:application/pdf;base64,${filledBuffer.toString("base64")}`;
    }
    
    const [document] = await db.insert(permitPacketDocuments)
      .values({
        packetId,
        docType: "application_pdf",
        filename: `permit_application_${packetId}.pdf`,
        mimeType: "application/pdf",
        fileKey,
        fileSize,
        sha256: null,
        url,
        templateId,
      })
      .returning();
    
    const hasCustomerFields = customerPolicy?.fields?.length > 0;
    const newStatus = hasCustomerFields ? "needs_customer_info" : "ready_for_review";
    
    await db.update(permitPackets)
      .set({ 
        status: newStatus, 
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(permitPackets.id, packetId));
    
    await emitWebhookEvent(`permit.packet.${newStatus === "needs_customer_info" ? "needs_customer_info" : "ready_for_review"}`, {
      packetId,
      jobId: packet.jobId,
      templateId,
      documentId: document.id,
    });
    
    return { documentId: document.id, fileKey, url };
  } catch (error) {
    console.error(`[PdfFill] Error generating packet ${packetId}:`, error);
    
    await db.update(permitPackets)
      .set({ 
        status: "error", 
        errorMessage: String(error),
        updatedAt: new Date(),
      })
      .where(eq(permitPackets.id, packetId));
    
    await emitWebhookEvent("permit.error", {
      packetId,
      jobId: packet.jobId,
      error: String(error),
    });
    
    throw error;
  }
}

function buildDataContext(
  job: any,
  packet: any,
  customerPolicy?: CustomerFieldPolicy,
): Record<string, string> {
  const context: Record<string, string> = {};
  
  context["job.title"] = job.title || "";
  context["job.description"] = job.description || "";
  context["job.address"] = job.address || "";
  context["job.serviceType"] = job.serviceType || "";
  context["job.scheduledDate"] = job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "";
  context["job.id"] = job.id;
  
  context["company.name"] = "Emergency Chicago Sewer Experts";
  context["company.address"] = "";
  context["company.phone"] = "";
  context["company.license"] = "";
  
  const customerInfo = packet.customerInfo || {};
  const customerFields = customerPolicy?.fields || [];
  
  for (const [key, value] of Object.entries(customerInfo)) {
    if (!customerFields.includes(key)) {
      context[`customer.${key}`] = String(value);
    }
  }
  
  context["date.today"] = new Date().toLocaleDateString();
  context["date.year"] = new Date().getFullYear().toString();
  
  return context;
}

async function fillAcroFormFields(
  pdfDoc: PDFDocument,
  fieldMap: FieldMap,
  dataContext: Record<string, string>,
): Promise<void> {
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    for (const field of fields) {
      const fieldName = field.getName();
      const mapping = fieldMap[fieldName];
      
      if (!mapping) continue;
      
      let value = "";
      
      if (mapping.source === "static" && mapping.value) {
        value = mapping.value;
      } else if (mapping.field) {
        const contextKey = `${mapping.source}.${mapping.field}`;
        value = dataContext[contextKey] || "";
      }
      
      if (value) {
        try {
          const textField = form.getTextField(fieldName);
          textField.setText(value);
        } catch (e) {
        }
      }
    }
  } catch (error) {
    console.warn("[PdfFill] AcroForm fill skipped (no form or error):", error);
  }
}

async function fillOverlayText(
  pdfDoc: PDFDocument,
  overlayMap: OverlayMap,
  dataContext: Record<string, string>,
): Promise<void> {
  if (!overlayMap || Object.keys(overlayMap).length === 0) {
    return;
  }
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  
  for (const [dataKey, position] of Object.entries(overlayMap)) {
    const value = dataContext[dataKey];
    if (!value) continue;
    
    const pageIndex = (position.page || 1) - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const fontSize = position.fontSize || 10;
    
    page.drawText(value, {
      x: position.x,
      y: position.y,
      size: fontSize,
      font: helvetica,
      color: rgb(0, 0, 0),
      maxWidth: position.maxWidth,
    });
  }
}

async function createBlankPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  page.drawText("Permit Application", {
    x: 50,
    y: 720,
    size: 24,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  page.drawText("No template available - please configure a PDF template for this jurisdiction.", {
    x: 50,
    y: 680,
    size: 12,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  return await pdfDoc.save();
}

export async function finalizePacketWithCustomerInfo(
  packetId: string,
  customerFields: Record<string, string>,
  doNotStorePII: boolean = false,
): Promise<{ documentId: string }> {
  const packet = await db.query.permitPackets.findFirst({
    where: eq(permitPackets.id, packetId),
  });
  
  if (!packet) {
    throw new Error(`Packet ${packetId} not found`);
  }
  
  const existingDoc = await db.query.permitPacketDocuments.findFirst({
    where: eq(permitPacketDocuments.packetId, packetId),
  });
  
  if (!existingDoc) {
    throw new Error(`No document found for packet ${packetId}`);
  }
  
  if (!doNotStorePII) {
    await db.update(permitPackets)
      .set({ 
        customerInfo: { ...packet.customerInfo as object, ...customerFields },
        updatedAt: new Date(),
      })
      .where(eq(permitPackets.id, packetId));
  }
  
  await db.update(permitPackets)
    .set({ 
      status: "ready_to_submit",
      updatedAt: new Date(),
    })
    .where(eq(permitPackets.id, packetId));
  
  await emitWebhookEvent("permit.packet.ready_to_submit", {
    packetId,
    jobId: packet.jobId,
    documentId: existingDoc.id,
  });
  
  return { documentId: existingDoc.id };
}
