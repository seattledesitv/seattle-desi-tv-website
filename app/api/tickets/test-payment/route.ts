import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireDigestAdmin } from "../../../lib/adminDigest/server";
import { ticketConfirmationEmail } from "../../../lib/ticketing/ticketConfirmationEmail";
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
    const db = createClient(url, key, { auth: { persistSession: false } });
    const orderResult = await db
      .from("ticket_orders")
      .select(
        "*,events(title,date,location),community_organizations(name),ticket_order_items(ticket_name,unit_price_cents,quantity)",
      )
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
    const tickets = await db
      .from("event_tickets")
      .select("ticket_code")
      .eq("order_id", order.id);
    const settingResult = await db
      .from("event_ticket_settings")
      .select(
        "confirmation_email_message,confirmation_email_footer,confirmation_reply_to",
      )
      .eq("site_id", order.site_id)
      .eq("event_id", order.event_id)
      .maybeSingle();
    const settings = settingResult.data;
    const event = Array.isArray(order.events) ? order.events[0] : order.events;
    const organization = Array.isArray(order.community_organizations)
      ? order.community_organizations[0]
      : order.community_organizations;
    const email = ticketConfirmationEmail({
      siteName: "Seattle Desi TV",
      eventName: event?.title || "Event",
      eventDate: event?.date || "",
      eventLocation: event?.location || "",
      organizerName: organization?.name || "Event organizer",
      orderNumber: order.order_number,
      buyerName: order.buyer_name,
      currency: order.currency,
      totalCents: order.total_cents,
      ticketLines: (order.ticket_order_items || []).map((line: any) => ({
        name: line.ticket_name,
        quantity: line.quantity,
        unitPriceCents: line.unit_price_cents,
      })),
      ticketCodes: (tickets.data || []).map((row) => row.ticket_code),
      organizerMessage: settings?.confirmation_email_message,
      organizerFooter: settings?.confirmation_email_footer,
    });
    const archive = await db
      .from("ticket_email_deliveries")
      .insert({
        site_id: order.site_id,
        order_id: order.id,
        recipient: order.buyer_email,
        subject: `[TEST] ${email.subject}`,
      })
      .select("id")
      .single();
    if (process.env.RESEND_API_KEY) {
      const sent = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "Seattle Desi TV <updates@seattledesitv.com>",
        to: order.buyer_email,
        replyTo: settings?.confirmation_reply_to || undefined,
        subject: `[TEST] ${email.subject}`,
        html: email.html,
      });
      await db
        .from("ticket_email_deliveries")
        .update(
          sent.error
            ? { status: "failed", error_message: sent.error.message }
            : {
                status: "sent",
                provider_email_id: sent.data?.id || null,
                sent_at: new Date().toISOString(),
              },
        )
        .eq("id", archive.data?.id);
    }
    return NextResponse.json({
      ok: true,
      status: paid.data?.status,
      emailSent: Boolean(process.env.RESEND_API_KEY),
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
