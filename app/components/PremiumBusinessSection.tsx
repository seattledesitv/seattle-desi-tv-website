"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SafeImage from "./SafeImage";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";

const supabase = getSupabaseBrowserClient();
const MAX_FEATURED = 10;

type BusinessRow = {
  id: string;
  name: string;
  category?: string | null;
  offer?: string | null;
  discount?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
  is_premium?: boolean | null;
  premium_rank?: number | null;
  premium_starts_at?: string | null;
  premium_ends_at?: string | null;
  premium_label?: string | null;
  rating_average?: number;
  review_count?: number;
};

type ReviewRow = { business_id: string; rating: number };

function firstImage(row: BusinessRow) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || "";
}

function premiumIsActive(business: BusinessRow) {
  if (!business.is_premium) return false;
  const now = Date.now();
  const starts = business.premium_starts_at ? new Date(business.premium_starts_at).getTime() : 0;
  const ends = business.premium_ends_at ? new Date(business.premium_ends_at).getTime() : Number.POSITIVE_INFINITY;
  return starts <= now && now <= ends;
}

function dailyShuffleScore(id: string) {
  const day = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (const character of `${day}:${id}`) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function BusinessShowcaseCard({ business }: { business: BusinessRow }) {
  const image = firstImage(business);
  const premium = premiumIsActive(business);
  return (
    <a href="/businesses" className={`group min-w-[250px] max-w-[250px] snap-start overflow-hidden rounded-2xl bg-white text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl sm:min-w-[270px] sm:max-w-[270px] md:min-w-[290px] md:max-w-[290px] ${premium ? "border-2 border-amber-300 ring-2 ring-amber-300/15" : "border border-white/10"}`}>
      <div className="relative h-40 overflow-hidden bg-slate-100 sm:h-44">
        <SafeImage src={image} alt={business.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" fallbackClassName="h-full w-full bg-pink-50 text-pink-600 grid place-items-center font-black text-sm" fallbackLabel="Seattle Desi TV" widthHint={720} />
        {premium && <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-black uppercase text-amber-950 shadow-lg">{business.premium_label || "Premium"}</span>}
        {!premium && business.rating_average && <span className="absolute left-3 top-3 rounded-full bg-slate-950/90 px-3 py-1.5 text-[10px] font-black text-white shadow-lg">★ {business.rating_average.toFixed(1)}</span>}
        {business.discount && <span className="absolute bottom-3 left-3 max-w-[88%] rounded-full bg-pink-600 px-3 py-1.5 text-[10px] font-black uppercase leading-tight text-white shadow-lg">{business.discount}</span>}
      </div>
      <div className="p-4 text-slate-950">
        <h3 className="line-clamp-2 min-h-12 text-base font-black leading-6 text-slate-950">{business.name}</h3>
        <p className="mt-1 line-clamp-1 text-xs font-bold text-pink-600">{business.category || "Local business"}</p>
        {(business.review_count || 0) > 0 && <p className="mt-2 text-xs font-bold text-amber-600">★ {Number(business.rating_average || 0).toFixed(1)} · {business.review_count} review{business.review_count === 1 ? "" : "s"}</p>}
        {business.offer && <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">{business.offer}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-600">View business</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-white transition group-hover:bg-pink-600">→</span>
        </div>
      </div>
    </a>
  );
}

function Impact({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center shadow-lg shadow-black/20"><p className="text-xl font-black text-white md:text-2xl">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/55">{label}</p></div>;
}

export default function PremiumBusinessSection({ businesses: fallbackBusinesses }: { businesses: BusinessRow[] }) {
  const site = useCurrentSite();
  const [businesses, setBusinesses] = useState<BusinessRow[]>(fallbackBusinesses);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadFeaturedBusinesses() {
      const premiumSelect = "id,name,category,offer,discount,image,image_urls,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label";
      const standardSelect = "id,name,category,offer,discount,image,image_urls";
      const premiumResult = await forSite(supabase.from("local_businesses").select(premiumSelect), site.id).eq("status", "approved");
      const businessRows = premiumResult.error
        ? ((await forSite(supabase.from("local_businesses").select(standardSelect), site.id).eq("status", "approved")).data || []) as BusinessRow[]
        : (premiumResult.data || []) as BusinessRow[];

      const reviewResult = await supabase.from("business_reviews").select("business_id,rating").eq("status", "approved");
      const reviewMap = new Map<string, { total: number; count: number }>();
      if (!reviewResult.error) {
        for (const review of (reviewResult.data || []) as ReviewRow[]) {
          const current = reviewMap.get(review.business_id) || { total: 0, count: 0 };
          current.total += Number(review.rating || 0);
          current.count += 1;
          reviewMap.set(review.business_id, current);
        }
      }

      setBusinesses(businessRows.map((business) => {
        const reviews = reviewMap.get(business.id);
        return { ...business, review_count: reviews?.count || 0, rating_average: reviews?.count ? reviews.total / reviews.count : 0 };
      }));
    }
    loadFeaturedBusinesses();
  }, [site.id]);

  const featured = useMemo(() => {
    const premium = businesses.filter(premiumIsActive).sort((a, b) => Number(a.premium_rank || 100) - Number(b.premium_rank || 100));
    const premiumIds = new Set(premium.map((business) => business.id));
    const remaining = businesses.filter((business) => !premiumIds.has(business.id)).sort((a, b) => {
      const ratingDifference = Number(b.rating_average || 0) - Number(a.rating_average || 0);
      if (ratingDifference) return ratingDifference;
      const reviewDifference = Number(b.review_count || 0) - Number(a.review_count || 0);
      if (reviewDifference) return reviewDifference;
      return dailyShuffleScore(a.id) - dailyShuffleScore(b.id);
    });
    return [...premium, ...remaining].slice(0, MAX_FEATURED);
  }, [businesses]);

  function scroll(direction: number) {
    scrollerRef.current?.scrollBy({ left: direction * Math.min(620, scrollerRef.current.clientWidth * 0.85), behavior: "smooth" });
  }

  const premiumCount = featured.filter(premiumIsActive).length;
  return (
    <section key="businesses" className="bg-[#050b18] px-4 py-12 md:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#080201] px-5 py-8 text-white shadow-2xl md:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,210,100,.20),transparent_20rem),radial-gradient(circle_at_88%_20%,rgba(236,72,153,.16),transparent_18rem),linear-gradient(100deg,#070201,#210715,#070201)]" />
        <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle,rgba(255,210,100,.50)_1px,transparent_2px)] [background-size:34px_34px]" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffe099]">Featured SDTV Businesses ✦</p><h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Discover Local Businesses</h2><p className="mt-2 max-w-2xl text-sm text-white/75">Premium partners appear first, followed by highly rated and rotating community businesses.</p></div>
          <a href="/businesses" className="rounded-full bg-pink-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-pink-600/30">View All Businesses →</a>
        </div>

        <div className="relative z-10 mt-7">
          {featured.length > 1 && <div className="mb-3 flex justify-end gap-2"><button type="button" onClick={() => scroll(-1)} aria-label="Previous businesses" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-xl font-black text-white transition hover:bg-white/20">‹</button><button type="button" onClick={() => scroll(1)} aria-label="Next businesses" className="grid h-11 w-11 place-items-center rounded-full bg-pink-600 text-xl font-black text-white shadow-lg transition hover:bg-pink-500">›</button></div>}
          <div ref={scrollerRef} className="flex max-w-full snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/10 p-8 text-white/60">No approved businesses yet.</div> : featured.map((business) => <BusinessShowcaseCard key={business.id} business={business} />)}
          </div>
          <p className="mt-2 text-xs font-bold text-[#ffe099]">Showing {featured.length} featured business{featured.length === 1 ? "" : "es"}{premiumCount ? `, including ${premiumCount} active premium listing${premiumCount === 1 ? "" : "s"}` : ""}. Swipe or use the arrows to explore.</p>
        </div>

        <div className="relative z-10 mt-7 grid grid-cols-2 gap-3 md:grid-cols-4"><Impact value="500+" label="Community Reach" /><Impact value="150+" label="Businesses" /><Impact value="80+" label="Partners" /><Impact value="1M+" label="Total Reach" /></div>
      </div>
    </section>
  );
}
