type TicketLine = { name: string; quantity: number; unitPriceCents: number };
type Confirmation = {
  siteName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  organizerName: string;
  orderNumber: string;
  buyerName: string;
  currency: string;
  totalCents: number;
  ticketLines: TicketLine[];
  ticketCodes: string[];
  eventImage?: string | null;
  organizerLogo?: string | null;
  parkingInfo?: string | null;
  refundPolicy?: string | null;
  ticketTerms?: string | null;
  mapUrl?: string | null;
  subjectTemplate?: string | null;
  organizerMessage?: string | null;
  organizerFooter?: string | null;
};
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
export function ticketConfirmationEmail(data: Confirmation) {
  const rows = data.ticketLines
    .map(
      (line) =>
        `<tr><td style="padding:10px;border-bottom:1px solid #ddd">${escape(line.name)} × ${line.quantity}</td><td style="padding:10px;border-bottom:1px solid #ddd;text-align:right">${escape(money(line.unitPriceCents * line.quantity, data.currency))}</td></tr>`,
    )
    .join("");
  const codes = data.ticketCodes
    .map(
      (code, index) =>
        `<div style="margin:14px 0;padding:14px;border:2px solid #cf3778;border-radius:12px;text-align:center"><img src="cid:ticket-qr-${index}" width="180" height="180" alt="Ticket QR code" style="display:block;margin:0 auto 10px"/><div style="font-family:monospace;font-weight:bold">${escape(code)}</div></div>`,
    )
    .join("");
  const subject = (data.subjectTemplate || "Your tickets for {{event_name}} · {{order_number}}")
    .replaceAll("{{event_name}}", data.eventName)
    .replaceAll("{{organization_name}}", data.organizerName)
    .replaceAll("{{order_number}}", data.orderNumber);
  const eventImage = data.eventImage
    ? `<img src="${escape(data.eventImage)}" alt="${escape(data.eventName)}" style="display:block;width:100%;max-height:340px;object-fit:cover"/>`
    : "";
  const organizer = data.organizerLogo
    ? `<img src="${escape(data.organizerLogo)}" alt="${escape(data.organizerName)} logo" width="64" height="64" style="object-fit:contain;border-radius:12px;margin-right:14px;vertical-align:middle"/>`
    : "";
  const map = data.mapUrl
    ? `<p><a href="${escape(data.mapUrl)}" style="display:inline-block;background:#cf3778;color:white;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:bold">Open location in Maps</a></p>`
    : "";
  const parking = data.parkingInfo
    ? `<h3>Parking & arrival</h3><p style="white-space:pre-line">${escape(data.parkingInfo)}</p>`
    : "";
  const policies = `<div style="margin-top:22px;padding:18px;background:#f8fafc;border-radius:12px"><h3>Refund policy</h3><p style="white-space:pre-line">${escape(data.refundPolicy || "No refund policy supplied.")}</p><h3>Ticket terms</h3><p style="white-space:pre-line">${escape(data.ticketTerms || "No additional ticket terms supplied.")}</p></div>`;
  return {
    subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111827"><div style="background:#020617;color:white;padding:28px;border-radius:18px 18px 0 0"><div style="color:#f9a8d4;font-weight:bold">${escape(data.siteName)}</div><h1>${escape(data.eventName)}</h1><p>${escape(data.eventDate)} · ${escape(data.eventLocation)}</p></div>${eventImage}<div style="padding:28px;border:1px solid #ddd"><p>Hello ${escape(data.buyerName)},</p><p>${escape(data.organizerMessage || "Thank you for your registration. Present each QR code at entry.")}</p><p>${organizer}<b>Presented by ${escape(data.organizerName)}</b></p><h3>Event location</h3><p>${escape(data.eventLocation)}</p>${map}${parking}<table style="width:100%;border-collapse:collapse">${rows}</table><p style="font-size:22px;text-align:right"><b>Total ${escape(money(data.totalCents, data.currency))}</b></p><h2>Your entry QR codes</h2>${codes}${policies}<p style="white-space:pre-line">${escape(data.organizerFooter || "")}</p><hr/><p style="font-size:12px;color:#64748b">Tickets and registration confirmation issued by ${escape(data.siteName)}. Keep this email private.</p></div></div>`,
  };
}
