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
      (code) =>
        `<div style="margin:10px 0;padding:14px;border:2px solid #cf3778;border-radius:12px;font-family:monospace;font-weight:bold">${escape(code)}</div>`,
    )
    .join("");
  return {
    subject: `Your tickets for ${data.eventName} · ${data.orderNumber}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111827"><div style="background:#020617;color:white;padding:28px;border-radius:18px 18px 0 0"><div style="color:#f9a8d4;font-weight:bold">${escape(data.siteName)}</div><h1>${escape(data.eventName)}</h1><p>${escape(data.eventDate)} · ${escape(data.eventLocation)}</p></div><div style="padding:28px;border:1px solid #ddd"><p>Hello ${escape(data.buyerName)},</p><p>${escape(data.organizerMessage || "Thank you for your purchase. Present each ticket code at entry.")}</p><p><b>Presented by ${escape(data.organizerName)}</b></p><table style="width:100%;border-collapse:collapse">${rows}</table><p style="font-size:22px;text-align:right"><b>Total ${escape(money(data.totalCents, data.currency))}</b></p><h2>Your entry codes</h2>${codes}<p>${escape(data.organizerFooter || "")}</p><hr/><p style="font-size:12px;color:#64748b">Tickets and payment confirmation issued by ${escape(data.siteName)}. Keep this email private.</p></div></div>`,
  };
}
