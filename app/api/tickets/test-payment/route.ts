import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireDigestAdmin } from "../../../lib/adminDigest/server";
import { sendTicketConfirmation } from "../../../lib/ticketing/sendTicketConfirmation";
import { resolveSiteForHostname } from "../../../lib/sites/siteResolver";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "";
export async function POST(request: Request) {
  try {
    if (
      process.env.VERCEL_ENV === "production" ||
      process.env.TICKET_TEST_PAYMENTS_ENABLED !== "true"
    )
      return NextResponse.json(
        { error: "Test payments are disabled." },
        { status: 403 },
      );
    const user = await requireDigestAdmin(request);
    if (!user)
      return NextResponse.json(
        { error: "SDTV admin access is required." },
        { status: 403 },
      );
    const token = String((await request.json()).token || "");
    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id) throw new Error("The active site could not be resolved.");
    const db = createClient(url, key, { auth: { persistSession: false } });
    const orderResult = await db
      .from("ticket_orders")
      .select(
        "*,events(title,date,location),community_organizations(name),ticket_order_items(ticket_name,unit_price_cents,quantity)",
      )
      .eq("site_id", site.id)
      .eq("public_token", token)
      .maybeSingle();
    const order: any = orderResult.data;
    if (!order) throw new Error("Order not found.");
    const paid = await db.rpc("fulfill_paid_ticket_order", {
      p_order_token: token,
      p_payment_session_gid: `test-${crypto.randomUUID()}`,
      p_payment_gid: `test-${crypto.randomUUID()}`,
      p_paid_cents: order.total_cents,
      p_currency: order.currency,
    });
    if (paid.error || !["fulfilled", "duplicate"].includes(paid.data?.status))
      throw new Error(
        paid.error?.message ||
          `Test fulfillment returned ${paid.data?.status}.`,
      );
    const email = await sendTicketConfirmation(db, order.id, { test: true });
    return NextResponse.json({
      ok: true,
      status: paid.data?.status,
      emailSent: email.sent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Test payment failed.",
      },
      { status: 400 },
    );
  }
}
