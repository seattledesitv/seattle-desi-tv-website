import { Resend } from "resend";
import { ticketConfirmationEmail } from "./ticketConfirmationEmail";
import QRCode from "qrcode";

export async function sendTicketConfirmation(
  db: any,
  orderId: string,
  options: { test?: boolean } = {},
) {
  const result = await db
    .from("ticket_orders")
    .select("*,events(title,date,location,image,image_urls),community_organizations(name,image),ticket_order_items(ticket_name,unit_price_cents,quantity)")
    .eq("id", orderId)
    .maybeSingle();
  const order: any = result.data;
  if (!order) throw new Error("Paid ticket order was not found for confirmation.");
  const existing = await db
    .from("ticket_email_deliveries")
    .select("id,status")
    .eq("order_id", order.id)
    .eq("recipient", order.buyer_email)
    .in("status", ["pending", "sent"])
    .limit(1);
  if (existing.data?.length) return { sent: existing.data[0].status === "sent", duplicate: true };
  const [tickets, settingResult] = await Promise.all([
    db.from("event_tickets").select("ticket_code").eq("order_id", order.id),
    db
      .from("event_ticket_settings")
      .select("confirmation_email_subject,confirmation_email_message,confirmation_email_footer,confirmation_reply_to,parking_info,refund_policy,terms")
      .eq("site_id", order.site_id)
      .eq("event_id", order.event_id)
      .maybeSingle(),
  ]);
  const event = Array.isArray(order.events) ? order.events[0] : order.events;
  const organization = Array.isArray(order.community_organizations)
    ? order.community_organizations[0]
    : order.community_organizations;
  const email = ticketConfirmationEmail({
    siteName: "SDTV",
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
    ticketCodes: (tickets.data || []).map((row: any) => row.ticket_code),
    eventImage: event?.image || event?.image_urls?.[0] || null,
    organizerLogo: organization?.image || null,
    parkingInfo: settingResult.data?.parking_info,
    refundPolicy: order.refund_policy_snapshot || settingResult.data?.refund_policy,
    ticketTerms: order.terms_snapshot || settingResult.data?.terms,
    mapUrl: event?.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
      : null,
    subjectTemplate: settingResult.data?.confirmation_email_subject,
    organizerMessage: settingResult.data?.confirmation_email_message,
    organizerFooter: settingResult.data?.confirmation_email_footer,
  });
  const subject = `${options.test ? "[TEST] " : ""}${email.subject}`;
  const qrAttachments = await Promise.all(
    (tickets.data || []).map(async (row: any, index: number) => ({
      filename: `ticket-${index + 1}.png`,
      content: await QRCode.toBuffer(row.ticket_code, { width: 360, margin: 2 }),
      contentType: "image/png",
      inlineContentId: `ticket-qr-${index}`,
    })),
  );
  const archive = await db
    .from("ticket_email_deliveries")
    .insert({
      site_id: order.site_id,
      order_id: order.id,
      recipient: order.buyer_email,
      subject,
    })
    .select("id")
    .single();
  if (!process.env.RESEND_API_KEY) return { sent: false, duplicate: false };
  const sent = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <updates@seattledesitv.com>",
    to: order.buyer_email,
    replyTo: settingResult.data?.confirmation_reply_to || undefined,
    subject,
    html: email.html,
    attachments: qrAttachments,
  });
  await db
    .from("ticket_email_deliveries")
    .update(
      sent.error
        ? { status: "failed", error_message: sent.error.message }
        : { status: "sent", provider_email_id: sent.data?.id || null, sent_at: new Date().toISOString() },
    )
    .eq("id", archive.data?.id);
  return { sent: !sent.error, duplicate: false };
}
