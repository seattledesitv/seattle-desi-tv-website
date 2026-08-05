import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

function textAt(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    let value: unknown = payload;
    for (const key of path)
      value =
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
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
  const providerEventId = textAt(payload, [
    ["id"],
    ["eventId"],
    ["event_id"],
    ["entity", "eventId"],
    ["entity", "event_id"],
  ]);
  const eventType = textAt(payload, [
    ["type"],
    ["event"],
    ["eventType"],
    ["event_type"],
    ["name"],
    ["entity", "eventType"],
    ["entity", "status"],
  ]);
  const paymentGid = textAt(payload, [
    ["paymentGid"],
    ["payment_gid"],
    ["paymentSessionGid"],
    ["entity", "gid"],
    ["entity", "paymentGid"],
    ["data", "entity", "gid"],
  ]);
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { error } = await db
    .from("swirepay_webhook_events")
    .insert({
      provider_event_id: providerEventId,
      event_type: eventType,
      payment_gid: paymentGid,
      payload,
      payload_sha256: payloadHash,
      signature,
      signature_verified: true,
      processing_status: "captured",
    });
  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json(
      { error: "Verified webhook could not be recorded." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, captured: true });
}
