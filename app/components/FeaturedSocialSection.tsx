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

function SocialCard({ item }: { item: FeaturedSocialItem }) {
  return (
    <a href={item.content_url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/70 transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-2xl">
      <div className="relative grid aspect-[16/10] place-items-center overflow-hidden bg-[#fff7ef]">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#fff7ef] via-white to-[#f9e7d6] p-6 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-pink-600 text-2xl font-black text-white shadow-lg shadow-pink-600/25">▶</div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-700">{platformLabel(item.platform)}</p>
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-pink-600 shadow-sm backdrop-blur">{contentLabel(item)}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-70" />
      </div>
      <div className="p-5">
        <h3 className="text-xl font-black leading-tight text-slate-950">{item.title}</h3>
        {item.subtitle && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.subtitle}</p>}
        <span className="mt-5 inline-flex items-center justify-center rounded-full bg-pink-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-pink-600/20 transition group-hover:bg-pink-500">
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

  return (
    <>
      {items.length > 0 && <section key="featured_social" id="featured-social" className="relative overflow-hidden bg-[#faf8f5] px-6 py-12 text-slate-950 md:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(251,191,36,.18),transparent_22rem),radial-gradient(circle_at_92%_18%,rgba(219,39,119,.08),transparent_18rem)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-pink-600">Social Highlights</p>
              <h2 className="mt-1 text-3xl font-black md:text-4xl">{title}</h2>
              <p className="mt-2 max-w-3xl text-slate-600">{subtitle}</p>
            </div>
            <a href="https://www.instagram.com/seattledesitv/" target="_blank" rel="noreferrer" className="text-sm font-black text-pink-600">Follow @SeattleDesiTV →</a>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => <SocialCard key={item.id} item={item} />)}
          </div>
        </div>
      </section>}
      <TestimonialsSection items={testimonials} title="What our supporters are saying" />
    </>
  );
}
