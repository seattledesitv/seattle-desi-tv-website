"use client";

import { useEffect, useState } from "react";
import TestimonialsSection, { TestimonialItem } from "./TestimonialsSection";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export type FeaturedSocialItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  platform?: string | null;
  content_type?: string | null;
  content_url: string;
  thumbnail_url?: string | null;
  button_text?: string | null;
  display_order?: number | null;
};

function platformLabel(value?: string | null) {
  const platform = String(value || "instagram").toLowerCase();
  if (platform === "youtube") return "YouTube";
  if (platform === "facebook") return "Facebook";
  if (platform === "threads") return "Threads";
  if (platform === "website") return "Website";
  return "Instagram";
}

function platformAction(item: FeaturedSocialItem) {
  const platform = String(item.platform || "").toLowerCase();
  if (item.button_text) return item.button_text;
  if (platform === "youtube" || item.content_url.includes("youtube.com") || item.content_url.includes("youtu.be")) return "Watch Video";
  if (platform === "instagram" || item.content_url.includes("instagram.com")) return "Watch Reel";
  return "Open Link";
}

function contentLabel(item: FeaturedSocialItem) {
  const type = String(item.content_type || "highlight").replace(/_/g, " ");
  return `${platformLabel(item.platform)} · ${type}`;
}

function SocialCard({ item, featured = false }: { item: FeaturedSocialItem; featured?: boolean }) {
  return (
    <a href={item.content_url} target="_blank" rel="noreferrer" className={`group block overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/75 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:bg-slate-900 ${featured ? "lg:row-span-2" : ""}`}>
      <div className={`relative grid place-items-center overflow-hidden bg-white/5 ${featured ? "aspect-[16/10]" : "aspect-video"}`}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-pink-950/70 p-6 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-pink-600/90 text-2xl font-black text-white shadow-lg shadow-pink-600/30">▶</div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-200">{platformLabel(item.platform)}</p>
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-pink-200 backdrop-blur">{contentLabel(item)}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />
      </div>
      <div className={featured ? "p-6" : "p-5"}>
        <h3 className={`${featured ? "text-2xl md:text-3xl" : "text-lg"} font-black leading-tight`}>{item.title}</h3>
        {item.subtitle && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{item.subtitle}</p>}
        <span className="mt-5 inline-flex items-center justify-center rounded-full bg-pink-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-pink-600/25 transition group-hover:bg-pink-500">
          {platformAction(item)} <span className="ml-2">→</span>
        </span>
      </div>
    </a>
  );
}

export default function FeaturedSocialSection({ items, title, subtitle }: { items: FeaturedSocialItem[]; title: string; subtitle: string }) {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);

  useEffect(() => {
    async function loadTestimonials() {
      const { data, error } = await supabase
        .from("homepage_testimonials")
        .select("id,name,title,quote,image_url,display_order,active")
        .eq("active", true)
        .order("display_order", { ascending: true })
        .limit(6);
      if (!error && Array.isArray(data)) setTestimonials(data as TestimonialItem[]);
    }
    loadTestimonials();
  }, []);

  if (!items.length && !testimonials.length) return null;
  const visibleItems = items.slice(0, 6);
  const lead = visibleItems[0];
  const rest = visibleItems.slice(1);

  return (
    <>
      {items.length > 0 && <section key="featured_social" id="featured-social" className="relative overflow-hidden bg-[#050b18] px-6 py-10 text-white md:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(236,72,153,.20),transparent_22rem),radial-gradient(circle_at_88%_18%,rgba(255,210,100,.10),transparent_18rem)]" />
        <div className="relative mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-black/30 backdrop-blur md:p-10">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-pink-300">Social Highlights</p>
              <h2 className="mt-1 text-3xl font-black md:text-4xl">{title}</h2>
              <p className="mt-2 max-w-3xl text-slate-300">{subtitle}</p>
            </div>
            <a href="https://www.instagram.com/seattledesitv/" target="_blank" rel="noreferrer" className="text-sm font-black text-pink-300">Follow @SeattleDesiTV →</a>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <SocialCard item={lead} featured />
            <div className="grid gap-5 lg:col-span-2 md:grid-cols-2">
              {rest.map((item) => <SocialCard key={item.id} item={item} />)}
              {rest.length === 0 && <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-slate-300">Add more featured social items in Studio to show more cards here.</div>}
            </div>
          </div>
        </div>
      </section>}
      <TestimonialsSection items={testimonials} title="What our supporters are saying" />
    </>
  );
}
