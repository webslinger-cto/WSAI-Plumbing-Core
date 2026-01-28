import { db } from "../../db";
import { permitJurisdictions, permitTemplates, permitTypes } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { putPdf, computeHash, isS3Configured } from "./storageS3";
import { emitWebhookEvent } from "./webhooks";

interface FormCheckResult {
  jurisdictionId: string;
  updated: boolean;
  templateId?: string;
  error?: string;
}

export async function checkJurisdictionForms(jurisdictionId: string): Promise<FormCheckResult> {
  const jurisdiction = await db.query.permitJurisdictions.findFirst({
    where: eq(permitJurisdictions.id, jurisdictionId),
  });
  
  if (!jurisdiction) {
    return { jurisdictionId, updated: false, error: "Jurisdiction not found" };
  }
  
  const pdfUrl = jurisdiction.formsPdfUrl || jurisdiction.formsPageUrl;
  if (!pdfUrl) {
    return { jurisdictionId, updated: false, error: "No forms URL configured" };
  }
  
  try {
    const pdfBuffer = await fetchPdfFromUrl(pdfUrl);
    const newHash = computeHash(pdfBuffer);
    
    const permitTypesList = await db.query.permitTypes.findMany({
      where: eq(permitTypes.isActive, true),
    });
    
    let anyUpdated = false;
    let templateId: string | undefined;
    
    for (const permitType of permitTypesList) {
      const existingTemplate = await db.query.permitTemplates.findFirst({
        where: and(
          eq(permitTemplates.jurisdictionId, jurisdictionId),
          eq(permitTemplates.permitTypeId, permitType.id),
          eq(permitTemplates.isActive, true),
        ),
      });
      
      if (!existingTemplate || existingTemplate.fileSha256 !== newHash) {
        const result = await updateOrCreateTemplate(
          jurisdictionId,
          permitType.id,
          pdfBuffer,
          newHash,
          pdfUrl,
          existingTemplate,
        );
        anyUpdated = true;
        templateId = result.id;
        
        await emitWebhookEvent("permit.template.updated", {
          jurisdictionId,
          permitTypeId: permitType.id,
          templateId: result.id,
          previousVersion: existingTemplate?.version || 0,
          newVersion: result.version,
        });
      }
    }
    
    await db.update(permitJurisdictions)
      .set({ 
        lastCheckedAt: new Date(),
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(permitJurisdictions.id, jurisdictionId));
    
    return { jurisdictionId, updated: anyUpdated, templateId };
  } catch (error) {
    console.error(`[FormsCheck] Error checking forms for jurisdiction ${jurisdictionId}:`, error);
    return { 
      jurisdictionId, 
      updated: false, 
      error: String(error),
    };
  }
}

async function fetchPdfFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("pdf")) {
    console.warn(`[FormsCheck] Warning: Content-Type is ${contentType}, not PDF`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function updateOrCreateTemplate(
  jurisdictionId: string,
  permitTypeId: string,
  pdfBuffer: Buffer,
  sha256: string,
  sourceUrl: string,
  existingTemplate: any,
): Promise<{ id: string; version: number }> {
  const newVersion = (existingTemplate?.version || 0) + 1;
  
  let fileKey: string | null = null;
  let fileSize = pdfBuffer.length;
  
  if (isS3Configured()) {
    const uploadResult = await putPdf(pdfBuffer, "templates");
    fileKey = uploadResult.fileKey;
    fileSize = uploadResult.size;
  }
  
  if (existingTemplate) {
    await db.update(permitTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(permitTemplates.id, existingTemplate.id));
  }
  
  const [newTemplate] = await db.insert(permitTemplates)
    .values({
      jurisdictionId,
      permitTypeId,
      name: existingTemplate?.name || `${jurisdictionId} Permit Form`,
      version: newVersion,
      sourceUrl,
      fileKey,
      fileSha256: sha256,
      fileSize,
      fieldMapJsonb: existingTemplate?.fieldMapJsonb || {},
      overlayMapJsonb: existingTemplate?.overlayMapJsonb || {},
      customerFieldPolicyJsonb: existingTemplate?.customerFieldPolicyJsonb || {},
      isActive: true,
    })
    .returning();
  
  return { id: newTemplate.id, version: newVersion };
}

export async function checkAllJurisdictions(): Promise<FormCheckResult[]> {
  const jurisdictions = await db.query.permitJurisdictions.findMany({
    where: eq(permitJurisdictions.isActive, true),
  });
  
  const results: FormCheckResult[] = [];
  for (const jurisdiction of jurisdictions) {
    const result = await checkJurisdictionForms(jurisdiction.id);
    results.push(result);
  }
  
  return results;
}
