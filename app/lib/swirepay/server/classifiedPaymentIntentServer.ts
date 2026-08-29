import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

function configured() {
  return Boolean(supabaseUrl && anonKey && serviceKey);
}

export async function authenticatedUser(authorization: string | null) {
  if (!configured()) throw new Error("Payment server configuration is incomplete.");
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Login required.");
  const session = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await session.auth.getUser();
  if (error || !data.user) throw new Error("Login required.");
  return data.user;
}

function adminDb() {
  if (!configured()) throw new Error("Payment server configuration is incomplete.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

function swirepayConfiguration() {
  const secretKey = (process.env.SWIREPAY_SECRET_KEY || "").trim();
  const accountGid = (process.env.SWIREPAY_ACCOUNT_GID || "").trim();
  if (!secretKey || !accountGid)
    throw new Error("Swirepay checkout is not configured.");
  if (!accountGid.startsWith("account-"))
    throw new Error("Swirepay account configuration is invalid.");
  return { secretKey, accountGid };
}

function acceptedCheckoutOrigin(requestOrigin: string) {
  const configured = (process.env.SWIREPAY_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const deploymentHost = process.env.VERCEL_URL?.trim();
  const allowed = new Set([
    "https://seattledesitv.com",
    "https://www.seattledesitv.com",
    ...configured,
    ...(productionHost ? [`https://${productionHost}`] : []),
    ...(deploymentHost ? [`https://${deploymentHost}`] : []),
  ]);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }
  let normalized: string;
  try {
    normalized = new URL(requestOrigin).origin;
  } catch {
    throw new Error("Checkout origin is invalid.");
  }
  if (!allowed.has(normalized))
    throw new Error("Checkout is not enabled for this website origin.");
  if (process.env.NODE_ENV === "production" && !normalized.startsWith("https://"))
    throw new Error("Secure checkout requires HTTPS.");
  return normalized;
}

function providerMessage(body: unknown) {
  if (!body || typeof body !== "object") return "Swirepay rejected the checkout session.";
  const source = body as Record<string, unknown>;
  return typeof source.message === "string" && source.message.trim()
    ? source.message.slice(0, 300)
    : "Swirepay rejected the checkout session.";
}

function providerExpiry(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

export async function createClassifiedPaymentIntent(
  classifiedId: string,
  userId: string,
) {
  const db = adminDb();
  const { data: classified, error } = await db
    .from("classified_ads")
    .select(
      "id,created_by,title,status,payment_status,quoted_price_cents,contact_name,contact_email,contact_phone",
    )
    .eq("id", classifiedId)
    .maybeSingle();
  if (error) throw error;
  if (!classified || classified.created_by !== userId)
    throw new Error("Classified not found.");
  if (
    classified.status !== "approved_pending_payment" ||
    classified.payment_status !== "pending" ||
    !Number.isSafeInteger(classified.quoted_price_cents) ||
    classified.quoted_price_cents <= 0
  )
    throw new Error("This classified is not awaiting payment.");

  await db
    .from("swirepay_payment_intents")
    .update({ status: "expired" })
    .eq("target_type", "classified")
    .eq("target_id", classified.id)
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString());

  const { data: existing, error: existingError } = await db
    .from("swirepay_payment_intents")
    .select("public_token")
    .eq("target_type", "classified")
    .eq("target_id", classified.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { token: existing.public_token as string };

  const publicToken = crypto.randomUUID();
  const description = `SDTV-CLASSIFIED:${publicToken}`;
  const { data: intent, error: insertError } = await db
    .from("swirepay_payment_intents")
    .insert({
      public_token: publicToken,
      target_type: "classified",
      target_id: classified.id,
      owner_user_id: userId,
      amount_cents: classified.quoted_price_cents,
      currency: "USD",
      description,
    })
    .select("public_token")
    .single();
  if (insertError) throw insertError;
  return { token: intent.public_token as string };
}

export async function getClassifiedPaymentIntent(token: string, userId: string) {
  const db = adminDb();
  const { data: intent, error } = await db
    .from("swirepay_payment_intents")
    .select(
      "id,public_token,target_id,owner_user_id,amount_cents,currency,description,status,expires_at,payment_session_gid",
    )
    .eq("public_token", token)
    .eq("target_type", "classified")
    .maybeSingle();
  if (error) throw error;
  if (!intent || intent.owner_user_id !== userId)
    throw new Error("Payment request not found.");

  const { data: classified, error: classifiedError } = await db
    .from("classified_ads")
    .select(
      "id,title,requested_placement,status,payment_status,contact_name,contact_email,contact_phone",
    )
    .eq("id", intent.target_id)
    .maybeSingle();
  if (classifiedError) throw classifiedError;
  if (!classified) throw new Error("Classified not found.");

  const expired =
    intent.status === "pending" && new Date(intent.expires_at) <= new Date();
  if (expired) {
    await db
      .from("swirepay_payment_intents")
      .update({ status: "expired" })
      .eq("id", intent.id)
      .eq("status", "pending");
  }

  const checkoutConfigured = Boolean(
    process.env.SWIREPAY_SECRET_KEY?.trim() &&
      process.env.SWIREPAY_ACCOUNT_GID?.trim(),
  );

  return {
    token: intent.public_token as string,
    amountCents: intent.amount_cents as number,
    currency: intent.currency as string,
    description: intent.description as string,
    status: expired ? "expired" : (intent.status as string),
    paymentSessionGid: intent.payment_session_gid as string | null,
    classified: {
      id: classified.id as string,
      title: classified.title as string,
      placement: classified.requested_placement as string,
      contactName: classified.contact_name as string,
      contactEmail: classified.contact_email as string | null,
      contactPhone: classified.contact_phone as string | null,
    },
    checkout: {
      configured: checkoutConfigured,
      debug: process.env.SWIREPAY_CHECKOUT_DEBUG?.toLowerCase() === "true",
    },
  };
}

export async function createSwirepayClassifiedCheckoutSession(
  token: string,
  userId: string,
  requestOrigin: string,
) {
  const db = adminDb();
  const { secretKey, accountGid } = swirepayConfiguration();
  const acceptedDomain = acceptedCheckoutOrigin(requestOrigin);
  const { data: intent, error } = await db
    .from("swirepay_payment_intents")
    .select("id,public_token,target_id,owner_user_id,amount_cents,currency,status,expires_at")
    .eq("public_token", token)
    .eq("target_type", "classified")
    .maybeSingle();
  if (error) throw error;
  if (!intent || intent.owner_user_id !== userId)
    throw new Error("Payment request not found.");
  if (intent.status !== "pending" || new Date(intent.expires_at) <= new Date())
    throw new Error("This payment request has expired.");

  const { data: classified, error: classifiedError } = await db
    .from("classified_ads")
    .select("id,status,payment_status,quoted_price_cents")
    .eq("id", intent.target_id)
    .maybeSingle();
  if (classifiedError) throw classifiedError;
  if (
    !classified ||
    classified.status !== "approved_pending_payment" ||
    classified.payment_status !== "pending" ||
    classified.quoted_price_cents !== intent.amount_cents
  )
    throw new Error("This classified is no longer awaiting payment.");

  const response = await fetch("https://api.swirepay.com/v3/checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": secretKey,
    },
    body: JSON.stringify({
      scope: "payment",
      acceptedDomain,
      amount: intent.amount_cents,
      currency: intent.currency,
      paymentType: ["CARD"],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body = (await response.json().catch(() => null)) as {
    entity?: {
      encryption?: unknown;
      paymentSessionGid?: unknown;
      expires_at?: unknown;
    };
  } | null;
  if (!response.ok) throw new Error(providerMessage(body));
  const secureToken = body?.entity?.encryption;
  const paymentSessionGid = body?.entity?.paymentSessionGid;
  if (
    typeof secureToken !== "string" ||
    !secureToken ||
    typeof paymentSessionGid !== "string" ||
    !paymentSessionGid.startsWith("paymentsession-")
  )
    throw new Error("Swirepay returned an incomplete checkout session.");

  const expiresAt = providerExpiry(body?.entity?.expires_at);
  const { error: sessionError } = await db
    .from("swirepay_checkout_sessions")
    .insert({
      payment_intent_id: intent.id,
      payment_session_gid: paymentSessionGid,
      accepted_origin: acceptedDomain,
      provider_expires_at: expiresAt,
    });
  if (sessionError) throw sessionError;
  const { error: intentError } = await db
    .from("swirepay_payment_intents")
    .update({ payment_session_gid: paymentSessionGid })
    .eq("id", intent.id)
    .eq("status", "pending");
  if (intentError) throw intentError;

  return {
    secureToken,
    paymentSessionGid,
    expiresAt,
    accountGid,
  };
}
