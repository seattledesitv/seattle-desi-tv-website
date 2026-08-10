"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useClassifieds } from "../hooks/useClassifieds";
import { createClassifiedCheckout } from "../lib/swirepay/services/classifiedCheckoutService";
export default function MyClassifieds() {
  const { ads, loading, saving, error, update } = useClassifieds("owner");
  const router = useRouter();
  const [paymentLoading, setPaymentLoading] = useState("");
  const [paymentError, setPaymentError] = useState("");

  async function beginPayment(id: string) {
    setPaymentLoading(id);
    setPaymentError("");
    try {
      const intent = await createClassifiedCheckout(id);
      router.push(`/payments/classifieds/${intent.token}`);
    } catch (cause) {
      setPaymentError(
        cause instanceof Error ? cause.message : "Could not open checkout.",
      );
      setPaymentLoading("");
    }
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="font-black uppercase text-pink-600">My SDTV</p>
            <h1 className="text-4xl font-black">My Classifieds</h1>
          </div>
          <Link
            href="/classifieds/new"
            className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white"
          >
            Post a Classified
          </Link>
        </div>
        {error && <p className="mt-5 rounded-xl bg-red-50 p-4">{error}</p>}
        {paymentError && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-800">
            {paymentError}
          </p>
        )}
        {loading ? (
          <p className="mt-8">Loading...</p>
        ) : (
          <div className="mt-8 grid gap-4">
            {ads.map((a) => (
              <article key={a.id} className="rounded-3xl border bg-white p-6">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-pink-600">
                      {a.status.replaceAll("_", " ")}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">{a.title}</h2>
                    <p className="mt-2 text-slate-600">
                      {a.location} · Placement: {a.requested_placement}
                    </p>
                    {a.quoted_price_cents != null && (
                      <p className="mt-2 font-bold">
                        Approved amount: $
                        {(a.quoted_price_cents / 100).toFixed(2)} ·{" "}
                        {a.payment_status}
                      </p>
                    )}
                    {a.admin_notes && (
                      <p className="mt-3 rounded-xl bg-yellow-50 p-3">
                        SDTV: {a.admin_notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {a.status === "active" && (
                      <>
                        <a
                          href={`/classifieds/${a.id}`}
                          className="rounded-xl border px-4 py-2 font-bold"
                        >
                          View
                        </a>
                        <button
                          disabled={saving}
                          onClick={() =>
                            update(a.id, {
                              status: a.category === "jobs" ? "filled" : "sold",
                            })
                          }
                          className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white"
                        >
                          Mark {a.category === "jobs" ? "filled" : "sold"}
                        </button>
                      </>
                    )}
                    {a.status === "approved_pending_payment" && (
                      <>
                        <button
                          type="button"
                          disabled={paymentLoading === a.id}
                          onClick={() => void beginPayment(a.id)}
                          className="rounded-xl bg-pink-600 px-4 py-2 font-bold text-white disabled:opacity-50"
                        >
                          {paymentLoading === a.id
                            ? "Opening secure checkout..."
                            : "Pay securely on SDTV"}
                        </button>
                        {a.payment_link && (
                          <a
                            href={a.payment_link}
                            className="rounded-xl border px-4 py-2 text-sm font-bold"
                          >
                            External payment fallback
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!ads.length && (
              <p className="rounded-2xl bg-white p-8 text-slate-500">
                You have not submitted any classifieds.
              </p>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
