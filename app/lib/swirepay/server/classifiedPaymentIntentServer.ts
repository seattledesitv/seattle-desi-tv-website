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
    .select("id,title,requested_placement,status,payment_status,contact_name")
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

  const publicKey =
    process.env.SWIREPAY_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_SWIREPAY_PUBLIC_KEY ||
    "";
  const checkoutUrl = process.env.SWIREPAY_CHECKOUT_URL || "";
  const mode =
    process.env.SWIREPAY_MODE?.toLowerCase() === "live" ||
    process.env.SWIREPAY_TEST_MODE?.toLowerCase() === "false"
      ? "live"
      : "test";

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
    },
    checkout: { publicKey, checkoutUrl, mode },
  };
}
