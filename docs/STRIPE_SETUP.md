# Stripe Connect Setup Guide

Complete configuration reference for enabling payment collection in WSAI-Plumbing-Core.

---

## Overview

This app uses **Stripe Connect Standard** — the architecture where each business owner
connects their own Stripe account via OAuth. Payments flow directly to the business's
bank account. The platform can optionally charge an application fee per transaction.

If you are running a single-company deployment (one plumbing business, one Stripe account),
Connect Standard still works exactly the same way; you simply connect your own account once
and never touch it again.

---

## Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Yes** | Platform secret key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_CLIENT_ID` | **Yes** | Connect platform client ID (`ca_…`) — needed for OAuth |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Webhook signing secret (`whsec_…`) — verifies event authenticity |
| `APP_BASE_URL` | **Yes** | Your app's public HTTPS URL — used to build redirect and webhook URIs |

> **Nothing Stripe-related will function until all four variables are set.**
> The Settings → Payments tab shows a live checklist of which are present.

---

## Step-by-Step Setup

### 1. Create / Log in to Stripe

Go to [dashboard.stripe.com](https://dashboard.stripe.com).
Use **Test mode** (toggle in the top-left) until you are ready to accept real payments.

---

### 2. Get your Secret Key

**Stripe Dashboard → Developers → API keys → Secret key**

Copy the value that starts with `sk_test_` (or `sk_live_` in production).

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 3. Set up your Connect Platform

**Stripe Dashboard → Settings → Connect → Get started**

Complete the platform profile (name, website, business type).
Once saved, go to:

**Settings → Connect → OAuth settings**

Copy your **Client ID** — it looks like `ca_xxxxxxxxxxxxxxxx`.

```env
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 4. Add your Redirect URI

Still inside **Settings → Connect → OAuth settings → Redirect URIs**, click **Add URI** and enter:

```
https://yourdomain.com/api/stripe/connect/callback
```

Replace `yourdomain.com` with your actual domain (or ngrok URL during local testing).

> **Local development tip:** Use [ngrok](https://ngrok.com) to get a public HTTPS tunnel:
> ```bash
> ngrok http 5000
> # Use the https://xxxx.ngrok.io URL as APP_BASE_URL
> ```

```env
APP_BASE_URL=https://your-ngrok-or-production-url.com
```

---

### 5. Register your Webhook Endpoint

**Stripe Dashboard → Developers → Webhooks → Add endpoint**

- **Endpoint URL:**
  ```
  https://yourdomain.com/api/webhooks/stripe
  ```
- **Events to listen for** (select these three):
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

After saving, click **Reveal signing secret** and copy the `whsec_…` value.

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Why this matters:** Without the webhook, Stripe Checkout will redirect the customer
> back to your app after payment, but the invoice in the database will not automatically
> flip to `paid`. The webhook is the authoritative signal that money actually moved.

---

### 6. Run the Database Migration

The invoice tables (`invoices`, `invoice_line_items`) and the three new Stripe columns
on `company_settings` need to be pushed to your database:

```bash
npm run db:push
```

---

### 7. Connect via the Settings UI

1. Log in as **admin**
2. Navigate to **Settings → Payments**
3. Verify the configuration checklist shows all four env vars as ✅ Set
4. Click **Connect Stripe Account**
5. You will be redirected to Stripe's OAuth page
6. Approve the connection
7. You will be redirected back to `/settings?stripe_connected=1`
8. The panel will update to show your business name and account ID in green

---

### 8. Test the Full Payment Flow

With everything configured:

1. Create a job and complete it
2. In **Jobs**, open the job and click **Generate Invoice** (or go to **Invoices → New Invoice**)
3. Add line items and click **Create Invoice**
4. In the invoice detail panel, click **Send Invoice** — this emails the customer a payment link
5. Open the public invoice URL (`/invoice/:token`) as the customer
6. Click **Pay Securely** — you will be redirected to Stripe Checkout
7. Use a [Stripe test card](https://stripe.com/docs/testing#cards): `4242 4242 4242 4242`, any future expiry, any CVC
8. Complete payment — Stripe redirects back to the invoice page with a success banner
9. Check **Invoices** in the app — the invoice should now show status **Paid**

> If the invoice does not flip to Paid after the test, the webhook is not reaching your
> server. Check **Stripe Dashboard → Developers → Webhooks → your endpoint → Recent events**
> for delivery errors.

---

## Architecture Reference

```
Customer visits /invoice/:token
        │
        ▼
POST /api/public/invoice/:token/pay
        │
        ▼
createCheckoutSession() in stripe.ts
 └─ Routes payment to connected account (acct_xxx)
 └─ Attaches invoice_id to session metadata
        │
        ▼
Stripe Checkout (hosted by Stripe)
        │
   Payment succeeds
        │
        ├──► Stripe redirects customer to:
        │    /invoice/:token?payment=success
        │
        └──► Stripe POST to /api/webhooks/stripe
                  │
                  ▼
             constructWebhookEvent() verifies signature
                  │
             checkout.session.completed event
                  │
             storage.updateInvoice(id, { status: "paid", paidAt: now })
```

---

## Going Live

When ready for real payments:

1. In Stripe Dashboard, switch the toggle to **Live mode**
2. Replace all test-mode keys with their live equivalents:
   - `STRIPE_SECRET_KEY` → `sk_live_…`
   - `STRIPE_CLIENT_ID` → (same `ca_…` value — client IDs work across modes)
   - `STRIPE_WEBHOOK_SECRET` → register a **new** webhook endpoint in live mode and copy the new `whsec_…`
3. Re-run the connect flow in the Settings UI to link your live Stripe account
4. Test with a real card for a small amount to confirm end-to-end

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Connect Stripe Account" button is disabled | `STRIPE_SECRET_KEY` or `STRIPE_CLIENT_ID` missing | Set both env vars and restart the server |
| OAuth redirects to `/settings?stripe_error=…` | Redirect URI not registered in Stripe Dashboard | Add exact URI in Connect → OAuth settings |
| Checkout session creation fails with 503 | `STRIPE_SECRET_KEY` not set | Verify env var is present and server was restarted |
| Invoice stays in "Sent" after payment | Webhook not delivering | Check Stripe Dashboard → Webhooks → Recent events; verify `STRIPE_WEBHOOK_SECRET` matches |
| Webhook returns 400 "Missing raw body" | `express.json()` consuming body before webhook route | Already handled in `server/index.ts` via `req.rawBody` capture |
| "state_mismatch" error on callback | Browser session expired or multiple tabs | Start the OAuth flow again from a fresh Settings page |
