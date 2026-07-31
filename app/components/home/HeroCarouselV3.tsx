"use client";

import { useEffect, useState } from "react";

export type HeroItemV3 = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  button_text?: string | null;
  button_url?: string | null;
  badge?: string | null;
  display_order?: number | null;
  theme?: string | null;
};

const themeMap: Record<string, { accent: string; accentSoft: string; button: string; glow: string; line: string }> = {
  fallback: { accent: "text-pink-300", accentSoft: "bg-pink-500/15 border-pink-300/25", button: "bg-pink-600 hover:bg-pink-500", glow: "from-pink-500/30 via-fuchsia-500/10", line: "border-pink-300/35" },
  pink: { accent: "text-pink-300", accentSoft: "bg-pink-500/15 border-pink-300/25", button: "bg-pink-600 hover:bg-pink-500", glow: "from-pink-500/35 via-rose-500/10", line: "border-pink-300/40" },
  gold: { accent: "text-amber-300", accentSoft: "bg-amber-400/15 border-amber-300/30", button: "bg-amber-400 hover:bg-amber-300 text-slate-950", glow: "from-amber-400/35 via-orange-400/10", line: "border-amber-300/45" },
  blue: { accent: "text-sky-300", accentSoft: "bg-sky-400/15 border-sky-300/25", button: "bg-sky-500 hover:bg-sky-400", glow: "from-sky-500/35 via-blue-500/10", line: "border-sky-300/40" },
  festival: { accent: "text-orange-300", accentSoft: "bg-orange-400/15 border-orange-300/25", button: "bg-orange-500 hover:bg-orange-400", glow: "from-orange-500/35 via-pink-500/10", line: "border-orange-300/40" },
  cinematic: { accent: "text-violet-300", accentSoft: "bg-violet-400/15 border-violet-300/25", button: "bg-violet-600 hover:bg-violet-500", glow: "from-violet-500/35 via-fuchsia-500/10", line: "border-violet-300/40" },
  emerald: { accent: "text-emerald-300", accentSoft: "bg-emerald-400/15 border-emerald-300/25", button: "bg-emerald-500 hover:bg-emerald-400", glow: "from-emerald-500/35 via-teal-500/10", line: "border-emerald-300/40" },
};

function splitSubtitle(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return { description: "", details: [] as string[] };
  const details = text.split(" · ").map((part) => part.trim()).filter(Boolean);
  return details.length > 1 ? { description: "", details } : { description: text, details: [] as string[] };
}

export default function HeroCarouselV3({ items }: { items: HeroItemV3[] }) {
  const heroItems = items.length ? items : [{ id: "default", title: "Seattle Desi TV", subtitle: "Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.", image_url: "/hero-sdtv.png", button_text: "Browse Events", button_url: "/events", badge: "Voice of the Desi Community", theme: "fallback" }];
  const [current, setCurrent] = useState(0);
  useEffect(() => { if (current >= heroItems.length) setCurrent(0); }, [current, heroItems.length]);
  useEffect(() => { if (heroItems.length <= 1) return; const timer = window.setInterval(() => setCurrent((value) => (value + 1) % heroItems.length), 7000); return () => window.clearInterval(timer); }, [heroItems.length]);

  const item = heroItems[current] || heroItems[0];
  const image = item.image_url || "/hero-sdtv.png";
  const theme = themeMap[String(item.theme || "fallback").toLowerCase()] || themeMap.fallback;
  const isEvent = String(item.id || "").startsWith("event-");
  const subtitle = splitSubtitle(item.subtitle);

  return <section className="sdtv-home-hero-v3 relative overflow-hidden bg-[#020617] px-3 py-4 text-white sm:px-5 md:px-8 md:py-7">
    <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-[7px] scale-110" style={{ backgroundImage: `url('${image}')` }} />
    <div className={`absolute inset-0 bg-gradient-to-r ${theme.glow} to-transparent`} />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(255,255,255,0.10),transparent_26rem)]" />
    <div className={`relative mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border ${theme.line} bg-slate-950/78 shadow-2xl backdrop-blur-xl`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.055] via-transparent to-black/30" />
      <div className="relative grid min-h-[480px] items-center gap-7 px-6 py-9 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14">
        <div className="max-w-2xl">
          <div className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${theme.accent} ${theme.accentSoft}`}>{item.badge || (isEvent ? "Featured Event" : "Seattle Desi TV")}</div>
          <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">{item.title}</h1>
          {subtitle.description && <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 md:text-lg">{subtitle.description}</p>}
          {subtitle.details.length > 0 && <div className="mt-6 flex flex-wrap gap-3">{subtitle.details.map((detail) => <span key={detail} className="rounded-xl border border-white/15 bg-white/[0.07] px-4 py-2 text-sm font-bold text-slate-100">{detail}</span>)}</div>}
          <div className="mt-7 flex flex-wrap gap-3">
            {item.button_text && item.button_url && <a href={item.button_url} className={`rounded-xl px-6 py-3 font-black text-white shadow-xl transition ${theme.button}`}>{item.button_text}</a>}
            <a href="/events" className="rounded-xl border border-white/25 bg-white/[0.06] px-6 py-3 font-black text-white transition hover:bg-white/10">Explore Events</a>
          </div>
        </div>
        <div className="flex min-h-[320px] items-center justify-center lg:justify-end">
          <div className={`relative w-full max-w-[350px] rounded-[1.65rem] border ${theme.line} bg-white/[0.08] p-3 shadow-2xl`}>
            <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-white/5 blur-2xl" />
            <div className="aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-slate-900">
              <img src={image} alt={item.title} className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </div>
      {heroItems.length > 1 && <div className="relative flex items-center justify-center gap-2 border-t border-white/10 px-5 py-4">
        <button aria-label="Previous hero" onClick={() => setCurrent((value) => (value - 1 + heroItems.length) % heroItems.length)} className="mr-2 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-xl">‹</button>
        {heroItems.map((hero, index) => <button key={hero.id} aria-label={`Show ${hero.title}`} onClick={() => setCurrent(index)} className={`h-2.5 rounded-full transition-all ${index === current ? "w-8 bg-white" : "w-2.5 bg-white/35"}`} />)}
        <button aria-label="Next hero" onClick={() => setCurrent((value) => (value + 1) % heroItems.length)} className="ml-2 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-xl">›</button>
      </div>}
    </div>
  </section>;
}
