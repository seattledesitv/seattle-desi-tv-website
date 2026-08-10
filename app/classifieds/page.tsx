"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useClassifieds } from "../hooks/useClassifieds";
const names: Record<string, string> = {
  items: "Items for Sale",
  housing: "Housing & Rentals",
  jobs: "Jobs",
  services: "Services",
  vehicles: "Vehicles",
  community: "Community",
  classes: "Classes",
  lost_found: "Lost & Found",
  other: "Other",
};
function money(c: number | null, t: string) {
  if (t === "free") return "Free";
  if (t === "contact") return "Contact for price";
  if (c == null) return "Price not listed";
  return `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100)}${t === "negotiable" ? " · negotiable" : ""}`;
}
export default function ClassifiedsPage() {
  const { ads, loading, error } = useClassifieds("public");
  const [q, setQ] = useState(""),
    [category, setCategory] = useState("all");
  const visible = useMemo(
    () =>
      ads.filter(
        (a) =>
          (category === "all" || a.category === category) &&
          `${a.title} ${a.description} ${a.location}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [ads, q, category],
  );
  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />
      <section className="bg-slate-950 px-6 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="font-black uppercase tracking-wide text-pink-300">
            Community marketplace
          </p>
          <h1 className="mt-2 text-5xl font-black">SDTV Classifieds</h1>
          <p className="mt-4 max-w-3xl text-slate-300">
            Buy, sell, hire, rent, teach, and connect with the Seattle Desi
            community. Listings are reviewed by SDTV.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href="/classifieds/new"
              className="rounded-xl bg-pink-600 px-5 py-3 font-black"
            >
              Post a Classified
            </Link>
            <a
              href="/my-classifieds"
              className="rounded-xl bg-white px-5 py-3 font-black text-slate-950"
            >
              My Classifieds
            </a>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-3 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-[1fr_260px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search classifieds..."
            className="rounded-xl border p-3"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border p-3"
          >
            <option value="all">All categories</option>
            {Object.entries(names).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>
        )}
        {loading ? (
          <p className="mt-8">Loading...</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((ad) => (
              <a
                href={`/classifieds/${ad.id}`}
                key={ad.id}
                className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                {ad.image_urls[0] ? (
                  <img
                    src={ad.image_urls[0]}
                    alt={ad.title}
                    className="h-52 w-full object-cover"
                  />
                ) : (
                  <div className="grid h-52 place-items-center bg-slate-200 font-black text-slate-500">
                    SDTV Classified
                  </div>
                )}
                <div className="p-5">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-black uppercase text-pink-600">
                      {names[ad.category] || ad.category}
                    </span>
                    {ad.requested_placement !== "standard" && (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-black">
                        Featured
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl font-black">{ad.title}</h2>
                  <p className="mt-2 font-black text-emerald-700">
                    {money(ad.price_cents, ad.price_type)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{ad.location}</p>
                </div>
              </a>
            ))}
            {!visible.length && (
              <p className="rounded-2xl bg-white p-8 text-slate-500">
                No matching classifieds yet.
              </p>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
