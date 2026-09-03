"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { forSite } from "../../lib/sites/query";
import { useCurrentSite } from "../../lib/sites/SiteContext";

const supabase = getSupabaseBrowserClient();
type Setting = {
  id: string;
  currency: string;
  sales_start_at: string | null;
  sales_end_at: string | null;
  max_tickets_per_order: number;
  refund_policy: string | null;
  terms: string | null;
};
type Ticket = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  quantity_total: number;
  quantity_reserved: number;
  quantity_sold: number;
  max_per_order: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
};
const money = (c: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    c / 100,
  );
const openNow = (start: string | null, end: string | null) => {
  const now = Date.now();
  return (
    (!start || new Date(start).getTime() <= now) &&
    (!end || new Date(end).getTime() > now)
  );
};

export default function EventTicketPurchase({
  eventId,
  eventEnded,
}: {
  eventId: string;
  eventEnded: boolean;
}) {
  const site = useCurrentSite();
  const [setting, setSetting] = useState<Setting | null>(null);
  const [types, setTypes] = useState<Ticket[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const result = await forSite(
        supabase
          .from("event_ticket_settings")
          .select(
            "id,currency,sales_start_at,sales_end_at,max_tickets_per_order,refund_policy,terms",
          )
          .eq("event_id", eventId)
          .eq("status", "active"),
        site.id,
      ).maybeSingle();
      if (!active) return;
      const row = result.data as Setting | null;
      setSetting(row);
      if (row) {
        const tickets = await forSite(
          supabase
            .from("event_ticket_types")
            .select(
              "id,name,description,price_cents,quantity_total,quantity_reserved,quantity_sold,max_per_order,sales_start_at,sales_end_at",
            )
            .eq("ticket_setting_id", row.id)
            .eq("status", "active")
            .order("display_order"),
          site.id,
        );
        if (active) setTypes((tickets.data || []) as Ticket[]);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [eventId, site.id]);
  const selected = Object.values(quantities).reduce((a, b) => a + b, 0);
  const subtotal = useMemo(
    () =>
      types.reduce(
        (sum, type) => sum + (quantities[type.id] || 0) * type.price_cents,
        0,
      ),
    [types, quantities],
  );
  const salesOpen = Boolean(
    setting &&
    !eventEnded &&
    openNow(setting.sales_start_at, setting.sales_end_at),
  );
  if (loading)
    return (
      <div className="rounded-3xl border bg-white p-6 font-bold text-slate-500">
        Checking ticket availability…
      </div>
    );
  if (!setting) return null;
  function change(type: Ticket, next: number) {
    const available = Math.max(
      0,
      type.quantity_total - type.quantity_sold - type.quantity_reserved,
    );
    const others = selected - (quantities[type.id] || 0);
    const limit = Math.min(
      type.max_per_order,
      available,
      Math.max(0, setting!.max_tickets_per_order - others),
    );
    setQuantities((current) => ({
      ...current,
      [type.id]: Math.max(0, Math.min(next, limit)),
    }));
    setMessage("");
  }
  function proceed() {
    if (!selected) return setMessage("Select at least one ticket.");
    if (!accepted) return setMessage("Please accept the policies.");
    setMessage(
      "Your selection is ready. Secure Swirepay ticket payment will be enabled after the final connection is verified.",
    );
  }
  return (
    <section
      id="tickets"
      className="overflow-hidden rounded-3xl border border-pink-200 bg-white shadow-sm"
    >
      <div className="bg-slate-950 p-6 text-white md:p-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-pink-300">
          Tickets from {site.shortName}
        </p>
        <div className="mt-2 flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">Choose Your Tickets</h2>
            <p className="mt-2 text-sm text-slate-300">
              Purchase securely without leaving {site.name}.
            </p>
          </div>
          <span
            className={`h-fit rounded-full px-3 py-1 text-sm font-black ${salesOpen ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-400/20 text-amber-200"}`}
          >
            {eventEnded
              ? "Event ended"
              : salesOpen
                ? "On sale"
                : "Sales closed"}
          </span>
        </div>
      </div>
      <div className="p-6 md:p-8">
        <div className="grid gap-4">
          {types.map((type) => {
            const available = Math.max(
                0,
                type.quantity_total -
                  type.quantity_sold -
                  type.quantity_reserved,
              ),
              quantity = quantities[type.id] || 0,
              enabled =
                salesOpen &&
                openNow(type.sales_start_at, type.sales_end_at) &&
                available > 0;
            return (
              <article key={type.id} className="rounded-2xl border p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-black">
                      {type.name}{" "}
                      <span className="ml-2 text-pink-700">
                        {money(type.price_cents, setting.currency)}
                      </span>
                    </h3>
                    {type.description && (
                      <p className="mt-2 text-sm text-slate-600">
                        {type.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {available ? `${available} available` : "Sold out"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={!enabled || !quantity}
                      onClick={() => change(type, quantity - 1)}
                      className="h-11 w-11 rounded-xl border text-xl font-black disabled:opacity-30"
                    >
                      −
                    </button>
                    <b className="w-8 text-center">{quantity}</b>
                    <button
                      disabled={
                        !enabled ||
                        quantity >= available ||
                        selected >= setting.max_tickets_per_order
                      }
                      onClick={() => change(type, quantity + 1)}
                      className="h-11 w-11 rounded-xl border text-xl font-black disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!types.length && (
          <p className="rounded-2xl bg-slate-50 p-5 font-bold text-slate-500">
            Ticket types will be announced shortly.
          </p>
        )}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <details open className="rounded-2xl border bg-slate-50 p-5">
            <summary className="cursor-pointer font-black">
              Refund Policy
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {setting.refund_policy ||
                "Refund terms will be shown before sales open."}
            </p>
          </details>
          <details className="rounded-2xl border bg-slate-50 p-5">
            <summary className="cursor-pointer font-black">
              Ticket Terms
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {setting.terms || "Ticket terms will be shown before sales open."}
            </p>
          </details>
        </div>
        <div className="mt-6 rounded-2xl bg-pink-50 p-5">
          <p className="font-bold text-slate-600">
            {selected} ticket{selected === 1 ? "" : "s"}
          </p>
          <p className="text-2xl font-black">
            Subtotal: {money(subtotal, setting.currency)}
          </p>
          <label className="mt-4 flex gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="h-5 w-5 accent-pink-600"
            />
            I agree to the ticket terms and refund policy shown above.
          </label>
          <button
            disabled={!salesOpen || !selected || !accepted}
            onClick={proceed}
            className="mt-5 w-full rounded-xl bg-pink-600 p-4 text-lg font-black text-white disabled:opacity-40"
          >
            Continue to Secure Payment
          </button>
          {message && (
            <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold">
              {message}
            </p>
          )}
          <p className="mt-3 text-center text-xs text-slate-500">
            Accepted policies are saved with the order. Tickets issue only after
            verified payment.
          </p>
        </div>
      </div>
    </section>
  );
}
