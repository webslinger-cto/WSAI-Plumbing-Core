// ─── Twilio Webhook Handlers ─────────────────────────────────────────────────
// Single source of truth for all Twilio voice/SMS webhooks.
// Twilio POSTs to these endpoints when someone calls or texts your numbers.
//
// Setup:
//   In Twilio Console → Phone Numbers → each number:
//     Voice webhook:  https://<your-app>/api/twilio/voice   (HTTP POST)
//     SMS webhook:    https://<your-app>/api/twilio/sms     (HTTP POST)
//
// Required env vars:
//   TWILIO_ACCOUNT_SID   — Twilio account SID
//   TWILIO_AUTH_TOKEN     — Twilio auth token
//   TWILIO_A2P_NUMBER    — Your A2P-registered number (e.g. +18568306568)
//
// ─────────────────────────────────────────────────────────────────────────────

import type { Express, Request, Response } from "express";
import twilio from "twilio";

// ── Your BossMan demo numbers ────────────────────────────────────────────────
// Add any Twilio numbers you own here. Calls to these trigger auto-textback.
const BOSSMAN_NUMBERS = ["+18568306568", "+16306268905"];

// ── Auto-text message ────────────────────────────────────────────────────────
const AUTO_TEXT_MESSAGE =
  "Hey! Sorry we missed your call. Tell us what you need and we'll get right back to you. Reply to this text or call us back anytime.";

// ── Demo config: temporary custom messages keyed by caller phone ─────────────
// Prospects set their custom message during the activate flow.
// When they call to test, they get THEIR message back. Expires after 30 min.
interface DemoConfig {
  message: string;
  linkUrl?: string;
  businessName?: string;
  expiresAt: number;
}
const demoConfigs = new Map<string, DemoConfig>();

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  demoConfigs.forEach((config, phone) => {
    if (config.expiresAt < now) demoConfigs.delete(phone);
  });
}, 10 * 60 * 1000);

function getDemoMessage(callerPhone: string): string | null {
  const config = demoConfigs.get(callerPhone);
  if (!config || config.expiresAt < Date.now()) {
    if (config) demoConfigs.delete(callerPhone);
    return null;
  }
  let msg = config.message;
  if (config.linkUrl) msg += ` ${config.linkUrl}`;
  return msg;
}

// ── Twilio client (lazy init) ────────────────────────────────────────────────
let _twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio | null {
  if (_twilioClient) return _twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.error("[Twilio] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
    return null;
  }
  _twilioClient = twilio(sid, token);
  return _twilioClient;
}

// ── TwiML helpers ────────────────────────────────────────────────────────────
function twiml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

function sendTwiml(res: Response, body: string) {
  res.type("text/xml").send(twiml(body));
}

// ── Register all Twilio webhook routes ───────────────────────────────────────
export function registerTwilioWebhooks(app: Express) {

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  POST /api/twilio/voice                                                  ║
  // ║  Twilio calls this when someone dials one of your numbers.               ║
  // ║                                                                          ║
  // ║  Flow:                                                                   ║
  // ║  1. Respond IMMEDIATELY with TwiML → Twilio plays busy signal            ║
  // ║  2. Fire auto-text in background → caller gets SMS within seconds        ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝
  app.post("/api/twilio/voice", (req: Request, res: Response) => {
    const from = req.body.From;   // caller's phone number
    const to = req.body.To;       // your Twilio number they dialed
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;

    console.log(`[Twilio Voice] ${callStatus} | from: ${from} → to: ${to} | SID: ${callSid}`);
    console.log(`[Twilio Voice] req.body keys: ${Object.keys(req.body || {}).join(", ")}`);

    // Step 1: Respond to Twilio IMMEDIATELY with busy signal.
    // This MUST happen fast — Twilio times out after 15 seconds.
    sendTwiml(res, `<Reject reason="busy"/>`);

    // Step 2: Send auto-text in the background (non-blocking).
    // The TwiML response is already sent — this runs independently.
    const shouldText = !!(from && BOSSMAN_NUMBERS.includes(to));
    console.log(`[Twilio Voice] Should send auto-text? ${shouldText} (from=${from}, to=${to}, inList=${BOSSMAN_NUMBERS.includes(to)})`);

    if (shouldText) {
      sendAutoText(from, to).catch((err) =>
        console.error(`[Twilio Voice] Auto-text failed for ${from}:`, err.message)
      );
    }
  });

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  POST /api/twilio/voice-status                                           ║
  // ║  Twilio sends call status updates here (completed, no-answer, etc.)      ║
  // ║  Just logging for now — useful for analytics later.                      ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝
  app.post("/api/twilio/voice-status", (req: Request, res: Response) => {
    const { CallSid, CallStatus, From, To, Duration } = req.body;
    console.log(`[Twilio Status] ${CallStatus} | from: ${From} → to: ${To} | duration: ${Duration || 0}s | SID: ${CallSid}`);
    res.sendStatus(200);
  });

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  POST /api/twilio/sms                                                    ║
  // ║  Twilio calls this when someone texts one of your numbers.               ║
  // ║  For now: log it. Later: forward to contractor dashboard.                ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝
  app.post("/api/twilio/sms", (req: Request, res: Response) => {
    const from = req.body.From;
    const to = req.body.To;
    const body = req.body.Body;

    console.log(`[Twilio SMS] from: ${from} → to: ${to} | body: "${body?.slice(0, 100)}"`);

    // Respond with empty TwiML (no auto-reply to texts for now)
    sendTwiml(res, "");
  });

  // ── Diagnostic endpoint (for you to test without calling) ──────────────────
  app.get("/api/twilio/health", (_req: Request, res: Response) => {
    const client = getTwilioClient();
    res.json({
      status: "ok",
      twilioConfigured: !!client,
      a2pNumber: process.env.TWILIO_A2P_NUMBER || "(not set)",
      bossmanNumbers: BOSSMAN_NUMBERS,
    });
  });

  // ── Demo config: prospect saves their custom message for live preview ───────
  // Called by the Full-Site activate flow after step 2 (customize).
  // Stores the custom message so the next call from this phone gets it back.
  // CORS: allow cross-origin from Full-Site
  // CORS preflight for demo-config
  app.options("/api/twilio/demo-config", (_req: Request, res: Response) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(204);
  });

  // GET: retrieve saved demo config for a phone (used to skip customize step)
  app.get("/api/twilio/demo-config", (req: Request, res: Response) => {
    res.set("Access-Control-Allow-Origin", "*");
    const phone = req.query.phone as string;
    if (!phone) return res.status(400).json({ error: "Missing ?phone=" });

    const digits = phone.replace(/\D/g, "");
    const normalized = digits.length === 10 ? `+1${digits}` : digits.length === 11 ? `+${digits}` : phone;
    const config = demoConfigs.get(normalized);

    if (config && config.expiresAt > Date.now()) {
      console.log(`[Twilio Demo] Config found for ${normalized} — returning saved message`);
      return res.json({
        found: true,
        message: config.message,
        linkUrl: config.linkUrl || null,
        businessName: config.businessName || null,
      });
    }
    res.json({ found: false });
  });

  app.post("/api/twilio/demo-config", (req: Request, res: Response) => {
    res.set("Access-Control-Allow-Origin", "*");
    const { phone, message, linkUrl, businessName } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: "phone and message required" });
    }

    // Normalize phone to E.164
    const digits = phone.replace(/\D/g, "");
    const normalized = digits.length === 10 ? `+1${digits}` : digits.length === 11 ? `+${digits}` : phone;

    demoConfigs.set(normalized, {
      message,
      linkUrl: linkUrl || undefined,
      businessName: businessName || undefined,
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    console.log(`[Twilio Demo] Custom message saved for ${normalized} (expires in 30m)`);
    res.json({ success: true, phone: normalized, expiresIn: "30 minutes" });
  });

  // ── Manual test: send auto-text without making a phone call ────────────────
  // Usage: GET /api/twilio/test-autotext?to=+13123699850
  app.get("/api/twilio/test-autotext", async (req: Request, res: Response) => {
    const to = req.query.to as string;
    if (!to) {
      return res.status(400).json({ error: "Missing ?to=+1XXXXXXXXXX" });
    }
    try {
      await sendAutoText(to, BOSSMAN_NUMBERS[0]);
      res.json({ success: true, sentTo: to, from: process.env.TWILIO_A2P_NUMBER });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log("[Twilio] Webhook routes registered: /api/twilio/voice, /api/twilio/sms, /api/twilio/voice-status");
}

// ── Send auto-text to a missed caller ────────────────────────────────────────
async function sendAutoText(callerPhone: string, dialedNumber: string): Promise<void> {
  const client = getTwilioClient();
  if (!client) {
    console.error("[Twilio] Cannot send auto-text — Twilio client not configured");
    return;
  }

  // Always send FROM the A2P-registered number.
  // This is the number approved by carriers to send SMS.
  // Even if the caller dialed a different number, SMS must come from the A2P number.
  const a2pNumber = process.env.TWILIO_A2P_NUMBER;
  if (!a2pNumber) {
    console.error("[Twilio] Cannot send auto-text — TWILIO_A2P_NUMBER not set");
    return;
  }

  // Check for a custom demo message for this caller
  const customMessage = getDemoMessage(callerPhone);
  const body = customMessage || AUTO_TEXT_MESSAGE;

  if (customMessage) {
    console.log(`[Twilio] Using custom demo message for ${callerPhone}`);
  }

  const message = await client.messages.create({
    to: callerPhone,
    from: a2pNumber,
    body,
  });

  console.log(`[Twilio] Auto-text sent to ${callerPhone} from ${a2pNumber} — SID: ${message.sid}`);
}
