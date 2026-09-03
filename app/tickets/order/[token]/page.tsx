"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";
import TicketQrCode from "../../../components/ticketing/TicketQrCode";

const supabase = getSupabaseBrowserClient();

const money = (c: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    c / 100,
  );
export default function TicketOrderPage() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [order, setOrder] = useState<any>(null);
  const [message, setMessage] = useState("Loading your order…");
  const [testing, setTesting] = useState(false);
  async function simulatePayment() {
    setTesting(true);
    setMessage("Simulating verified payment…");
    const session = await supabase.auth.getSession();
    const response = await fetch("/api/tickets/test-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session?.access_token || ""}`,
      },
      body: JSON.stringify({ token }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Test payment failed.");
      setTesting(false);
      return;
    }
    window.location.reload();
  }
  useEffect(() => {
    if (!token) return;
    void fetch(`/api/tickets/orders?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setOrder(body);
      })
      .catch((error) => setMessage(error.message || "Order not found."));
  }, [token]);
  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-6 py-12">
        {!order ? (
          <div className="rounded-3xl border bg-white p-8 font-bold">
            {message}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="bg-slate-950 p-8 text-white">
              <p className="text-xs font-black uppercase tracking-[.2em] text-pink-300">
                Ticket order
              </p>
              <h1 className="mt-2 text-4xl font-black">
                {order.events?.title}
              </h1>
              <p className="mt-3 text-slate-300">
                {order.order_number} · {order.events?.date} ·{" "}
                {order.events?.location}
              </p>
            </div>
            <div className="p-8">
              <div className="rounded-2xl bg-amber-50 p-5">
                <p className="font-black text-amber-900">
                  Tickets reserved for 15 minutes
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Your tickets are not confirmed until Swirepay payment succeeds
                  and SDTV receives its verified payment notification.
                </p>
              </div>
              <h2 className="mt-7 text-2xl font-black">Order Summary</h2>
              <div className="mt-4 divide-y rounded-2xl border">
                {(order.ticket_order_items || []).map((item: any) => (
                  <div
                    key={item.ticket_name}
                    className="flex justify-between gap-3 p-4"
                  >
                    <span>
                      <b>{item.ticket_name}</b> × {item.quantity}
                    </span>
                    <b>{money(item.line_total_cents, order.currency)}</b>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-right">
                <p>
                  Subtotal: <b>{money(order.subtotal_cents, order.currency)}</b>
                </p>
                {order.fee_cents > 0 && (
                  <p>
                    Fees: <b>{money(order.fee_cents, order.currency)}</b>
                  </p>
                )}
                <p className="text-2xl font-black">
                  Total: {money(order.total_cents, order.currency)}
                </p>
              </div>
              <div className="mt-7 rounded-2xl bg-slate-100 p-5">
                <h2 className="font-black">
                  Secure payment connection pending
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  This order and its inventory reservation are working. SDTV
                  will place the Swirepay payment component here after the
                  ticket-specific payment connection is completed.
                </p>
                {order.testPaymentEnabled &&
                  order.status === "pending_payment" && (
                    <button
                      onClick={simulatePayment}
                      disabled={testing}
                      className="mt-4 rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 disabled:opacity-40"
                    >
                      {testing
                        ? "Completing Test…"
                        : "Admin: Simulate Successful Payment"}
                    </button>
                  )}
              </div>
              {order.status === "paid" && order.event_tickets?.length > 0 && (
                <div className="mt-7">
                  <h2 className="text-2xl font-black">Your Entry Codes</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Keep these codes private and present one code for each
                    attendee at entry.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {order.event_tickets.map((ticket: any) => (
                      <div
                        key={ticket.ticket_code}
                        className="rounded-2xl border-2 border-pink-200 p-5"
                      >
                        <p className="text-xs font-black uppercase text-pink-600">
                          {ticket.status}
                        </p>
                        <TicketQrCode code={ticket.ticket_code} />
                        <p className="mt-3 text-center font-mono text-lg font-black">
                          {ticket.ticket_code}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <details open className="rounded-2xl border p-5">
                  <summary className="font-black">
                    Accepted Refund Policy
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                    {order.refund_policy_snapshot ||
                      "No refund policy supplied."}
                  </p>
                </details>
                <details className="rounded-2xl border p-5">
                  <summary className="font-black">
                    Accepted Ticket Terms
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                    {order.terms_snapshot || "No additional terms supplied."}
                  </p>
                </details>
              </div>
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
