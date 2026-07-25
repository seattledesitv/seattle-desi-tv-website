"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SafeImage from "./SafeImage";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

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
};

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

function BusinessShowcaseCard({ business, premium }: { business: BusinessRow; premium: boolean }) {
  const image = firstImage(business);
  return (
    <a href="/businesses" className={`group min-w-[250px] max-w-[250px] overflow-hidden rounded-2xl bg-white text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl sm:min-w-[270px] sm:max-w-[270px] md:min-w-[290px] md:max-w-[290px] ${premium ? "border-2 border-amber-300 ring-2 ring-amber-300/20" : "border border-white/10"}`}>
      <div className="relative h-40 overflow-hidden bg-slate-100 sm:h-44">
        <SafeImage src={image} alt={business.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" fallbackClassName="h-full w-full bg-pink-50 text-pink-600 grid place-items-center font-black text-sm" fallbackLabel="Seattle Desi TV" widthHint={720} />
        {premium && <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-black uppercase text-amber-950 shadow-lg">{business.premium_label || "Featured"}</span>}
        {business.discount && <span className="absolute bottom-3 left-3 max-w-[86%] rounded-full bg-pink-600 px-3 py-1.5 text-[10px] font-black uppercase leading-tight text-white shadow-lg">{business.discount}</span>}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 text-base font-black text-slate-950">{business.name}</h3>
        <p className="mt-1 line-clamp-1 text-xs font-bold text-pink-600">{business.category || "Local business"}</p>
        {business.offer && <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{business.offer}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">View business</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-white transition group-hover:bg-pink-600">→</span>
        </div>
      </div>
    </a>
  );
}

function Impact({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center shadow-lg shadow-black/20">
      <p className="text-xl font-black text-white md:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/55">{label}</p>
    </div>
  );
}

export default function PremiumBusinessSection({ businesses }: { businesses: BusinessRow[] }) {
  const [premiumBusinesses, setPremiumBusinesses] = useState<BusinessRow[]>([]);
  const [checkedPremium, setCheckedPremium] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadPremiumBusinesses() {
      const result = await supabase
        .from("local_businesses")
        .select("id,name,category,offer,discount,image,image_urls,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label")
        .eq("status", "approved")
        .eq("is_premium", true)
        .order("premium_rank", { ascending: true })
        .limit(50);
      if (!active) return;
      if (!result.error) setPremiumBusinesses((result.data || []).filter((row: BusinessRow) => premiumIsActive(row)) as BusinessRow[]);
      setCheckedPremium(true);
    }
    loadPremiumBusinesses();
    return () => { active = false; };
  }, []);

  const showcaseBusinesses = useMemo(() => {
    if (premiumBusinesses.length > 0) return premiumBusinesses;
    return checkedPremium ? businesses : businesses;
  }, [businesses, checkedPremium, premiumBusinesses]);
  const showingPremium = premiumBusinesses.length > 0;

  function scroll(direction: number) {
    scrollerRef.current?.scrollBy({ left: direction * Math.min(scrollerRef.current.clientWidth * 0.85, 900), behavior: "smooth" });
  }

  return (
    <section key="businesses" className="bg-[#050b18] px-4 py-12 md:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#080201] px-5 py-8 text-white shadow-2xl md:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,210,100,.20),transparent_20rem),radial-gradient(circle_at_88%_20%,rgba(236,72,153,.16),transparent_18rem),linear-gradient(100deg,#070201,#210715,#070201)]" />
        <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle,rgba(255,210,100,.50)_1px,transparent_2px)] [background-size:34px_34px]" />
        <div className="absolute left-[-10%] right-[-10%] top-0 h-20 rotate-[2deg] rounded-full bg-gradient-to-r from-transparent via-[#f5af23]/40 to-transparent blur-sm" />
        <div className="absolute left-[-10%] right-[-10%] bottom-14 h-20 rotate-[-2deg] rounded-full bg-gradient-to-r from-transparent via-[#f5af23]/35 to-transparent blur-sm" />

        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffe099]">{showingPremium ? "Featured SDTV Businesses ✦" : "SDTV Businesses ✦"}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Discover Local Businesses</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">{showingPremium ? "Explore active premium businesses supporting and serving our community." : "A visual showcase for trusted community businesses and marketplace partners."}</p>
          </div>
          <div className="flex items-center gap-2">
            {showcaseBusinesses.length > 3 && <><button type="button" onClick={() => scroll(-1)} aria-label="Previous featured businesses" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-xl font-black hover:bg-white/20">‹</button><button type="button" onClick={() => scroll(1)} aria-label="Next featured businesses" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-xl font-black hover:bg-white/20">›</button></>}
            <a href="/businesses" className="rounded-full bg-pink-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-pink-600/30">View All Businesses →</a>
          </div>
        </div>

        <div ref={scrollerRef} className="relative z-10 mt-8 flex max-w-full snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {showcaseBusinesses.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/10 p-8 text-white/60">No approved businesses yet.</div> : showcaseBusinesses.map((business) => <div key={business.id} className="snap-start"><BusinessShowcaseCard business={business} premium={showingPremium} /></div>)}
        </div>
        {showingPremium && <p className="relative z-10 mt-1 text-xs font-bold text-amber-200">Showing all active premium listings. Use the arrows or swipe to explore more.</p>}

        <div className="relative z-10 mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Impact value="500+" label="Community Reach" />
          <Impact value="150+" label="Businesses" />
          <Impact value="80+" label="Partners" />
          <Impact value="1M+" label="Total Reach" />
        </div>
      </div>
    </section>
  );
}
