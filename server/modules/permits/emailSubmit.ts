import { db } from "../../db";
import { permitPackets, permitPacketDocuments, permitSubmissions, permitJurisdictions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getSignedDownloadUrl, isS3Configured } from "./storageS3";
import { emitWebhookEvent } from "./webhooks";
import { Resend } from "resend";

const PERMITS_FROM_EMAIL = process.env.PERMITS_FROM_EMAIL || "permits@emergencychicagosewerexperts.com";

export async function submitPacketViaEmail(
  packetId: string,
  destinationEmail: string,
): Promise<{ submissionId: string; messageId?: string }> {
  const packet = await db.query.permitPackets.findFirst({
    where: eq(permitPackets.id, packetId),
  });
  
  if (!packet) {
    throw new Error(`Packet ${packetId} not found`);
  }
  
  const jurisdiction = await db.query.permitJurisdictions.findFirst({
    where: eq(permitJurisdictions.id, packet.jurisdictionId),
  });
  
  const documents = await db.query.permitPacketDocuments.findMany({
    where: eq(permitPacketDocuments.packetId, packetId),
  });
  
  if (documents.length === 0) {
    throw new Error(`No documents found for packet ${packetId}`);
  }
  
  const attachments: { filename: string; content: Buffer | string }[] = [];
  const downloadLinks: string[] = [];
  
  for (const doc of documents) {
    if (doc.fileKey && isS3Configured()) {
      const signedUrl = await getSignedDownloadUrl(doc.fileKey, 7 * 24 * 60 * 60);
      downloadLinks.push(`${doc.filename}: ${signedUrl}`);
      
      if ((doc.fileSize || 0) < 5 * 1024 * 1024) {
        const response = await fetch(signedUrl);
        const arrayBuffer = await response.arrayBuffer();
        attachments.push({
          filename: doc.filename,
          content: Buffer.from(arrayBuffer),
        });
      }
    } else if (doc.url?.startsWith("data:")) {
      const base64Data = doc.url.split(",")[1];
      if (base64Data) {
        attachments.push({
          filename: doc.filename,
          content: Buffer.from(base64Data, "base64"),
        });
      }
    }
  }
  
  const emailBody = buildEmailBody(packet, jurisdiction, downloadLinks);
  
  let messageId: string | undefined;
  
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    
    const emailResult = await resend.emails.send({
      from: PERMITS_FROM_EMAIL,
      to: [destinationEmail],
      subject: `Permit Application Submission - Job #${packet.jobId}`,
      html: emailBody,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: a.content as Buffer,
      })),
    });
    
    messageId = emailResult.data?.id;
  } else {
    console.log(`[EmailSubmit] Would send email to ${destinationEmail}:`);
    console.log(emailBody);
    messageId = `simulated-${Date.now()}`;
  }
  
  const [submission] = await db.insert(permitSubmissions)
    .values({
      packetId,
      method: "email",
      destinationEmail,
      messageId,
      statusJsonb: { sent: true, sentAt: new Date().toISOString() },
    })
    .returning();
  
  await db.update(permitPackets)
    .set({ 
      status: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(permitPackets.id, packetId));
  
  await emitWebhookEvent("permit.packet.submitted", {
    packetId,
    jobId: packet.jobId,
    method: "email",
    destinationEmail,
    submissionId: submission.id,
    messageId,
  });
  
  return { submissionId: submission.id, messageId };
}

function buildEmailBody(
  packet: any,
  jurisdiction: any | null,
  downloadLinks: string[],
): string {
  const jurisdictionName = jurisdiction?.name || "Unknown Jurisdiction";
  
  let linksHtml = "";
  if (downloadLinks.length > 0) {
    linksHtml = `
      <h3>Document Download Links</h3>
      <p>The following links are valid for 7 days:</p>
      <ul>
        ${downloadLinks.map(link => `<li>${link}</li>`).join("\n")}
      </ul>
    `;
  }
  
  return `
    <html>
      <body>
        <h2>Permit Application Submission</h2>
        <p>Please find attached the permit application documents for the following job:</p>
        
        <table border="1" cellpadding="8" cellspacing="0">
          <tr>
            <td><strong>Job ID:</strong></td>
            <td>${packet.jobId}</td>
          </tr>
          <tr>
            <td><strong>Jurisdiction:</strong></td>
            <td>${jurisdictionName}</td>
          </tr>
          <tr>
            <td><strong>Submission Date:</strong></td>
            <td>${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
        
        ${linksHtml}
        
        <p>Please review the attached documents and process this permit application.</p>
        
        <p>Thank you,<br/>
        Emergency Chicago Sewer Experts</p>
      </body>
    </html>
  `;
}

export async function submitPacketAssisted(
  packetId: string,
  confirmationNumber: string,
  notes?: string,
): Promise<{ submissionId: string }> {
  const packet = await db.query.permitPackets.findFirst({
    where: eq(permitPackets.id, packetId),
  });
  
  if (!packet) {
    throw new Error(`Packet ${packetId} not found`);
  }
  
  const [submission] = await db.insert(permitSubmissions)
    .values({
      packetId,
      method: "assisted",
      confirmationNumber,
      notes,
      statusJsonb: { manuallySubmitted: true, submittedAt: new Date().toISOString() },
    })
    .returning();
  
  await db.update(permitPackets)
    .set({ 
      status: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(permitPackets.id, packetId));
  
  await emitWebhookEvent("permit.packet.submitted", {
    packetId,
    jobId: packet.jobId,
    method: "assisted",
    confirmationNumber,
    submissionId: submission.id,
  });
  
  return { submissionId: submission.id };
}
