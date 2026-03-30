# Integration Roadmap

Third-party services that make sensible integrations for a field service management
platform, organized by category. Each entry notes API accessibility, build effort,
and homepage marketing value.

**Legend — Build Effort:**
- 🟢 Easy — REST API, well-documented, SDK available, can ship in a day
- 🟡 Medium — Webhooks + OAuth or multi-step flow, 2–5 days
- 🔴 Hard — Complex auth, iframe/widget embed, or enterprise sales required

---

## 💳 Payments & Finance

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **Stripe** | Online invoice payment, Checkout, Connect for multi-location payouts | 🟢 | ✅ Already integrated |
| **QuickBooks Online** | Bidirectional sync of invoices, expenses, customers, and payroll | 🟡 | To build |
| **Xero** | Same as QuickBooks — preferred by smaller/newer businesses | 🟡 | To build |
| **Gusto** | Payroll processing — export payroll records directly to Gusto runs | 🟢 | To build |
| **Finix / Helcim** | Lower processing fees alternative to Stripe for high-volume operators | 🟡 | Optional |
| **Affirm / Wisetack** | Buy-now-pay-later for large jobs ($500–$10k) — huge close rate lift | 🟡 | To build |

**Homepage angle:** "Get paid online with Stripe. Export payroll to Gusto. Sync books to QuickBooks — automatically."

---

## 📞 Communications

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **Twilio** | SMS, voice, call forwarding, A2P 10DLC, voicemail | 🟢 | ✅ Already integrated |
| **SignalWire** | Twilio-compatible alternative, lower SMS cost, already used | 🟢 | ✅ Already integrated |
| **Resend** | Transactional email (job confirmations, invoices, reminders) | 🟢 | ✅ Already integrated |
| **SendGrid** | Alternative to Resend for bulk/marketing email with higher deliverability guarantees | 🟢 | Optional |
| **Mailchimp** | Customer newsletter and drip campaigns synced from your customer list | 🟡 | To build |
| **Klaviyo** | More powerful than Mailchimp for segmented outreach (e.g. "customers with no job in 90 days") | 🟡 | To build |
| **Google Business Messages** | Let customers message directly from the Google Maps listing | 🟡 | To build |
| **Facebook Messenger** | Capture leads from Facebook ads directly into the CRM | 🟡 | To build |

**Homepage angle:** "Automated texts. Professional emails. All customer conversations in one place."

---

## 📅 Scheduling & Calendar

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **Google Calendar** | Two-way sync so techs see jobs in their personal calendar | 🟢 | To build |
| **Apple Calendar (CalDAV)** | Same for iOS-heavy field teams | 🟡 | To build |
| **Calendly** | Let customers self-book estimates directly into tech availability | 🟡 | To build |
| **Acuity Scheduling** | Similar to Calendly, popular with smaller service businesses | 🟡 | To build |

**Homepage angle:** "Jobs sync to Google Calendar automatically. Customers can book their own estimate."

---

## 🔧 Lead Generation & CRM

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **Angi / HomeAdvisor** | Webhook lead intake | 🟢 | ✅ Already integrated |
| **Thumbtack** | Webhook lead intake | 🟢 | ✅ Already integrated |
| **eLocal** | Webhook lead intake | 🟢 | ✅ Already integrated |
| **Networx** | Webhook lead intake | 🟢 | ✅ Already integrated |
| **Google Local Services Ads** | Direct lead intake from Google's verified contractor program | 🟡 | To build |
| **HubSpot** | Sync customers and leads into HubSpot for larger sales-team workflows | 🟡 | To build |
| **Salesforce** | Enterprise CRM sync (relevant for franchise / multi-location operators) | 🔴 | Long-term |
| **Zapier** | Meta-integration: connect anything to anything without custom code | 🟢 | ✅ Already integrated |
| **Make (Integromat)** | Alternative to Zapier, preferred by more technical operators | 🟢 | To build |

**Homepage angle:** "Leads from Angi, Thumbtack, and Google flow in automatically. No copy-pasting."

---

## ⭐ Reviews & Reputation

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **Google Business Profile** | Auto-request reviews via SMS/email after job complete | 🟢 | ✅ Built (configurable URL) |
| **Yelp** | Same — auto-review request | 🟢 | ✅ Built (configurable URL) |
| **Birdeye** | Centralized review management across Google, Yelp, Facebook | 🟡 | To build |
| **Podium** | Similar to Birdeye, popular in home services; also handles webchat | 🟡 | Competitive overlap |
| **NiceJob** | Automated review request sequences; integrates with FSM tools | 🟢 | To build |

**Homepage angle:** "More 5-star reviews on autopilot. Review requests sent automatically after every job."

---

## 🗺️ Field Operations

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **Google Maps Platform** | Geocoding, directions, distance matrix for route optimization | 🟢 | ✅ Already used (geocoding service) |
| **Mapbox** | Alternative to Google Maps, lower cost at scale, better custom styling | 🟢 | Optional |
| **OptimoRoute / Route4Me** | Dedicated multi-stop route optimization for dispatch | 🟡 | To build |
| **Waze for Cities API** | Real-time traffic-aware ETA for technician ETAs | 🟡 | Optional |
| **Fleet tracking (Samsara / Verizon Connect)** | Real GPS coordinates for company vehicles vs. phone location | 🔴 | Long-term |

**Homepage angle:** "Dispatch smarter. Techs get optimized routes. Customers get real-time ETAs."

---

## 📊 Analytics & Reporting

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **Google Analytics 4** | Website + portal visitor tracking | 🟢 | To build |
| **Mixpanel** | Product analytics — which features get used, where users drop off | 🟢 | To build |
| **Looker Studio (Data Studio)** | Connect Postgres → Google Sheets → visual dashboards for owners who want to live in spreadsheets | 🟡 | To build |
| **Datadog / Sentry** | Error monitoring and performance observability | 🟢 | To build |

---

## 📁 Documents & E-Signature

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **DocuSign** | Legally binding signatures on quotes, work orders, lien waivers | 🟡 | To build |
| **HelloSign (Dropbox Sign)** | Cheaper alternative to DocuSign, simpler API | 🟢 | To build |
| **PandaDoc** | All-in-one quote + e-sign + payment (could replace the quote flow) | 🟡 | Optional |
| **AWS S3 / Cloudflare R2** | Object storage for job photos, PDFs, voice recordings | 🟢 | To build (needed for photo uploads) |

**Homepage angle:** "Customers sign quotes from their phone. No printing, no faxing, no chasing."

---

## 🏗️ Industry-Specific

| Service | What It Enables | Effort | Status |
|---|---|---|---|
| **Hatch** | AI-powered lead follow-up via SMS (purpose-built for home services) | 🟡 | Competitive consideration |
| **ServiceTitan Marketplace API** | If targeting ST defectors — import their historical data | 🔴 | Long-term |
| **Knowify** | Subcontractor / commercial job costing integration | 🔴 | Long-term |
| **CompanyCam** | Dedicated job photo platform used by most plumbing/HVAC companies | 🟡 | To build |
| **Praxedo** | Field service scheduling for multi-trade operators | 🔴 | Competitive |

---

## Recommended Homepage Integration Logos (Tier 1 — ship first)

These have broad name recognition with the home-service business owner audience
and are either already live or easy to complete:

1. **Stripe** — payments ✅
2. **Twilio** — communications ✅
3. **Google** — calendar sync + reviews + Maps (partial ✅)
4. **QuickBooks** — accounting (to build, ~3 days)
5. **Gusto** — payroll (to build, ~1 day)
6. **Zapier** — automation ✅
7. **Angi / Thumbtack** — lead sources ✅
8. **Wisetack** — financing (to build, ~2 days, high close-rate impact)
9. **DocuSign / HelloSign** — e-signatures (to build, ~2 days)
10. **CompanyCam** — job photos (to build, ~2 days)

---

*Last updated: March 2026*
