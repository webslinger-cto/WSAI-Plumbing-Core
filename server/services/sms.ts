import { RestClient } from "@signalwire/compatibility-api";

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const projectId = process.env.SIGNALWIRE_PROJECT_ID;
const apiToken = process.env.SIGNALWIRE_API_TOKEN;
const spaceUrl = process.env.SIGNALWIRE_SPACE_URL;
const fromNumber = process.env.SIGNALWIRE_PHONE_NUMBER;

function getClient(): ReturnType<typeof RestClient> | null {
  if (!projectId || !apiToken || !spaceUrl) {
    console.warn("SignalWire credentials not configured");
    return null;
  }
  return RestClient(projectId, apiToken, { signalwireSpaceUrl: spaceUrl });
}

export async function sendSMS(to: string, body: string): Promise<SMSResult> {
  const client = getClient();
  
  if (!client) {
    return { success: false, error: "SMS service not configured" };
  }
  
  if (!fromNumber) {
    return { success: false, error: "From phone number not configured" };
  }

  try {
    const message = await client.messages.create({
      from: fromNumber,
      to: to,
      body: body,
    });
    
    console.log(`SMS sent successfully: ${message.sid}`);
    return { success: true, messageId: message.sid };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to send SMS:", errorMessage);
    return { success: false, error: errorMessage };
  }
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
  return !!(projectId && apiToken && spaceUrl && fromNumber);
}

export function getDebugInfo(): { fromNumberFormat: string; fromNumberLength: number } {
  if (!fromNumber) {
    return { fromNumberFormat: "NOT SET", fromNumberLength: 0 };
  }
  // Show first 3 chars and last 2 chars for debugging
  const masked = fromNumber.length > 5 
    ? `${fromNumber.slice(0, 3)}***${fromNumber.slice(-2)}`
    : "***";
  return { fromNumberFormat: masked, fromNumberLength: fromNumber.length };
}
