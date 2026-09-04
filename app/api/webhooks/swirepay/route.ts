import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { mapSwirepayWebhookPayload } from "../../../lib/swirepay/services/swirepayWebhookPayloadService";
import { sendTicketConfirmation } from "../../../lib/ticketing/sendTicketConfirmation";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";
const webhookSecret = process.env.SWIREPAY_WEBHOOK_SECRET || "";

function safeEqualBase64(expected: string, supplied: string) {
  try {
    const left = Buffer.from(expected.trim(), "base64");
    const right = Buffer.from(supplied.trim(), "base64");
    return (
      left.length > 0 &&
      left.length === right.length &&
      timingSafeEqual(left, right)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceKey || !webhookSecret)
    return NextResponse.json(
      { error: "Webhook server configuration is incomplete." },
      { status: 503 },
    );
  const rawBody = await request.text();
  const signature = request.headers.get("x-swirepay-signature") || "";
  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody, "utf8")
    .digest("base64");
  if (!signature || !safeEqualBase64(expected, signature))
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Webhook body must be valid JSON." },
      { status: 400 },
    );
  }

  const payloadHash = createHash("sha256")
    .update(rawBody, "utf8")
    .digest("hex");
  const {
    providerEventId,
    eventType,
    paymentGid,
    paymentLinkGid,
    classifiedIntentToken,
    providerStatus,
    amountCents,
    paidAmountCents,
    amountReceivedCents,
    currency,
    sanitizedPayload,
  } = mapSwirepayWebhookPayload(payload);
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: recorded, error } = await db
    .from("swirepay_webhook_events")
    .insert({
      provider_event_id: providerEventId,
      event_type: eventType,
      payment_gid: paymentGid,
      payload: sanitizedPayload,
      payload_sha256: payloadHash,
      signature,
      signature_verified: true,
      processing_status: "captured",
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json(
      { error: "Verified webhook could not be recorded." },
      { status: 500 },
    );
  }

  if (
    eventType === "payment.captured" &&
    providerStatus?.toUpperCase() === "SUCCEEDED" &&
    paymentGid &&
    amountCents !== null &&
    paidAmountCents !== null &&
    amountReceivedCents !== null &&
    currency
  ) {
    const { data: ticketOrder } = await db
      .from("ticket_orders")
      .select("id,public_token,total_cents,currency")
      .eq("provider_payment_session_gid", paymentGid)
      .eq("status", "pending_payment")
      .maybeSingle();
    if (ticketOrder) {
      const paid = Math.max(paidAmountCents, amountReceivedCents);
      const fulfillment = await db.rpc("fulfill_paid_ticket_order", {
        p_order_token: ticketOrder.public_token,
        p_payment_session_gid: paymentGid,
        p_payment_gid: paymentGid,
        p_paid_cents: paid,
        p_currency: currency,
      });
      if (fulfillment.error)
        return NextResponse.json(
          { error: "Verified ticket payment could not be fulfilled." },
          { status: 500 },
        );
      const fulfilled = ["fulfilled", "duplicate"].includes(
        fulfillment.data?.status || "",
      );
      if (fulfilled) {
        await sendTicketConfirmation(db, ticketOrder.id).catch(async (cause) => {
          await db
            .from("swirepay_webhook_events")
            .update({ processing_notes: `Tickets issued; confirmation email failed: ${cause instanceof Error ? cause.message.slice(0, 300) : "unknown error"}` })
            .eq("id", recorded.id);
        });
      }
      await db
        .from("swirepay_webhook_events")
        .update({
          processing_status: fulfilled ? "processed" : "mapped",
          processing_notes: fulfilled
            ? "Verified succeeded payment issued event tickets."
            : `Ticket payment fulfillment returned ${fulfillment.data?.status || "unknown"}.`,
          processed_at: fulfilled ? new Date().toISOString() : null,
        })
        .eq("id", recorded.id);
      return NextResponse.json({ ok: true, captured: true, fulfillment: fulfillment.data });
    }
    let resolvedIntentToken = classifiedIntentToken;
    if (!resolvedIntentToken && paymentGid) {
      const { data: checkoutSession } = await db
        .from("swirepay_checkout_sessions")
        .select("swirepay_payment_intents(public_token)")
        .eq("payment_session_gid", paymentGid)
        .maybeSingle();
      const relatedIntent = checkoutSession?.swirepay_payment_intents as
        | { public_token?: string }
        | { public_token?: string }[]
        | null;
      resolvedIntentToken = Array.isArray(relatedIntent)
        ? relatedIntent[0]?.public_token || null
        : relatedIntent?.public_token || null;
    }
    const fulfillmentRequest = resolvedIntentToken
      ? db.rpc("fulfill_swirepay_embedded_classified_payment", {
          p_webhook_event_id: recorded.id,
          p_payment_session_gid: paymentGid,
          p_intent_token: resolvedIntentToken,
          p_provider_status: providerStatus,
          p_amount_cents: amountCents,
          p_paid_amount_cents: paidAmountCents,
          p_amount_received_cents: amountReceivedCents,
          p_currency_code: currency,
        })
      : paymentLinkGid
        ? db.rpc("fulfill_swirepay_payment", {
          p_webhook_event_id: recorded.id,
          p_payment_session_gid: paymentGid,
          p_payment_link_gid: paymentLinkGid,
          p_provider_status: providerStatus,
          p_amount_cents: amountCents,
          p_paid_amount_cents: paidAmountCents,
          p_amount_received_cents: amountReceivedCents,
          p_currency_code: currency,
        })
        : null;
    if (!fulfillmentRequest) {
      await db
        .from("swirepay_webhook_events")
        .update({
          processing_status: "mapped",
          processing_notes: "Verified succeeded payment stored, but it did not match a recorded checkout session or payment link.",
        })
        .eq("id", recorded.id);
      return NextResponse.json({ ok: true, captured: true, fulfillment: null });
    }
    const { data: fulfillment, error: fulfillmentError } = await fulfillmentRequest;
    if (fulfillmentError)
      return NextResponse.json(
        { error: "Verified payment could not be fulfilled." },
        { status: 500 },
      );

    const result = fulfillment as { status?: string } | null;
    const fulfilled = ["fulfilled", "duplicate"].includes(
      result?.status || "",
    );
    if (fulfilled && paymentGid) {
      await db
        .from("swirepay_checkout_sessions")
        .update({
          status: "succeeded",
          succeeded_at: new Date().toISOString(),
        })
        .eq("payment_session_gid", paymentGid);
    }
    await db
      .from("swirepay_webhook_events")
      .update({
        processing_status: fulfilled ? "processed" : "mapped",
        processing_notes: fulfilled
          ? "Verified succeeded payment applied to its unique approved target."
          : "Verified succeeded payment stored, but no unique approved payment target matched its payment-link identifier and frozen quote.",
        processed_at: fulfilled ? new Date().toISOString() : null,
      })
      .eq("id", recorded.id);
    return NextResponse.json({ ok: true, captured: true, fulfillment: result });
  }

  return NextResponse.json({ ok: true, captured: true, fulfillment: null });
}
