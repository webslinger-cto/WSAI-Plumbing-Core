# To Build — Feature Backlog

Competitive gaps and table-stake features identified in a product audit against
Jobber Core, HouseCall Pro, and ServiceTitan. Prioritized by conversion impact
at the $79–$149/mo self-serve tier.

---

## Priority 1 — Blocks Conversions Today

### 1. A2P SMS Registration + Appointment Reminders
- Complete Twilio/SignalWire A2P 10DLC carrier registration
- Enable `sendAppointmentReminder` (already built, currently disabled)
- Enable post-job review request SMS (already built, gated on A2P)
- **Why it matters:** Automated reminders are the #1 feature cited in HouseCall Pro
  reviews. "Reduced no-shows" is the fastest ROI story for any home service owner.

### 2. Embeddable Online Booking Widget
- Anonymous customer-facing intake form (no login required)
- Embeds on the business's own website via `<script>` tag or iframe
- Creates a lead automatically, triggers the existing automation workflow
- Service type selector, preferred date/time, and contact fields
- **Why it matters:** Jobber ($49), HouseCall Pro (all plans), and every Google
  Local Services competitor include this. Without it the "replace your receptionist"
  pitch doesn't close.

### 3. Invoice PDF — Branded & Downloadable
- `server/services/pdf-generator.ts` exists — surface it on the public invoice page
- Include company logo, line items, tax breakdown, payment status, and "Pay Now" link
- Attach PDF to the job-complete email automatically
- **Why it matters:** Customers expect a professional PDF for records; contractors
  need it for insurance and permitting.

### 4. Job Photo Upload (Before/After)
- Tech can attach photos from mobile during or after a job
- Photos stored per-job, visible to admin/dispatcher
- Surfaced on the job detail page and in the customer portal
- **Why it matters:** Primary field adoption driver. Also the strongest liability
  protection story ("we documented the existing condition before we touched it").

### 5. Mobile PWA / Responsive Technician Views
- Add `manifest.json` + service worker for installable PWA
- Audit and fix technician dashboard, job detail, and quote builder for small screens
- Offline-friendly job status updates (queue locally, sync on reconnect)
- **Why it matters:** Techs will not adopt desktop-only software. Mobile experience
  is the single biggest adoption blocker on the field side.

### 6. Stripe Connect Onboarding UI
- Surface Connect OAuth flow in Settings → Payments
- Show connected account status, payout schedule, and a "Disconnect" option
- Non-technical business owners must be able to complete this without help
- **Why it matters:** Platform fees cannot be collected until owners connect.
  This is the primary monetization gate.

---

## Priority 2 — Needed Within 60 Days to Defend $99/mo Pricing

### 7. Credit Card on File / One-Click Payment
- Save Stripe payment method after first invoice payment
- Allow future invoices to be paid in one click from the customer portal
- Foundation for maintenance plan recurring billing
- **Why it matters:** Repeat customers and maintenance upsells are the highest-margin
  revenue. Requiring a fresh Checkout session every time kills the experience.

### 8. Time Tracking (Auto Clock-In/Out)
- Auto clock-in when tech marks `en_route` or `on_site`
- Auto clock-out on `complete`
- Tie to payroll records automatically instead of manual hour entry
- **Why it matters:** Eliminates the friction that makes techs under-report hours
  and makes the existing payroll feature genuinely defensible.

### 9. Unified Customer Communication Thread
- Thread all contact attempts, SMS, emails, and job notes against `customerId`
- Visible in the customer record on `CustomersPage`
- Surface last-contacted date and open thread count on the customer list
- **Why it matters:** The `customers` table now exists. Without a communication
  thread it's a directory, not a CRM.

### 10. Multi-Location / Franchise Support
- Allow one platform account to manage multiple company profiles
- Each location has its own Stripe Connect account, technicians, and settings
- Admin can view rolled-up analytics across all locations
- **Why it matters:** Most plumbing/sewer businesses that reach $1M+ operate
  2–4 service areas. This is the enterprise upsell path.

---

## Priority 3 — Competitive Polish (90-day horizon)

| Feature | Notes |
|---|---|
| Recurring maintenance plans | Stripe subscriptions, auto-create jobs on cadence |
| Digital signature on quotes/invoices | DocuSign-level; accept on mobile |
| Route optimization | Given the Leaflet map already exists |
| Inventory / parts tracking | Tie to pricebook materialsCost |
| Technician performance scorecards | Rating, on-time %, revenue per job |
| Two-way SMS inbox (not just forwarding) | Full conversation UI in DispatchChatPage |
| QuickBooks / Xero sync | Bidirectional invoice and expense sync |
| Lien waiver generation | Critical for larger commercial jobs |
| Customer satisfaction surveys | NPS after job complete, auto-emailed |

---

## Notes

- All Priority 1 items are buildable within the existing stack with no new
  infrastructure dependencies.
- Items marked "already built" mean the server-side logic exists but is either
  disabled or not fully surfaced in the UI.
- This list was last updated: March 2026
