// ─── MCTB Multi-Tenant Handler ────────────────────────────────────────────────
// Handles incoming calls/SMS for provisioned MCTB numbers.
// Routes to the correct account based on the Twilio number or query param.

import { storage } from "../storage";
import * as smsService from "./sms";

const DEFAULT_TEMPLATE = (businessName: string, intakeUrl?: string) => {
  const base = `Hey! This is ${businessName} — sorry we missed your call.`;
  if (intakeUrl) {
    return `${base} Tell us what you need and we'll get right back to you: ${intakeUrl}`;
  }
  return `${base} Tell us what you need and we'll get back to you ASAP. Reply to this text or call us back.`;
};

/**
 * Handle an incoming missed call on a provisioned MCTB number.
 * Looks up the account, sends the auto-text, logs the call.
 */
export async function handleMissedCall(
  accountId: string,
  callerPhone: string,
  twilioCallSid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await storage.getMctbAccount(accountId);
    if (!account || account.status !== "active") {
      console.log(`[MCTB] Account ${accountId} not found or inactive`);
      return { success: false, error: "Account not active" };
    }

    const businessName = account.businessName;
    const baseUrl = process.env.APP_BASE_URL || "https://app.bossman.io";
    const intakeUrl = account.intakeFormEnabled && account.companySlug
      ? `${baseUrl}/public/intake?ref=${account.companySlug}`
      : undefined;

    // Build the auto-text message
    const message = account.autoTextTemplate
      ? account.autoTextTemplate.replace("{business_name}", businessName).replace("{intake_url}", intakeUrl || "")
      : DEFAULT_TEMPLATE(businessName, intakeUrl);

    // Send auto-text to the caller FROM the provisioned Twilio number
    let autoTextSid: string | undefined;
    let autoTextSent = false;

    if (account.twilioNumber && smsService.isConfigured()) {
      // Use the provisioned number as the sender so it looks local
      const result = await smsService.sendSMS(callerPhone, message, account.twilioNumber);
      autoTextSent = result.success;
      autoTextSid = result.messageId;
      console.log(`[MCTB] Auto-text to ${callerPhone} from ${account.twilioNumber}: ${result.success ? "sent" : result.error}`);
    }

    // Log the call
    await storage.createMctbCallLog({
      accountId: account.id,
      callerPhone,
      twilioCallSid,
      autoTextSent,
      autoTextSid: autoTextSid || null,
      autoTextBody: message,
    });

    // Notify the business owner via SMS
    if (account.businessPhone) {
      const ownerNotify = `Missed call from ${callerPhone}. BossMan auto-texted them. Check your dashboard for details.`;
      await smsService.sendSMS(account.businessPhone, ownerNotify);
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[MCTB] Handle missed call error:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Handle an incoming SMS reply from a customer on an MCTB number.
 * Updates the call log and notifies the business owner.
 */
export async function handleCustomerReply(
  accountId: string,
  fromPhone: string,
  body: string
): Promise<void> {
  try {
    const account = await storage.getMctbAccount(accountId);
    if (!account) return;

    // Find the most recent call log for this caller
    const callLog = await storage.getRecentMctbCallLog(accountId, fromPhone);
    if (callLog) {
      await storage.updateMctbCallLog(callLog.id, {
        customerReplied: true,
        customerReply: body,
        customerRepliedAt: new Date(),
      });
    }

    // Forward the reply to the business owner
    if (account.businessPhone) {
      const notification = `Customer reply from ${fromPhone}: "${body.slice(0, 160)}"`;
      await smsService.sendSMS(account.businessPhone, notification);
    }

    console.log(`[MCTB] Customer reply for account ${accountId} from ${fromPhone}: ${body.slice(0, 50)}...`);
  } catch (err) {
    console.error(`[MCTB] Handle reply error:`, err);
  }
}
