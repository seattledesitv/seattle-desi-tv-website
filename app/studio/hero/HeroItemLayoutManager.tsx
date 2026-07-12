"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import HeroCarouselV4, { type HeroItemV4, type HeroLayoutStyle } from "../../components/home/HeroCarouselV4";

const supabase = getSupabaseBrowserClient();
const LAYOUTS: { key: HeroLayoutStyle | "inherit"; name: string }[] = [
  { key: "inherit", name: "Use global layout" },
  { key: "image_focus", name: "Image Focus" },
  { key: "classic", name: "Classic" },
  { key: "premium", name: "Premium Framed" },
  { key: "cinematic", name: "Cinematic" },
  { key: "split_right", name: "Split — Poster Right" },
  { key: "split_left", name: "Split — Poster Left" },
  { key: "spotlight", name: "Spotlight" },
  { key: "minimal", name: "Minimal Overlay" },
];

type Row = { source: "banner" | "event" | "festival"; sourceId: string; item: HeroItemV4; savedLayout: HeroLayoutStyle | "inherit" };
function firstImage(row: any) { if (Array.isArray(row?.image_urls) && row.image_urls.length) return row.image_urls[0]; return row?.image || row?.image_url || "/hero-sdtv.png"; }
function formatDate(value?: string | null) { if (!value) return ""; const date = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(); }

export default function HeroItemLayoutManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [globalLayout, setGlobalLayout] = useState<HeroLayoutStyle>("image_focus");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "banner" | "event" | "festival">("all");
  const [savingId, setSavingId] = useState("");

  async function load() {
    const [banners, events, festivals, settings] = await Promise.all([
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,theme,hero_layout,active").order("display_order", { ascending: true }),
      supabase.from("events").select("id,title,date,location,image,image_urls,hero_theme,hero_layout,featured").eq("featured", true).order("featured_order", { ascending: true }),
      supabase.from("festival_hero_assets").select("id,festival_name,title,subtitle,image_url,theme,hero_layout,active").order("start_date", { ascending: true }),
      supabase.from("homepage_hero_settings").select("layout_style").eq("id", "default").maybeSingle(),
    ]);
    const next: Row[] = [
      ...(banners.data || []).map((row: any) => ({ source: "banner" as const, sourceId: row.id, savedLayout: row.hero_layout || "inherit", item: { id: row.id, title: row.title, subtitle: row.subtitle, image_url: row.image_url, button_text: row.button_text, button_url: row.button_url, badge: row.banner_type ? `${String(row.banner_type).toUpperCase()} FEATURE` : "Seattle Desi TV", theme: row.theme || "fallback", layout_style: row.hero_layout || "inherit" } })),
      ...(events.data || []).map((row: any) => ({ source: "event" as const, sourceId: row.id, savedLayout: row.hero_layout || "inherit", item: { id: `event-${row.id}`, title: row.title, subtitle: `${formatDate(row.date)}${row.location ? ` · ${row.location}` : ""}`, image_url: firstImage(row), button_text: "View Event", button_url: `/events/${row.id}`, badge: "Featured Event", theme: row.hero_theme || "fallback", layout_style: row.hero_layout || "inherit" } })),
      ...(festivals.data || []).map((row: any) => ({ source: "festival" as const, sourceId: row.id, savedLayout: row.hero_layout || "inherit", item: { id: `festival-${row.id}`, title: row.title || row.festival_name, subtitle: row.subtitle, image_url: row.image_url, button_text: "Explore Events", button_url: "/events", badge: row.festival_name, theme: row.theme || "festival", layout_style: row.hero_layout || "inherit" } })),
    ];
    setRows(next);
    if (settings.data?.layout_style) setGlobalLayout(settings.data.layout_style as HeroLayoutStyle);
    const error = banners.error || events.error || festivals.error;
    setMessage(error ? error.message : "");
  }

  useEffect(() => { load(); }, []);
  const visible = useMemo(() => filter === "all" ? rows : rows.filter((row) => row.source === filter), [rows, filter]);

  async function save(row: Row, layout: HeroLayoutStyle | "inherit") {
    setSavingId(`${row.source}-${row.sourceId}`);
    const table = row.source === "banner" ? "homepage_hero_banners" : row.source === "event" ? "events" : "festival_hero_assets";
    const { error } = await supabase.from(table).update({ hero_layout: layout }).eq("id", row.sourceId);
    setMessage(error ? error.message : `${row.item.title} layout saved.`);
    if (!error) setRows((current) => current.map((item) => item.source === row.source && item.sourceId === row.sourceId ? { ...item, savedLayout: layout, item: { ...item.item, layout_style: layout } } : item));
    setSavingId("");
  }

  return <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 text-white md:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">Per-item design</p><h2 className="mt-2 text-3xl font-black">Layouts & Live Previews</h2><p className="mt-2 max-w-3xl text-slate-300">Each banner, featured event or festival can inherit the global layout or use its own layout. Preview the exact combination before saving.</p></div><div className="flex flex-wrap gap-2">{(["all", "banner", "event", "festival"] as const).map((key) => <button key={key} onClick={() => setFilter(key)} className={`rounded-xl px-4 py-2 text-sm font-black ${filter === key ? "bg-pink-600" : "bg-white/10"}`}>{key === "all" ? "All" : key === "banner" ? "Banners" : key === "event" ? "Events" : "Festivals"}</button>)}</div></div>
      {message && <div className="mt-5 rounded-xl bg-yellow-100 p-3 font-bold text-yellow-900">{message}</div>}
      <div className="mt-6 space-y-7">{visible.map((row) => <article key={`${row.source}-${row.sourceId}`} className="overflow-hidden rounded-3xl bg-white text-slate-950 shadow-xl"><div className="grid xl:grid-cols-[310px_1fr]"><div className="border-b p-5 xl:border-b-0 xl:border-r"><p className="text-xs font-black uppercase text-pink-600">{row.source}</p><h3 className="mt-1 text-xl font-black">{row.item.title}</h3><label className="mt-5 block"><span className="mb-1 block text-xs font-black uppercase text-slate-500">Layout for this item</span><select value={row.savedLayout} onChange={(event) => save(row, event.target.value as HeroLayoutStyle | "inherit")} disabled={savingId === `${row.source}-${row.sourceId}`} className="w-full rounded-xl border p-3 font-bold">{LAYOUTS.map((layout) => <option key={layout.key} value={layout.key}>{layout.name}</option>)}</select></label><p className="mt-3 text-xs text-slate-500">Global fallback: {LAYOUTS.find((item) => item.key === globalLayout)?.name || globalLayout}</p></div><div className="bg-slate-950 p-3"><div className="overflow-hidden rounded-2xl"><HeroCarouselV4 items={[row.item]} layoutStyle={globalLayout} compact autoRotate={false} /></div></div></div></article>)}{visible.length === 0 && <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-slate-400">No matching hero items.</div>}</div>
    </div>
  </section>;
}
