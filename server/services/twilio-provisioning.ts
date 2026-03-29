// ─── Twilio Number Auto-Provisioning ──────────────────────────────────────────
// Automatically searches, purchases, and configures Twilio phone numbers
// for new MCTB subscribers. Fully automated — no human intervention.

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

function getClient(): twilio.Twilio {
  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  }
  return twilio(accountSid, authToken);
}

function getWebhookBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null) ||
    "https://app.bossman.io"
  );
}

// ─── Area code lookup from zip code ──────────────────────────────────────────
// Maps zip code prefixes to common area codes. Not perfect, but good enough
// for provisioning a "local-ish" number. Twilio will find the closest match.
function areaCodeFromZip(zip: string): string | null {
  // Use first 3 digits of zip as a rough geographic proxy
  // For production, use a proper zip-to-area-code API
  const zipPrefix = zip.slice(0, 3);
  const ZIP_TO_AREA: Record<string, string> = {
    // NJ
    "080": "856", "081": "856", "070": "201", "071": "201", "076": "973", "077": "973",
    // PA / Philadelphia
    "190": "215", "191": "215", "194": "610",
    // NY
    "100": "212", "101": "212", "110": "516", "112": "718", "113": "718",
    // IL / Chicago
    "606": "312", "601": "630", "604": "847",
    // TX
    "750": "214", "770": "713", "786": "210", "787": "512",
    // FL
    "331": "407", "332": "305", "336": "813", "339": "954",
    // CA
    "900": "213", "902": "310", "906": "626", "940": "408", "945": "510", "950": "415",
    // GA / Atlanta
    "300": "404", "303": "770",
  };
  return ZIP_TO_AREA[zipPrefix] || null;
}

export interface ProvisionResult {
  success: boolean;
  twilioNumberSid?: string;
  twilioNumber?: string;
  areaCode?: string;
  error?: string;
}

/**
 * Search for and purchase a local Twilio number matching the customer's area.
 * Configures voice + SMS webhooks automatically.
 *
 * @param businessPhone - Customer's existing business phone (used to extract area code)
 * @param businessZip - Customer's zip code (fallback for area code matching)
 * @param accountId - MCTB account ID (passed to webhook for routing)
 */
export async function provisionNumber(
  businessPhone: string,
  businessZip: string | null,
  accountId: string
): Promise<ProvisionResult> {
  const client = getClient();
  const baseUrl = getWebhookBaseUrl();

  // Extract area code from their business phone, or zip code
  const phoneDigits = businessPhone.replace(/\D/g, "");
  let targetAreaCode = phoneDigits.length >= 10 ? phoneDigits.slice(phoneDigits.length - 10, phoneDigits.length - 7) : null;

  // If we couldn't get area code from phone, try zip
  if (!targetAreaCode && businessZip) {
    targetAreaCode = areaCodeFromZip(businessZip);
  }

  console.log(`[Provisioning] Searching for number in area code ${targetAreaCode || "any"} for account ${accountId}`);

  try {
    // Step 1: Search for available local numbers
    let available;
    try {
      const searchParams: any = { limit: 5, voiceEnabled: true, smsEnabled: true };
      if (targetAreaCode) {
        searchParams.areaCode = parseInt(targetAreaCode);
      }
      available = await client.availablePhoneNumbers("US").local.list(searchParams);
    } catch (searchErr) {
      // If area code search fails, try without area code filter
      console.log(`[Provisioning] No numbers in area code ${targetAreaCode}, trying nearby...`);
      available = await client.availablePhoneNumbers("US").local.list({
        limit: 5,
        voiceEnabled: true,
        smsEnabled: true,
        // Twilio will return numbers from nearby area codes
      });
    }

    if (!available || available.length === 0) {
      return { success: false, error: "No phone numbers available in this area" };
    }

    const selectedNumber = available[0];
    console.log(`[Provisioning] Found number: ${selectedNumber.phoneNumber}`);

    // Step 2: Purchase the number
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: selectedNumber.phoneNumber,
      friendlyName: `BossMan MCTB - ${accountId}`,
      // Step 3: Configure webhooks on purchase
      voiceUrl: `${baseUrl}/api/webhooks/mctb/voice?accountId=${accountId}`,
      voiceMethod: "POST",
      voiceFallbackUrl: `${baseUrl}/api/webhooks/mctb/voice-fallback?accountId=${accountId}`,
      smsUrl: `${baseUrl}/api/webhooks/mctb/sms?accountId=${accountId}`,
      smsMethod: "POST",
      statusCallback: `${baseUrl}/api/webhooks/mctb/status?accountId=${accountId}`,
    });

    const areaCode = selectedNumber.phoneNumber.slice(2, 5); // +1XXX...

    console.log(`[Provisioning] Purchased and configured: ${purchased.phoneNumber} (SID: ${purchased.sid})`);

    return {
      success: true,
      twilioNumberSid: purchased.sid,
      twilioNumber: purchased.phoneNumber,
      areaCode,
    };
  } catch (err: any) {
    console.error(`[Provisioning] Failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Release a Twilio number back (when customer cancels).
 * Holds for 30 days before actual release via a separate cron.
 */
export async function releaseNumber(twilioNumberSid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
    await client.incomingPhoneNumbers(twilioNumberSid).remove();
    console.log(`[Provisioning] Released number SID: ${twilioNumberSid}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Provisioning] Release failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Update webhook URLs on an existing Twilio number (e.g., after domain change).
 */
export async function updateNumberWebhooks(
  twilioNumberSid: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
    const baseUrl = getWebhookBaseUrl();

    await client.incomingPhoneNumbers(twilioNumberSid).update({
      voiceUrl: `${baseUrl}/api/webhooks/mctb/voice?accountId=${accountId}`,
      smsUrl: `${baseUrl}/api/webhooks/mctb/sms?accountId=${accountId}`,
      statusCallback: `${baseUrl}/api/webhooks/mctb/status?accountId=${accountId}`,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send a test call to verify forwarding is working.
 * Calls the customer's business number — if forwarding is set up correctly,
 * it'll hit the Twilio number and trigger the MCTB auto-text.
 */
export async function sendTestCall(
  businessPhone: string
): Promise<{ success: boolean; callSid?: string; error?: string }> {
  try {
    const client = getClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) return { success: false, error: "No Twilio phone number configured" };

    const call = await client.calls.create({
      to: businessPhone.startsWith("+") ? businessPhone : `+1${businessPhone.replace(/\D/g, "")}`,
      from: fromNumber,
      // Ring for 15 seconds then hang up — simulates a missed call
      twiml: "<Response><Pause length=\"15\"/><Hangup/></Response>",
    });

    console.log(`[Provisioning] Test call initiated to ${businessPhone}: ${call.sid}`);
    return { success: true, callSid: call.sid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
