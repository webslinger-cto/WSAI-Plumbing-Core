import twilio from "twilio";
import { sendEmail } from "./email";

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Carrier email-to-SMS gateways (fallback when Twilio unavailable)
const CARRIER_GATEWAYS: Record<string, string> = {
  "6306661640": "txt.att.net",  // AT&T
};

// Get carrier gateway for a phone number (if known)
function getCarrierGateway(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return CARRIER_GATEWAYS[last10] || null;
}

// Send SMS via carrier email gateway
async function sendViaCarrierGateway(to: string, body: string): Promise<SMSResult> {
  const digits = to.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  const gateway = getCarrierGateway(to);
  
  if (!gateway) {
    return { success: false, error: "No carrier gateway configured for this number" };
  }
  
  const emailAddress = `${last10}@${gateway}`;
  console.log(`SMS: Sending via carrier gateway to ${emailAddress}`);
  
  try {
    const result = await sendEmail({
      to: emailAddress,
      subject: "",
      html: body,
      text: body,
    });
    
    if (result.success) {
      console.log(`SMS sent via carrier gateway: ${emailAddress}`);
      return { success: true, messageId: `gateway-${result.messageId}` };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Twilio credentials
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// SignalWire credentials (fallback)
const signalwireProjectId = process.env.SIGNALWIRE_PROJECT_ID;
const signalwireApiToken = process.env.SIGNALWIRE_API_TOKEN;
const signalwireSpaceUrl = process.env.SIGNALWIRE_SPACE_URL;
const signalwirePhoneNumber = process.env.SIGNALWIRE_PHONE_NUMBER;

function getTwilioClient(): twilio.Twilio | null {
  if (!twilioAccountSid || !twilioAuthToken) {
    return null;
  }
  return twilio(twilioAccountSid, twilioAuthToken);
}

// Normalize phone number to E.164 format (+1XXXXXXXXXX)
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // If already has country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  // If 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If already formatted with + sign, return as-is
  if (phone.startsWith("+")) {
    return phone;
  }
  
  // Return original if we can't normalize
  return phone;
}

export async function sendSMS(to: string, body: string): Promise<SMSResult> {
  // Normalize phone number to E.164 format
  const normalizedTo = normalizePhoneNumber(to);
  console.log(`SMS: Normalizing ${to} -> ${normalizedTo}`);
  
  // Check if this number has a carrier gateway - use it FIRST (bypasses Twilio verification issues)
  const gateway = getCarrierGateway(to);
  if (gateway) {
    console.log(`SMS: Using carrier email gateway for ${to} (bypassing Twilio)`);
    const gatewayResult = await sendViaCarrierGateway(to, body);
    if (gatewayResult.success) {
      return gatewayResult;
    }
    console.log(`SMS: Carrier gateway failed, trying Twilio as fallback`);
  }
  
  // Try Twilio 
  const twilioClient = getTwilioClient();
  
  if (twilioClient && twilioPhoneNumber) {
    try {
      const message = await twilioClient.messages.create({
        from: twilioPhoneNumber,
        to: normalizedTo,
        body: body,
      });
      
      console.log(`SMS sent via Twilio: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Twilio SMS failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Fallback to SignalWire if Twilio not configured
  if (signalwireProjectId && signalwireApiToken && signalwireSpaceUrl && signalwirePhoneNumber) {
    try {
      const { RestClient } = await import("@signalwire/compatibility-api");
      const client = RestClient(signalwireProjectId, signalwireApiToken, { 
        signalwireSpaceUrl: signalwireSpaceUrl 
      });
      
      const message = await client.messages.create({
        from: signalwirePhoneNumber,
        to: normalizedTo,
        body: body,
      });
      
      console.log(`SMS sent via SignalWire: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("SignalWire SMS failed:", errorMessage);
      // Fall through to carrier gateway
    }
  }

  return { success: false, error: "SMS service not configured" };
}

export async function sendAppointmentReminder(
  customerPhone: string,
  customerName: string,
  appointmentDate: Date,
  technicianName: string,
  jobAddress: string
): Promise<SMSResult> {
  const dateStr = appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = appointmentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const message = `Hi ${customerName}, this is a reminder of your appointment with Chicago Sewer Experts on ${dateStr} at ${timeStr}. ${technicianName} will arrive at ${jobAddress}. Reply CONFIRM to confirm or call us to reschedule.`;

  return sendSMS(customerPhone, message);
}

export async function sendJobConfirmation(
  customerPhone: string,
  customerName: string,
  jobDescription: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, thank you for choosing Chicago Sewer Experts! We have received your request for: ${jobDescription}. A technician will be assigned shortly. We will contact you with appointment details.`;

  return sendSMS(customerPhone, message);
}

export async function sendTechnicianEnRoute(
  customerPhone: string,
  customerName: string,
  technicianName: string,
  estimatedArrival: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, ${technicianName} from Chicago Sewer Experts is on the way! Estimated arrival: ${estimatedArrival}. Call or text if you have questions.`;

  return sendSMS(customerPhone, message);
}

export async function sendJobComplete(
  customerPhone: string,
  customerName: string,
  technicianName: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, ${technicianName} has completed the work at your location. Thank you for choosing Chicago Sewer Experts! Please let us know if you have any questions.`;

  return sendSMS(customerPhone, message);
}

export async function sendQuoteReady(
  customerPhone: string,
  customerName: string,
  quoteUrl: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, your quote from Chicago Sewer Experts is ready! View it here: ${quoteUrl}. Reply or call us with any questions.`;

  return sendSMS(customerPhone, message);
}

export function isConfigured(): boolean {
  const hasTwilio = !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber);
  const hasSignalWire = !!(signalwireProjectId && signalwireApiToken && signalwireSpaceUrl && signalwirePhoneNumber);
  return hasTwilio || hasSignalWire;
}

export function getActiveProvider(): string {
  if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
    return "Twilio";
  }
  if (signalwireProjectId && signalwireApiToken && signalwireSpaceUrl && signalwirePhoneNumber) {
    return "SignalWire";
  }
  return "None";
}

export function getDebugInfo(): { fromNumberFormat: string; fromNumberLength: number; provider: string } {
  const provider = getActiveProvider();
  let fromNumber: string | undefined;
  
  if (provider === "Twilio") {
    fromNumber = twilioPhoneNumber;
  } else if (provider === "SignalWire") {
    fromNumber = signalwirePhoneNumber;
  }
  
  if (!fromNumber) {
    return { fromNumberFormat: "NOT SET", fromNumberLength: 0, provider };
  }
  
  const masked = fromNumber.length > 5 
    ? `${fromNumber.slice(0, 3)}***${fromNumber.slice(-2)}`
    : "***";
  return { fromNumberFormat: masked, fromNumberLength: fromNumber.length, provider };
}
