"use client";

import { useEffect, useState } from "react";

export type HeroLayoutStyle = "image_focus" | "classic" | "premium" | "cinematic" | "split_right" | "split_left" | "spotlight" | "minimal";
export type HeroItemV4 = { id: string; title: string; subtitle?: string | null; image_url?: string | null; button_text?: string | null; button_url?: string | null; badge?: string | null; display_order?: number | null; theme?: string | null; layout_style?: HeroLayoutStyle | "inherit" | null };

const themeMap: Record<string, { accent: string; soft: string; button: string; glow: string; line: string }> = {
  fallback: { accent: "text-white", soft: "bg-black/30 border-white/25", button: "bg-pink-600 hover:bg-pink-500", glow: "", line: "border-white/20" },
  pink: { accent: "text-pink-300", soft: "bg-pink-500/15 border-pink-300/25", button: "bg-pink-600 hover:bg-pink-500", glow: "from-pink-500/35 via-rose-500/10", line: "border-pink-300/40" },
  gold: { accent: "text-amber-300", soft: "bg-amber-400/15 border-amber-300/30", button: "bg-amber-400 hover:bg-amber-300 text-slate-950", glow: "from-amber-500/35 via-orange-500/10", line: "border-amber-300/45" },
  blue: { accent: "text-sky-300", soft: "bg-sky-400/15 border-sky-300/25", button: "bg-sky-500 hover:bg-sky-400", glow: "from-sky-500/35 via-blue-500/10", line: "border-sky-300/40" },
  festival: { accent: "text-orange-300", soft: "bg-orange-400/15 border-orange-300/25", button: "bg-orange-500 hover:bg-orange-400", glow: "from-orange-500/35 via-pink-500/10", line: "border-orange-300/40" },
  cinematic: { accent: "text-violet-300", soft: "bg-violet-400/15 border-violet-300/25", button: "bg-violet-600 hover:bg-violet-500", glow: "from-violet-500/35 via-fuchsia-500/10", line: "border-violet-300/40" },
  emerald: { accent: "text-emerald-300", soft: "bg-emerald-400/15 border-emerald-300/25", button: "bg-emerald-500 hover:bg-emerald-400", glow: "from-emerald-500/35 via-teal-500/10", line: "border-emerald-300/40" },
  crimson: { accent: "text-rose-300", soft: "bg-rose-500/15 border-rose-300/25", button: "bg-rose-600 hover:bg-rose-500", glow: "from-rose-600/35 via-red-500/10", line: "border-rose-300/40" },
  teal: { accent: "text-teal-300", soft: "bg-teal-400/15 border-teal-300/25", button: "bg-teal-600 hover:bg-teal-500", glow: "from-teal-500/35 via-cyan-500/10", line: "border-teal-300/40" },
  indigo: { accent: "text-indigo-300", soft: "bg-indigo-400/15 border-indigo-300/25", button: "bg-indigo-600 hover:bg-indigo-500", glow: "from-indigo-500/35 via-violet-500/10", line: "border-indigo-300/40" },
  sunset: { accent: "text-orange-200", soft: "bg-orange-400/15 border-orange-200/30", button: "bg-gradient-to-r from-orange-500 to-pink-600", glow: "from-orange-500/35 via-pink-500/15", line: "border-orange-200/40" },
  monochrome: { accent: "text-white", soft: "bg-white/10 border-white/30", button: "bg-white text-slate-950 hover:bg-slate-200", glow: "from-white/15 via-white/5", line: "border-white/30" },
};

function subtitleParts(value?: string | null) { const text = String(value || "").trim(); const details = text.split(" · ").map((part) => part.trim()).filter(Boolean); return details.length > 1 ? { description: "", details } : { description: text, details: [] as string[] }; }

export default function HeroCarouselV4({ items, layoutStyle = "image_focus", compact = false, autoRotate = true }: { items: HeroItemV4[]; layoutStyle?: HeroLayoutStyle; compact?: boolean; autoRotate?: boolean }) {
  const heroItems = items.length ? items : [{ id: "default", title: "Seattle Desi TV", subtitle: "Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.", image_url: "/hero-sdtv.png", button_text: "Browse Events", button_url: "/events", badge: "Voice of the Desi Community", theme: "fallback", layout_style: "inherit" as const }];
  const [current, setCurrent] = useState(0);
  useEffect(() => { if (current >= heroItems.length) setCurrent(0); }, [current, heroItems.length]);
  useEffect(() => { if (!autoRotate || compact || heroItems.length <= 1) return; const timer = window.setInterval(() => setCurrent((value) => (value + 1) % heroItems.length), 7000); return () => window.clearInterval(timer); }, [autoRotate, compact, heroItems.length]);
  const item = heroItems[current] || heroItems[0];
  const effectiveLayout = item.layout_style && item.layout_style !== "inherit" ? item.layout_style : layoutStyle;
  const image = item.image_url || "/hero-sdtv.png";
  const itemTheme = String(item.theme || "fallback").toLowerCase();
  const theme = themeMap[itemTheme] || themeMap.fallback;
  const isFallback = itemTheme === "fallback";
  const isEvent = String(item.id || "").startsWith("event-");
  const subtitle = subtitleParts(item.subtitle);
  const centered = effectiveLayout === "cinematic" || effectiveLayout === "spotlight";
  const framed = effectiveLayout === "premium";
  const split = effectiveLayout === "split_right" || effectiveLayout === "split_left";
  const posterLeft = effectiveLayout === "split_left";
  const showPoster = framed || split || (effectiveLayout === "classic" && isEvent);
  const minimal = effectiveLayout === "minimal";
  const minHeight = compact ? "min-h-[300px]" : "min-h-[450px] md:min-h-[500px]";
  const titleSize = compact ? "text-2xl sm:text-3xl" : centered ? "text-4xl sm:text-6xl lg:text-7xl" : "text-4xl sm:text-5xl lg:text-6xl";
  const overlay = effectiveLayout === "image_focus" ? "bg-gradient-to-r from-black/80 via-black/38 to-black/10" : centered ? "bg-gradient-to-t from-black/90 via-black/45 to-black/20" : minimal ? "bg-black/45" : "bg-gradient-to-r from-slate-950/95 via-slate-950/72 to-slate-950/25";

  const textBlock = <div className={`${centered ? "mx-auto max-w-4xl text-center" : "max-w-2xl"} ${minimal ? "rounded-2xl bg-black/35 p-5 backdrop-blur-sm" : ""}`}><div className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${theme.accent} ${theme.soft}`}>{item.badge || (isEvent ? "Featured Event" : "Seattle Desi TV")}</div><h1 className={`mt-5 font-black leading-[0.98] tracking-tight ${titleSize}`}>{item.title}</h1>{subtitle.description && <p className={`mt-5 max-w-xl text-base leading-7 text-slate-100 ${compact ? "text-sm" : "md:text-lg"} ${centered ? "mx-auto" : ""}`}>{subtitle.description}</p>}{subtitle.details.length > 0 && <div className={`mt-6 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>{subtitle.details.map((detail) => <span key={detail} className="rounded-xl border border-white/20 bg-black/25 px-4 py-2 text-sm font-bold text-white backdrop-blur">{detail}</span>)}</div>}<div className={`mt-7 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>{item.button_text && item.button_url && <a href={item.button_url} className={`rounded-xl px-6 py-3 font-black text-white shadow-xl transition ${theme.button}`}>{item.button_text}</a>}{!compact && <a href="/events" className="rounded-xl border border-white/35 bg-black/20 px-6 py-3 font-black text-white backdrop-blur">Explore Events</a>}</div></div>;
  const poster = <div className="flex min-h-[220px] items-center justify-center lg:justify-end"><div className={`relative w-full ${compact ? "max-w-[190px]" : "max-w-[350px]"} rounded-[1.65rem] border ${theme.line} bg-white/[0.08] p-3 shadow-2xl backdrop-blur`}><div className="aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-slate-900"><img src={image} alt={item.title} className="h-full w-full object-contain" /></div></div></div>;

  return <section className={`relative overflow-hidden bg-[#020617] text-white ${framed ? "px-3 py-4 sm:px-5 md:px-8 md:py-7" : ""}`}><div className={`absolute inset-0 bg-cover bg-center ${framed ? "opacity-35 blur-[6px] scale-105" : effectiveLayout === "spotlight" ? "opacity-70 scale-105" : "opacity-100"}`} style={{ backgroundImage: `url('${image}')` }} /><div className={`absolute inset-0 ${overlay}`} />{effectiveLayout === "spotlight" && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,.12)_35%,rgba(0,0,0,.75)_100%)]" />}{!isFallback && theme.glow && <div className={`absolute inset-0 bg-gradient-to-r ${theme.glow} to-transparent`} />}<div className={`${framed ? `relative mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border ${theme.line} bg-slate-950/72 shadow-2xl backdrop-blur-xl` : "relative mx-auto max-w-7xl"}`}><div className={`relative grid ${minHeight} items-center gap-7 px-6 py-8 md:px-10 lg:px-14 ${showPoster ? "lg:grid-cols-[1.1fr_0.9fr]" : "grid-cols-1"}`}>{posterLeft && showPoster ? <>{poster}{textBlock}</> : <>{textBlock}{showPoster && poster}</>}</div>{!compact && heroItems.length > 1 && <div className={`${framed ? "relative border-t border-white/10" : "absolute bottom-5 left-1/2 -translate-x-1/2"} flex items-center justify-center gap-2 px-5 py-4`}><button onClick={() => setCurrent((value) => (value - 1 + heroItems.length) % heroItems.length)} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/30">‹</button>{heroItems.map((hero, index) => <button key={hero.id} onClick={() => setCurrent(index)} className={`h-2.5 rounded-full ${index === current ? "w-8 bg-white" : "w-2.5 bg-white/40"}`} />)}<button onClick={() => setCurrent((value) => (value + 1) % heroItems.length)} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/30">›</button></div>}</div></section>;
}
