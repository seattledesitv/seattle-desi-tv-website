import { NextResponse } from "next/server";
import { resolveSiteForHostname } from "../../../../lib/sites/siteResolver";
import {
  acceptedCheckoutOrigin,
  adminDb,
  providerExpiry,
  providerMessage,
  swirepayConfiguration,
} from "../../../../lib/swirepay/server/classifiedPaymentIntentServer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    if (!/^[0-9a-f-]{36}$/i.test(token)) throw new Error("Order not found.");
    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id) throw new Error("The active site could not be resolved.");
    const db = adminDb();
    const { secretKey, accountGid } = swirepayConfiguration();
    const acceptedDomain = acceptedCheckoutOrigin(
      new URL(request.url).origin,
      site.primaryHostname,
    );
    const { data: order, error } = await db
      .from("ticket_orders")
      .select("id,status,total_cents,currency,payment_expires_at")
      .eq("site_id", site.id)
      .eq("public_token", token)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found.");
    if (
      order.status !== "pending_payment" ||
      !order.payment_expires_at ||
      new Date(order.payment_expires_at).getTime() <= Date.now()
    )
      throw new Error("This ticket reservation has expired.");
    if (!Number.isSafeInteger(order.total_cents) || order.total_cents <= 0)
      throw new Error("This order does not require a card payment.");

    const response = await fetch("https://api.swirepay.com/v3/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": secretKey },
      body: JSON.stringify({
        scope: "payment",
        acceptedDomain,
        amount: order.total_cents,
        currency: order.currency,
        paymentType: ["CARD"],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = (await response.json().catch(() => null)) as {
      entity?: { encryption?: unknown; paymentSessionGid?: unknown; expires_at?: unknown };
    } | null;
    if (!response.ok) throw new Error(providerMessage(result));
    const secureToken = result?.entity?.encryption;
    const paymentSessionGid = result?.entity?.paymentSessionGid;
    if (
      typeof secureToken !== "string" ||
      !secureToken ||
      typeof paymentSessionGid !== "string" ||
      !paymentSessionGid.startsWith("paymentsession-")
    )
      throw new Error("Swirepay returned an incomplete checkout session.");
    const updated = await db
      .from("ticket_orders")
      .update({ provider_payment_session_gid: paymentSessionGid })
      .eq("id", order.id)
      .eq("status", "pending_payment");
    if (updated.error) throw updated.error;
    return NextResponse.json({
      secureToken,
      paymentSessionGid,
      expiresAt: providerExpiry(result?.entity?.expires_at),
      accountGid,
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Checkout session failed." },
      { status: 400 },
    );
  }
}
