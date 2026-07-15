"use client";

import { useEffect, useState } from "react";

export type HeroLayoutStyle = "image_focus" | "classic" | "premium" | "cinematic" | "split_right" | "split_left" | "spotlight" | "minimal";

export type HomepageHeroItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  button_text?: string | null;
  button_url?: string | null;
  badge?: string | null;
  display_order?: number | null;
  theme?: string | null;
  hero_layout?: string | null;
};

const themeStyles: Record<string, { accent: string; button: string; glow: string }> = {
  fallback: { accent: "text-white", button: "bg-white text-slate-950", glow: "" },
  gold: { accent: "text-amber-300", button: "bg-amber-400 text-slate-950", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(251,191,36,.28),transparent_22rem)]" },
  pink: { accent: "text-pink-300", button: "bg-pink-600 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(236,72,153,.30),transparent_22rem)]" },
  blue: { accent: "text-sky-300", button: "bg-sky-500 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(14,165,233,.28),transparent_22rem)]" },
  festival: { accent: "text-orange-300", button: "bg-orange-500 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(249,115,22,.30),transparent_22rem)]" },
  cinematic: { accent: "text-violet-300", button: "bg-violet-600 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(124,58,237,.28),transparent_22rem)]" },
  emerald: { accent: "text-emerald-300", button: "bg-emerald-500 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(16,185,129,.28),transparent_22rem)]" },
  crimson: { accent: "text-red-300", button: "bg-red-600 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(220,38,38,.28),transparent_22rem)]" },
  teal: { accent: "text-teal-300", button: "bg-teal-500 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(20,184,166,.28),transparent_22rem)]" },
  indigo: { accent: "text-indigo-300", button: "bg-indigo-600 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(79,70,229,.28),transparent_22rem)]" },
  sunset: { accent: "text-rose-300", button: "bg-rose-500 text-white", glow: "bg-[radial-gradient(circle_at_75%_20%,rgba(244,63,94,.25),transparent_20rem),radial-gradient(circle_at_20%_80%,rgba(249,115,22,.22),transparent_20rem)]" },
  monochrome: { accent: "text-slate-200", button: "bg-slate-200 text-slate-950", glow: "" },
};

function effectiveLayout(item: HomepageHeroItem, globalLayout: HeroLayoutStyle): HeroLayoutStyle {
  const value = item.hero_layout;
  return value && value !== "inherit" ? value as HeroLayoutStyle : globalLayout;
}

function ActionButtons({ item, theme }: { item: HomepageHeroItem; theme: { button: string } }) {
  return <div className="mt-6 flex flex-wrap gap-3">
    {item.button_text && item.button_url && <a href={item.button_url} className={`rounded-xl px-5 py-3 font-black ${theme.button}`}>{item.button_text}</a>}
    <a href="/radio" className="rounded-xl bg-white/10 px-5 py-3 font-black text-white backdrop-blur hover:bg-white/20">Listen to Radio</a>
    <a href="/businesses" className="rounded-xl border border-white/60 px-5 py-3 font-black text-white hover:bg-white/10">Local Businesses</a>
  </div>;
}

function HeroSlide({ item, globalLayout }: { item: HomepageHeroItem; globalLayout: HeroLayoutStyle }) {
  const layout = effectiveLayout(item, globalLayout);
  const image = item.image_url || "/hero-sdtv.png";
  const theme = themeStyles[item.theme || "fallback"] || themeStyles.fallback;
  const reverse = layout === "split_left";
  const split = ["classic", "premium", "split_right", "split_left"].includes(layout);

  if (split) {
    return <section className="relative min-h-[430px] overflow-hidden bg-slate-950 text-white md:min-h-[500px]">
      <div className={`absolute inset-0 ${theme.glow}`} />
      <div className={`relative mx-auto grid min-h-[430px] max-w-7xl items-center gap-7 px-6 py-8 md:min-h-[500px] md:px-10 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <p className={`text-sm font-black uppercase tracking-wide md:text-base ${theme.accent}`}>{item.badge || "Seattle Desi TV"}</p>
          <h1 className="mt-2 text-4xl font-black leading-tight md:text-6xl">{item.title}</h1>
          {item.subtitle && <p className="mt-4 max-w-3xl text-base text-slate-200 md:text-lg">{item.subtitle}</p>}
          <ActionButtons item={item} theme={theme} />
        </div>
        <div className={`relative min-h-[330px] overflow-hidden bg-black ${layout === "premium" ? "m-3 rounded-[1.75rem] border border-white/20 p-3 shadow-2xl" : "rounded-2xl"}`}>
          <img src={image} alt={item.title} className="absolute inset-0 h-full w-full object-contain" />
        </div>
      </div>
    </section>;
  }

  const imageClass = layout === "image_focus" ? "object-contain bg-black" : "object-cover";
  const overlay = layout === "image_focus"
    ? "bg-gradient-to-r from-black/80 via-black/35 to-black/15"
    : layout === "spotlight"
      ? "bg-[radial-gradient(circle_at_center,transparent_5%,rgba(2,6,23,.90)_78%)]"
      : "bg-gradient-to-t from-black/90 via-black/35 to-black/10";
  const alignment = layout === "cinematic" || layout === "spotlight" ? "items-center justify-center text-center" : layout === "minimal" ? "items-end" : "items-center";

  return <section className="relative min-h-[430px] overflow-hidden bg-slate-950 text-white md:min-h-[500px]">
    <img src={image} alt={item.title} className={`absolute inset-0 h-full w-full ${imageClass}`} />
    <div className={`absolute inset-0 ${overlay}`} />
    {theme.glow && <div className={`absolute inset-0 ${theme.glow}`} />}
    <div className={`relative z-10 mx-auto flex min-h-[430px] max-w-7xl px-6 py-8 md:min-h-[500px] md:px-10 ${alignment}`}>
      <div className={layout === "minimal" ? "max-w-2xl rounded-3xl border border-white/20 bg-black/55 p-6 backdrop-blur-md" : "max-w-4xl"}>
        <p className={`text-sm font-black uppercase tracking-wide md:text-base ${theme.accent}`}>{item.badge || "Seattle Desi TV"}</p>
        <h1 className="mt-2 text-4xl font-black leading-tight md:text-6xl">{item.title}</h1>
        {item.subtitle && <p className="mt-4 max-w-3xl text-base text-slate-200 md:text-lg">{item.subtitle}</p>}
        <ActionButtons item={item} theme={theme} />
      </div>
    </div>
  </section>;
}

export default function HomepageHeroV2({ items, globalLayout = "image_focus" }: { items: HomepageHeroItem[]; globalLayout?: HeroLayoutStyle }) {
  const [current, setCurrent] = useState(0);
  const heroItems = items.length ? items : [{ id: "default", title: "Seattle Desi TV", subtitle: "Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.", image_url: "/hero-sdtv.png", button_text: "Browse Events", button_url: "/events", badge: "Voice of the Desi Community", theme: "fallback", hero_layout: "inherit" }];

  useEffect(() => { if (current >= heroItems.length) setCurrent(0); }, [current, heroItems.length]);
  useEffect(() => { if (heroItems.length <= 1) return; const timer = setInterval(() => setCurrent((value) => (value + 1) % heroItems.length), 6000); return () => clearInterval(timer); }, [heroItems.length]);

  const item = heroItems[current];
  return <div className="relative">
    <HeroSlide item={item} globalLayout={globalLayout} />
    {heroItems.length > 1 && <>
      <button aria-label="Previous hero" onClick={() => setCurrent((value) => (value - 1 + heroItems.length) % heroItems.length)} className="absolute left-4 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full bg-white/15 font-black text-white hover:bg-white/25 md:left-8">‹</button>
      <button aria-label="Next hero" onClick={() => setCurrent((value) => (value + 1) % heroItems.length)} className="absolute right-4 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full bg-white/15 font-black text-white hover:bg-white/25 md:right-8">›</button>
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">{heroItems.map((entry, index) => <button key={entry.id} aria-label={`Show hero ${index + 1}`} onClick={() => setCurrent(index)} className={`h-2.5 rounded-full transition-all ${index === current ? "w-8 bg-white" : "w-2.5 bg-white/45"}`} />)}</div>
    </>}
  </div>;
}
