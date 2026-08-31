"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { useMatrimony } from "../../hooks/useMatrimony";
import type { MatrimonyPricing } from "../../lib/matrimony/types";
import { useCurrentSite } from "../../lib/sites/SiteContext";
const money = (c: number | null) =>
  c === null
    ? "Not set"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(c / 100);
export default function StudioMatrimonyPage() {
  const site = useCurrentSite();
  const data = useMatrimony("admin");
  const [pricing, setPricing] = useState<MatrimonyPricing | null>(null),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [amounts, setAmounts] = useState<Record<string, string>>({}),
    [durations, setDurations] = useState<Record<string, string>>({}),
    [links, setLinks] = useState<Record<string, string>>({}),
    [references, setReferences] = useState<Record<string, string>>({});
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (data.pricing) setPricing(data.pricing);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data.pricing]);
  async function profileAction(id: string, decision: string) {
    try {
      await data.reviewProfile(id, decision, notes[id] || "");
    } catch {}
  }
  async function accessAction(id: string, decision: string) {
    const amount =
      amounts[id] === "" || amounts[id] === undefined
        ? null
        : Math.round(Number(amounts[id]) * 100);
    const duration =
      durations[id] === "" || durations[id] === undefined
        ? null
        : Number(durations[id]);
    try {
      await data.reviewAccess(
        id,
        decision,
        amount,
        duration,
        notes[id] || "",
        links[id] || "",
      );
    } catch {}
  }
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-5 py-10">
        <p className="font-black uppercase tracking-wide text-pink-300">
          Community Safety & Access
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Matrimony Management
        </h1>
        <p className="mt-2 text-slate-300">
          Review sensitive profiles and access requests for {site.name},
          configure shared pricing, and activate verified payments.
        </p>
        {data.error && (
          <div className="mt-6 rounded-2xl bg-red-100 p-4 font-bold text-red-900">
            {data.error}
          </div>
        )}
        {pricing && (
          <section className="mt-8 rounded-3xl bg-white p-6 text-slate-950">
            <h2 className="text-2xl font-black">Access Pricing</h2>
            <p className="mt-1 text-slate-600">
              Applicants see this price before requesting access. Admins can
              override it for an individual approval.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="font-bold">
                Price (USD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-xl border p-3 font-normal"
                  value={(pricing.price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      price_cents: Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </label>
              <label className="font-bold">
                Access Duration (days)
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="mt-1 w-full rounded-xl border p-3 font-normal"
                  value={pricing.duration_days}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      duration_days: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="font-bold md:col-span-2">
                Description
                <textarea
                  className="mt-1 w-full rounded-xl border p-3 font-normal"
                  value={pricing.description || ""}
                  onChange={(e) =>
                    setPricing({ ...pricing, description: e.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-3 font-bold">
                <input
                  type="checkbox"
                  checked={pricing.active}
                  onChange={(e) =>
                    setPricing({ ...pricing, active: e.target.checked })
                  }
                />
                Accept new access requests
              </label>
            </div>
            <button
              disabled={data.saving}
              onClick={() => void data.updatePricing(pricing)}
              className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-black text-white"
            >
              Save Pricing
            </button>
          </section>
        )}
        <section className="mt-8 rounded-3xl bg-white p-6 text-slate-950">
          <div className="flex justify-between">
            <h2 className="text-2xl font-black">Profile Reviews</h2>
            <span>{data.profiles.length}</span>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {data.profiles.map((profile) => (
              <article key={profile.id} className="rounded-2xl border p-5">
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-pink-50">
                    {profile.photo_urls?.[0] ? (
                      <img
                        src={profile.photo_urls[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs font-bold text-pink-600">
                        No photo
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-pink-600">
                      {profile.status.replaceAll("_", " ")}
                    </p>
                    <h3 className="text-xl font-black">
                      {profile.display_name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {profile.city} · Born {profile.birth_year}
                    </p>
                    <p className="text-sm text-slate-600">
                      {profile.occupation || "Occupation not provided"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">{profile.about}</p>
                <textarea
                  className="mt-4 w-full rounded-xl border p-3 text-sm"
                  placeholder="Admin notes / requested changes"
                  value={notes[profile.id] || ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [profile.id]: e.target.value })
                  }
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void profileAction(profile.id, "approve")}
                    className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => void profileAction(profile.id, "changes")}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => void profileAction(profile.id, "hold")}
                    className="rounded-lg border px-3 py-2 text-sm font-bold"
                  >
                    On Hold
                  </button>
                  <button
                    onClick={() => void profileAction(profile.id, "reject")}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => void profileAction(profile.id, "archive")}
                    className="rounded-lg border px-3 py-2 text-sm font-bold"
                  >
                    Archive
                  </button>
                </div>
              </article>
            ))}
            {!data.profiles.length && !data.loading && (
              <p className="text-slate-500">No profiles submitted.</p>
            )}
          </div>
        </section>
        <section className="mt-8 rounded-3xl bg-white p-6 text-slate-950">
          <div className="flex justify-between">
            <h2 className="text-2xl font-black">Access Requests</h2>
            <span>{data.requests.length}</span>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {data.requests.map((request) => (
              <article key={request.id} className="rounded-2xl border p-5">
                <p className="text-xs font-black uppercase text-pink-600">
                  {request.status.replaceAll("_", " ")} ·{" "}
                  {request.payment_status.replaceAll("_", " ")}
                </p>
                <h3 className="mt-1 font-black">{request.requester_email}</h3>
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                  {request.reason}
                </p>
                {request.quoted_price_cents !== null && (
                  <p className="mt-3 text-sm">
                    Approved: <b>{money(request.quoted_price_cents)}</b> ·{" "}
                    {request.duration_days} days
                  </p>
                )}
                {request.access_expires_at && (
                  <p className="text-sm">
                    Expires:{" "}
                    {new Date(request.access_expires_at).toLocaleString()}
                  </p>
                )}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-xl border p-3"
                    type="number"
                    step="0.01"
                    placeholder={`Price override (${pricing ? money(pricing.price_cents) : "default"})`}
                    value={amounts[request.id] || ""}
                    onChange={(e) =>
                      setAmounts({ ...amounts, [request.id]: e.target.value })
                    }
                  />
                  <input
                    className="rounded-xl border p-3"
                    type="number"
                    placeholder={`Days (${pricing?.duration_days || "default"})`}
                    value={durations[request.id] || ""}
                    onChange={(e) =>
                      setDurations({
                        ...durations,
                        [request.id]: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded-xl border p-3 md:col-span-2"
                    placeholder="Secure payment URL (optional until configured)"
                    value={links[request.id] || ""}
                    onChange={(e) =>
                      setLinks({ ...links, [request.id]: e.target.value })
                    }
                  />
                  <textarea
                    className="rounded-xl border p-3 md:col-span-2"
                    placeholder="Admin notes"
                    value={notes[request.id] || ""}
                    onChange={(e) =>
                      setNotes({ ...notes, [request.id]: e.target.value })
                    }
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void accessAction(request.id, "approve")}
                    className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white"
                  >
                    Approve & Set Price
                  </button>
                  <button
                    onClick={() => void accessAction(request.id, "changes")}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold"
                  >
                    Request Details
                  </button>
                  <button
                    onClick={() => void accessAction(request.id, "reject")}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => void accessAction(request.id, "revoke")}
                    className="rounded-lg border px-3 py-2 text-sm font-bold"
                  >
                    Revoke
                  </button>
                </div>
                {request.status === "approved_pending_payment" && (
                  <div className="mt-4 flex gap-2">
                    <input
                      className="flex-1 rounded-xl border p-3"
                      placeholder="Payment reference"
                      value={references[request.id] || ""}
                      onChange={(e) =>
                        setReferences({
                          ...references,
                          [request.id]: e.target.value,
                        })
                      }
                    />
                    <button
                      onClick={() =>
                        void data.completePayment(
                          request.id,
                          references[request.id] || "",
                        )
                      }
                      className="rounded-xl bg-pink-600 px-4 py-2 font-black text-white"
                    >
                      Mark Paid & Activate
                    </button>
                  </div>
                )}
              </article>
            ))}
            {!data.requests.length && !data.loading && (
              <p className="text-slate-500">No access requests.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
