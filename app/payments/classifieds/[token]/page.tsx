"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import SwirepayEmbeddedCheckout from "../../../components/payments/SwirepayEmbeddedCheckout";
import { useClassifiedCheckout } from "../../../hooks/useClassifiedCheckout";

export default function ClassifiedPaymentPage() {
  const token = String(useParams<{ token: string }>().token || "");
  const { intent, loading, error, refresh } = useClassifiedCheckout(token);
  const [verifying, setVerifying] = useState(false);

  const submitted = useCallback(() => setVerifying(true), []);

  useEffect(() => {
    if (!verifying || intent?.status === "succeeded") return;
    const timer = window.setInterval(() => void refresh(), 2000);
    const stop = window.setTimeout(() => setVerifying(false), 30000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [intent?.status, refresh, verifying]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-black uppercase tracking-wide text-pink-600">
          Secure SDTV checkout
        </p>
        <h1 className="mt-2 text-4xl font-black">Classified payment</h1>
        {loading && <p className="mt-8">Loading your approved payment...</p>}
        {error && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 font-bold text-red-800">
            {error}
            <div className="mt-4">
              <Link href="/my-classifieds" className="underline">
                Return to My Classifieds
              </Link>
            </div>
          </div>
        )}
        {intent && (
          <article className="mt-8 overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="bg-slate-950 p-7 text-white">
              <p className="text-xs font-black uppercase tracking-widest text-pink-300">
                {intent.classified.placement} placement
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {intent.classified.title}
              </h2>
              <p className="mt-5 text-4xl font-black">
                ${(intent.amountCents / 100).toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Final amount approved by Seattle Desi TV
              </p>
            </div>
            <div className="p-7">
              {intent.status === "succeeded" ? (
                <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-900">
                  <h3 className="text-xl font-black">Payment confirmed</h3>
                  <p className="mt-2">
                    Your classified has been activated. A signed Swirepay
                    confirmation was verified by SDTV.
                  </p>
                  <Link
                    href="/my-classifieds"
                    className="mt-5 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-black text-white"
                  >
                    Return to My Classifieds
                  </Link>
                </div>
              ) : intent.status === "pending" ? (
                <>
                  {verifying && (
                    <p className="mb-5 rounded-xl bg-blue-50 p-4 font-bold text-blue-900">
                      Payment submitted. Waiting for secure confirmation...
                    </p>
                  )}
                  {!intent.checkout.publicKey ||
                  !intent.checkout.checkoutUrl ? (
                    <p className="rounded-xl bg-amber-50 p-4 font-bold text-amber-900">
                      Embedded checkout is not configured yet. Please contact
                      SDTV.
                    </p>
                  ) : (
                    <SwirepayEmbeddedCheckout
                      intent={intent}
                      onSubmitted={submitted}
                    />
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-amber-50 p-5 text-amber-900">
                  <p className="font-black">This payment request has expired.</p>
                  <Link href="/my-classifieds" className="mt-3 inline-block underline">
                    Return to My Classifieds to create a new request
                  </Link>
                </div>
              )}
            </div>
          </article>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
