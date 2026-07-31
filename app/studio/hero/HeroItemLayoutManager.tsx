"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import HeroPreview, { type HeroLayoutStyle } from "./HeroPreview";

const supabase = getSupabaseBrowserClient();
type ItemType = "banner" | "event" | "festival";
type LayoutChoice = "inherit" | HeroLayoutStyle;
const OPTIONS: Array<{ value: LayoutChoice; label: string }> = [
  { value: "inherit", label: "Use global layout" }, { value: "image_focus", label: "Image Focus" }, { value: "classic", label: "Classic" }, { value: "premium", label: "Premium Framed" }, { value: "cinematic", label: "Cinematic" }, { value: "split_right", label: "Split — Poster Right" }, { value: "split_left", label: "Split — Poster Left" }, { value: "spotlight", label: "Spotlight" }, { value: "minimal", label: "Minimal Overlay" },
];
function titleFor(type: ItemType, item: any) { return type === "festival" ? item.festival_name || item.title || "Festival Hero" : item.title || "Untitled Hero"; }
function subtitleFor(type: ItemType, item: any) { return type === "event" ? [item.date, item.location].filter(Boolean).join(" · ") : item.subtitle || ""; }

export default function HeroItemLayoutManager() {
  const [globalLayout, setGlobalLayout] = useState<HeroLayoutStyle>("image_focus");
  const [banners, setBanners] = useState<any[]>([]); const [events, setEvents] = useState<any[]>([]); const [festivals, setFestivals] = useState<any[]>([]);
  const [savingKey, setSavingKey] = useState(""); const [message, setMessage] = useState(""); const [expandedKey, setExpandedKey] = useState("");

  async function load() {
    const [settings, bannerResult, eventResult, festivalResult] = await Promise.all([
      supabase.from("homepage_hero_settings").select("layout_style").eq("id", "default").maybeSingle(),
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,theme,hero_layout,active").order("display_order", { ascending: true }),
      supabase.from("events").select("id,title,date,location,image,image_urls,hero_theme,hero_layout").eq("featured", true).order("featured_order", { ascending: true }),
      supabase.from("festival_hero_assets").select("id,festival_name,title,subtitle,image_url,theme,hero_layout,active").order("start_date", { ascending: true }),
    ]);
    if (settings.data?.layout_style) setGlobalLayout(settings.data.layout_style as HeroLayoutStyle);
    const error = bannerResult.error || eventResult.error || festivalResult.error;
    if (error) { setMessage(error.message.includes("hero_layout") ? "Run supabase/hero-item-layouts.sql, then refresh this page." : error.message); return; }
    setBanners(bannerResult.data || []); setEvents(eventResult.data || []); setFestivals(festivalResult.data || []);
  }
  useEffect(() => { load(); }, []);
  const groups = useMemo(() => [{ type: "banner" as const, label: "Marketing Banners", items: banners }, { type: "event" as const, label: "Featured Events", items: events }, { type: "festival" as const, label: "Festival Heroes", items: festivals }], [banners, events, festivals]);

  async function saveLayout(type: ItemType, item: any, heroLayout: LayoutChoice) {
    const key = `${type}:${item.id}`; setSavingKey(key); setMessage("");
    const table = type === "banner" ? "homepage_hero_banners" : type === "festival" ? "festival_hero_assets" : "events";
    const { error } = await supabase.from(table).update({ hero_layout: heroLayout }).eq("id", item.id);
    if (error) setMessage(error.message.includes("hero_layout") ? "Run supabase/hero-item-layouts.sql, then refresh this page." : `Layout update failed: ${error.message}`);
    else { setMessage(`${titleFor(type, item)} layout updated.`); await load(); }
    setSavingKey("");
  }

  return <section className="mt-8 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl"><div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Per-item Overrides</p><h2 className="mt-2 text-3xl font-black">Layouts & Individual Previews</h2><p className="mt-2 max-w-3xl text-slate-600">Each hero can inherit the global layout or use its own presentation.</p><div className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">Global default: {globalLayout.replaceAll("_", " ")}</div>{message && <p className="mt-4 rounded-xl bg-yellow-100 px-4 py-3 text-sm font-bold text-yellow-900">{message}</p>}</div><div className="space-y-8 p-5 sm:p-7">{groups.map((group) => <div key={group.type}><div className="mb-4 flex items-center justify-between"><h3 className="text-2xl font-black">{group.label}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{group.items.length}</span></div><div className="grid gap-4">{group.items.map((item) => { const key = `${group.type}:${item.id}`; const selected = (item.hero_layout || "inherit") as LayoutChoice; const effective = selected === "inherit" ? globalLayout : selected; const expanded = expandedKey === key; return <article key={key} className="overflow-hidden rounded-2xl border border-slate-200"><div className="grid gap-4 p-4 md:grid-cols-[1fr_280px_auto] md:items-center"><div className="min-w-0"><p className="text-xs font-black uppercase text-pink-600">{group.type}</p><h4 className="truncate text-xl font-black">{titleFor(group.type, item)}</h4><p className="truncate text-sm text-slate-500">{subtitleFor(group.type, item) || "No subtitle"}</p></div><label className="text-sm font-bold">Layout<select value={selected} disabled={savingKey === key} onChange={(e) => saveLayout(group.type, item, e.target.value as LayoutChoice)} className="mt-1 w-full rounded-xl border px-3 py-3"><option value="inherit">Use global layout ({globalLayout.replaceAll("_", " ")})</option>{OPTIONS.filter((o) => o.value !== "inherit").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label><button onClick={() => setExpandedKey(expanded ? "" : key)} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{expanded ? "Hide Preview" : "Preview"}</button></div>{expanded && <div className="border-t bg-slate-50 p-4 sm:p-6"><div className="mb-3 flex justify-between gap-2"><p className="font-black">{effective.replaceAll("_", " ")}{selected === "inherit" ? " · inherited" : " · custom override"}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-black">Theme: {(item.theme || item.hero_theme || "fallback").replaceAll("_", " ")}</span></div><HeroPreview layout={effective} item={item} /></div>}</article>; })}</div></div>)}</div></section>;
}
