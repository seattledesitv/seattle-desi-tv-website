"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { ClassifiedService } from "../../lib/classifieds/services/classifiedService";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import type { ClassifiedAd } from "../../lib/classifieds/types";
import { entityIdFromParam } from "../../lib/seo/urls";
import { useCurrentSite } from "../../lib/sites/SiteContext";
export default function ClassifiedDetail() {
  const site = useCurrentSite();
  const [id, setId] = useState(""),
    [ad, setAd] = useState<ClassifiedAd | null>(null),
    [message, setMessage] = useState("Loading..."),
    [reporting, setReporting] = useState(false),
    [reason, setReason] = useState("scam"),
    [details, setDetails] = useState("");
  // The route identifier is synchronized after hydration.
  useEffect(() => {
    const value = entityIdFromParam(location.pathname.split("/").pop());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(value);
    if (!site.id) {
      setMessage("This classified is unavailable.");
      return;
    }
    void ClassifiedService.getPublic(value, site.id)
      .then((row) => {
        setAd(row);
        setMessage(row ? "" : "This classified is unavailable or expired.");
      })
      .catch(() => setMessage("Could not load this classified."));
  }, [site.id]);
  async function report() {
    const user = (await getSupabaseBrowserClient().auth.getUser()).data.user;
    if (!user) {
      location.href = `/login?next=/classifieds/${id}`;
      return;
    }
    await ClassifiedService.report(
      id,
      user.id,
      user.email || "",
      reason,
      details,
      site.id || "",
    );
    setReporting(false);
    setMessage("Thank you. SDTV will review your report.");
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 py-12">
        {!ad ? (
          <p className="rounded-2xl bg-white p-8">{message}</p>
        ) : (
          <>
            <Link href="/classifieds" className="font-black text-pink-600">
              ← All Classifieds
            </Link>
            <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_330px]">
              <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
                {ad.image_urls[0] && (
                  <img
                    src={ad.image_urls[0]}
                    alt={ad.title}
                    className="max-h-[560px] w-full object-contain bg-slate-100"
                  />
                )}
                <div className="p-7">
                  <p className="font-black uppercase text-pink-600">
                    {ad.category.replaceAll("_", " ")}
                  </p>
                  <h1 className="mt-2 text-4xl font-black">{ad.title}</h1>
                  <p className="mt-3 text-xl font-black text-emerald-700">
                    {ad.price_type === "free"
                      ? "Free"
                      : ad.price_cents != null
                        ? `$${(ad.price_cents / 100).toFixed(2)}`
                        : "Contact for price"}
                  </p>
                  <p className="mt-6 whitespace-pre-line leading-7 text-slate-700">
                    {ad.description}
                  </p>
                </div>
              </article>
              <aside className="space-y-4">
                <div className="rounded-3xl bg-white p-6">
                  <h2 className="text-xl font-black">Contact advertiser</h2>
                  <p className="mt-2 text-slate-600">
                    {ad.contact_name} · {ad.location}
                  </p>
                  {ad.contact_method === "email" && ad.contact_email && (
                    <a
                      href={`mailto:${ad.contact_email}`}
                      className="mt-4 block rounded-xl bg-pink-600 p-3 text-center font-black text-white"
                    >
                      Email
                    </a>
                  )}
                  {ad.contact_method === "phone" && ad.contact_phone && (
                    <a
                      href={`tel:${ad.contact_phone}`}
                      className="mt-4 block rounded-xl bg-pink-600 p-3 text-center font-black text-white"
                    >
                      Call
                    </a>
                  )}
                  {ad.contact_method === "external" && ad.destination_url && (
                    <a
                      href={ad.destination_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 block rounded-xl bg-pink-600 p-3 text-center font-black text-white"
                    >
                      Open link
                    </a>
                  )}
                  {ad.contact_method === "form" && (
                    <a
                      href={`/contact?interest=classified-${ad.id}`}
                      className="mt-4 block rounded-xl bg-pink-600 p-3 text-center font-black text-white"
                    >
                      Contact through SDTV
                    </a>
                  )}
                </div>
                <button
                  onClick={() => setReporting(!reporting)}
                  className="w-full rounded-xl border p-3 font-bold text-red-700"
                >
                  Report this listing
                </button>
                {reporting && (
                  <div className="rounded-2xl bg-white p-4">
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border p-3"
                    >
                      <option value="scam">Possible scam</option>
                      <option value="prohibited">Prohibited content</option>
                      <option value="duplicate">Duplicate</option>
                      <option value="inaccurate">Inaccurate</option>
                      <option value="sold">Already sold</option>
                      <option value="other">Other</option>
                    </select>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      className="mt-3 min-h-24 w-full rounded-xl border p-3"
                      placeholder="Details"
                    />
                    <button
                      onClick={report}
                      className="mt-3 w-full rounded-xl bg-red-700 p-3 font-black text-white"
                    >
                      Submit report
                    </button>
                  </div>
                )}
                <p className="rounded-2xl bg-yellow-50 p-4 text-xs text-slate-600">
                  SDTV reviews listings but does not guarantee transactions.
                  Never send money before verifying the advertiser and item.
                </p>
                {message !== "Loading..." && (
                  <p className="rounded-xl bg-green-50 p-3">{message}</p>
                )}
              </aside>
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
