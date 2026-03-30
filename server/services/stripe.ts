import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Client factory — throws a descriptive error if the key is missing so every
// caller gets a clear message instead of a cryptic "Cannot read property of
// undefined" downstream.
// ---------------------------------------------------------------------------
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is not set. " +
        "Add it to your environment before using Stripe features."
    );
  }
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// ---------------------------------------------------------------------------
// Stripe Connect — OAuth flow (Standard accounts)
// ---------------------------------------------------------------------------

/**
 * Build the Stripe Connect OAuth authorisation URL.
 * `state` should be a short-lived random token stored in session to prevent
 * CSRF on the callback.
 */
export function getConnectOAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.STRIPE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "STRIPE_CLIENT_ID is not set. This is your platform's Connect client ID " +
        "from the Stripe Dashboard → Connect settings."
    );
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state,
  });
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange an authorisation code for a connected account ID.
 * Returns the connected account's `stripe_user_id`.
 */
export async function exchangeConnectCode(
  code: string
): Promise<{ accountId: string }> {
  const stripe = getStripe();
  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });
  if (!response.stripe_user_id) {
    throw new Error("Stripe Connect exchange did not return a stripe_user_id");
  }
  return { accountId: response.stripe_user_id };
}

/**
 * Retrieve basic info about a connected account (for display in Settings).
 */
export async function getConnectedAccount(
  accountId: string
): Promise<Stripe.Account> {
  const stripe = getStripe();
  return stripe.accounts.retrieve(accountId);
}

/**
 * Deauthorise / disconnect a connected account from the platform.
 */
export async function disconnectConnectedAccount(
  accountId: string
): Promise<void> {
  const clientId = process.env.STRIPE_CLIENT_ID;
  if (!clientId) throw new Error("STRIPE_CLIENT_ID is not set");
  const stripe = getStripe();
  await stripe.oauth.deauthorize({ client_id: clientId, stripe_user_id: accountId });
}

// ---------------------------------------------------------------------------
// Checkout Sessions — hosted payment page
// ---------------------------------------------------------------------------

export interface CheckoutLineItem {
  description: string;
  /** Unit amount in **dollars** (will be converted to cents internally) */
  unitAmount: number;
  quantity: number;
}

export interface CreateCheckoutParams {
  invoiceId: string;
  invoiceNumber: string;
  customerEmail: string | null | undefined;
  lineItems: CheckoutLineItem[];
  /** Success URL — should include `?session_id={CHECKOUT_SESSION_ID}` */
  successUrl: string;
  cancelUrl: string;
  /** Connected account ID (acct_xxx).  If omitted, charges go to the platform account. */
  connectedAccountId?: string | null;
  /** Platform application fee in dollars (only valid with connectedAccountId) */
  applicationFeeAmount?: number;
  currency?: string;
}

export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    params.lineItems.map((item) => ({
      price_data: {
        currency: params.currency ?? "usd",
        unit_amount: Math.round(item.unitAmount * 100), // dollars → cents
        product_data: { name: item.description },
      },
      quantity: item.quantity,
    }));

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: stripeLineItems,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      invoice_id: params.invoiceId,
      invoice_number: params.invoiceNumber,
    },
    ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
  };

  if (params.connectedAccountId && params.applicationFeeAmount) {
    sessionParams.payment_intent_data = {
      application_fee_amount: Math.round(params.applicationFeeAmount * 100),
    };
  }

  // Route through connected account if provided
  const requestOptions: Stripe.RequestOptions = params.connectedAccountId
    ? { stripeAccount: params.connectedAccountId }
    : {};

  return stripe.checkout.sessions.create(sessionParams, requestOptions);
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Verify and parse a Stripe webhook event.
 * Requires `STRIPE_WEBHOOK_SECRET` in the environment.
 */
export function constructWebhookEvent(
  rawBody: Buffer | string,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. " +
        "Add the signing secret from your Stripe webhook endpoint."
    );
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

// ---------------------------------------------------------------------------
// Payment Intent helpers (used when not going through Checkout)
// ---------------------------------------------------------------------------

export async function createPaymentIntent(
  amountDollars: number,
  currency: string,
  metadata: Record<string, string>,
  connectedAccountId?: string | null,
  applicationFeeAmountDollars?: number
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();

  const params: Stripe.PaymentIntentCreateParams = {
    amount: Math.round(amountDollars * 100),
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
    ...(connectedAccountId && applicationFeeAmountDollars
      ? {
          application_fee_amount: Math.round(
            applicationFeeAmountDollars * 100
          ),
        }
      : {}),
  };

  const requestOptions: Stripe.RequestOptions = connectedAccountId
    ? { stripeAccount: connectedAccountId }
    : {};

  return stripe.paymentIntents.create(params, requestOptions);
}

// ---------------------------------------------------------------------------
// Retrieve session for post-payment confirmation
// ---------------------------------------------------------------------------

export async function retrieveCheckoutSession(
  sessionId: string,
  connectedAccountId?: string | null
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const options: Stripe.RequestOptions = connectedAccountId
    ? { stripeAccount: connectedAccountId }
    : {};
  return stripe.checkout.sessions.retrieve(sessionId, {}, options);
}
