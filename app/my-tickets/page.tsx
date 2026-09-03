"use client";
import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";
const supabase = getSupabaseBrowserClient();
const money = (c: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    c / 100,
  );
export default function MyTicketsPage() {
  const site = useCurrentSite();
  const [orders, setOrders] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading your tickets…");
  useEffect(() => {
    void (async () => {
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) {
        setMessage(
          "Please sign in to see tickets purchased with your account.",
        );
        return;
      }
      const result = await forSite(
        supabase
          .from("ticket_orders")
          .select(
            "id,order_number,status,currency,total_cents,paid_at,created_at,events(title,date,local_start_time,local_end_time,location),ticket_order_items(ticket_name,quantity),event_tickets(id,ticket_code,status,checked_in_at,attendee_name)",
          )
          .eq("buyer_user_id", auth.data.user.id)
          .order("created_at", { ascending: false }),
        site.id,
      );
      if (result.error) setMessage(result.error.message);
      else {
        setOrders(result.data || []);
        setMessage("");
      }
    })();
  }, [site.id]);
  return (
    <main className="min-h-screen bg-slate-50">
      <MyHubHeader />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-black uppercase text-pink-600">
          Ticket Wallet
        </p>
        <h1 className="mt-2 text-4xl font-black">My Tickets</h1>
        <p className="mt-2 text-slate-600">
          Paid tickets, entry codes, and order history for {site.name}.
        </p>
        {message && (
          <div className="mt-6 rounded-2xl border bg-white p-6 font-bold">
            {message}
          </div>
        )}
        <div className="mt-7 grid gap-6">
          {orders.map((order) => (
            <article
              key={order.id}
              className="overflow-hidden rounded-3xl border bg-white shadow-sm"
            >
              <div className="bg-slate-950 p-6 text-white">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-pink-300">
                      {order.order_number}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {order.events?.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      {order.events?.date} · {order.events?.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black">
                      {money(order.total_cents, order.currency)}
                    </p>
                    <p className="text-sm capitalize text-slate-300">
                      {String(order.status).replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(order.event_tickets || []).map((ticket: any) => (
                    <div key={ticket.id} className="rounded-2xl border p-5">
                      <p className="text-xs font-black uppercase text-pink-600">
                        {ticket.status}
                      </p>
                      <p className="mt-2 font-mono text-lg font-black">
                        {ticket.ticket_code}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {ticket.attendee_name || "Ticket holder"}
                      </p>
                      {ticket.checked_in_at && (
                        <p className="mt-2 text-xs font-bold text-emerald-700">
                          Checked in{" "}
                          {new Date(ticket.checked_in_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {order.status !== "paid" && (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
                    Tickets appear after verified payment confirmation.
                  </p>
                )}
              </div>
            </article>
          ))}
          {!message && !orders.length && (
            <div className="rounded-3xl border bg-white p-8 text-center font-bold text-slate-500">
              No ticket orders are connected to this account yet.
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
