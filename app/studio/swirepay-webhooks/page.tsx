"use client";
import { useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { useSwirepayWebhookEvents } from "../../hooks/useSwirepayWebhookEvents";
export default function SwirepayWebhooksPage() {
  const { events, loading, saving, error, markReviewed } =
    useSwirepayWebhookEvents();
  const [open, setOpen] = useState(""),
    [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StudioHeader />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="font-black uppercase tracking-wide text-pink-600">
          Payment diagnostics
        </p>
        <h1 className="mt-2 text-4xl font-black">Swirepay Webhook Events</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Capture-only inspection. Every row passed HMAC-SHA256 signature
          verification. No payment or listing is activated from this page.
        </p>
        <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900">
          Endpoint: https://seattledesitv.com/api/webhooks/swirepay · Header:
          x-swirepay-signature
        </div>
        {error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-800">
            {error}
          </p>
        )}
        {loading ? (
          <p className="mt-6">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-3xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-pink-600">
                      {event.event_type || "Unknown event type"}
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      {event.payment_gid ||
                        event.provider_event_id ||
                        "Identifier pending payload mapping"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Received {new Date(event.received_at).toLocaleString()} ·{" "}
                      {event.processing_status}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                    Signature verified
                  </span>
                </div>
                <button
                  onClick={() => setOpen(open === event.id ? "" : event.id)}
                  className="mt-4 rounded-xl border px-4 py-2 text-sm font-black"
                >
                  {open === event.id ? "Hide payload" : "Inspect payload"}
                </button>
                {open === event.id && (
                  <div className="mt-4">
                    <pre className="max-h-[520px] overflow-auto rounded-2xl bg-slate-950 p-5 text-xs text-slate-100">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                    <textarea
                      value={notes[event.id] ?? event.processing_notes ?? ""}
                      onChange={(e) =>
                        setNotes((current) => ({
                          ...current,
                          [event.id]: e.target.value,
                        }))
                      }
                      placeholder="Document the event type, identifiers, amount, customer, and mapping fields found..."
                      className="mt-3 min-h-24 w-full rounded-xl border p-3"
                    />
                    <button
                      disabled={saving}
                      onClick={() =>
                        markReviewed(event.id, notes[event.id] || "")
                      }
                      className="mt-3 rounded-xl bg-pink-600 px-4 py-2 font-black text-white"
                    >
                      Mark payload reviewed
                    </button>
                  </div>
                )}
              </article>
            ))}
            {events.length === 0 && (
              <p className="rounded-2xl bg-white p-7 text-slate-500">
                No verified webhook events have been received yet.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
