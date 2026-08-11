"use client";
import { useState } from "react";
import Link from "next/link";
import StudioHeader from "../../components/StudioHeader";
import { useClassifieds } from "../../hooks/useClassifieds";
import type { ClassifiedPlacement } from "../../lib/classifieds/types";
export default function ClassifiedAdmin() {
  const { ads, pricing, loading, saving, error, review, updatePricing } =
    useClassifieds("admin");
  const [notes, setNotes] = useState<Record<string, string>>({}),
    [placement, setPlacement] = useState<Record<string, ClassifiedPlacement>>(
      {},
    ),
    [price, setPrice] = useState<Record<string, string>>({});
  return (
    <main className="min-h-screen bg-slate-100">
      <StudioHeader />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="font-black uppercase text-pink-600">
          Community moderation
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-black">Classifieds</h1><p className="mt-2 text-slate-600">Admins may submit one-off classifieds through the same moderated creation workflow.</p></div><Link href="/classifieds/new" className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Add Classified</Link></div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-4">{error}</p>}
        <section className="mt-6 rounded-3xl bg-white p-6">
          <h2 className="text-2xl font-black">Configurable pricing</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {pricing.map((p) => (
              <div key={p.placement} className="rounded-2xl border p-4">
                <b>{p.label}</b>
                <label className="mt-3 grid gap-1 text-sm">
                  Price ($)
                  <input
                    type="number"
                    defaultValue={p.price_cents / 100}
                    onBlur={(e) =>
                      updatePricing(p.placement, {
                        price_cents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                    className="rounded-lg border p-2"
                  />
                </label>
                <label className="mt-2 grid gap-1 text-sm">
                  Duration days
                  <input
                    type="number"
                    defaultValue={p.duration_days}
                    onBlur={(e) =>
                      updatePricing(p.placement, {
                        duration_days: Number(e.target.value),
                      })
                    }
                    className="rounded-lg border p-2"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
        {loading ? (
          <p className="mt-6">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-4">
            {ads.map((a) => (
              <article key={a.id} className="rounded-3xl bg-white p-6">
                <p className="text-xs font-black uppercase text-pink-600">
                  {a.status.replaceAll("_", " ")} · requested{" "}
                  {a.requested_placement}
                </p>
                <h2 className="mt-1 text-2xl font-black">{a.title}</h2>
                <p className="mt-2 text-slate-600">{a.description}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <select
                    value={placement[a.id] || a.requested_placement}
                    onChange={(e) =>
                      setPlacement((v) => ({
                        ...v,
                        [a.id]: e.target.value as ClassifiedPlacement,
                      }))
                    }
                    className="rounded-xl border p-3"
                  >
                    {pricing.map((p) => (
                      <option key={p.placement} value={p.placement}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={price[a.id] ?? ""}
                    onChange={(e) =>
                      setPrice((v) => ({ ...v, [a.id]: e.target.value }))
                    }
                    placeholder="Final price ($); blank = configured"
                    className="rounded-xl border p-3"
                  />
                  <input
                    value={notes[a.id] ?? a.admin_notes ?? ""}
                    onChange={(e) =>
                      setNotes((v) => ({ ...v, [a.id]: e.target.value }))
                    }
                    placeholder="Admin notes"
                    className="rounded-xl border p-3"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={saving}
                    onClick={() =>
                      review(
                        a.id,
                        "approve",
                        placement[a.id] || a.requested_placement,
                        price[a.id]
                          ? Math.round(Number(price[a.id]) * 100)
                          : null,
                        notes[a.id] || "",
                      )
                    }
                    className="rounded-xl bg-green-700 px-4 py-2 font-black text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      review(
                        a.id,
                        "changes",
                        a.requested_placement,
                        null,
                        notes[a.id] || "",
                      )
                    }
                    className="rounded-xl bg-yellow-400 px-4 py-2 font-black"
                  >
                    Request changes
                  </button>
                  <button
                    onClick={() =>
                      review(
                        a.id,
                        "reject",
                        a.requested_placement,
                        null,
                        notes[a.id] || "",
                      )
                    }
                    className="rounded-xl bg-red-700 px-4 py-2 font-black text-white"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
