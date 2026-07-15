"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { HeroPreview, type HeroLayoutStyle } from "./HeroLayoutDesigner";

const supabase = getSupabaseBrowserClient();

type ItemType = "banner" | "event" | "festival";
type LayoutChoice = "inherit" | HeroLayoutStyle;

const LAYOUT_OPTIONS: Array<{ value: LayoutChoice; label: string }> = [
  { value: "inherit", label: "Use global layout" },
  { value: "image_focus", label: "Image Focus" },
  { value: "classic", label: "Classic" },
  { value: "premium", label: "Premium Framed" },
  { value: "cinematic", label: "Cinematic" },
  { value: "split_right", label: "Split — Poster Right" },
  { value: "split_left", label: "Split — Poster Left" },
  { value: "spotlight", label: "Spotlight" },
  { value: "minimal", label: "Minimal Overlay" },
];

function titleFor(type: ItemType, item: any) {
  if (type === "festival") return item.festival_name || item.title || "Festival Hero";
  return item.title || "Untitled Hero";
}

function subtitleFor(type: ItemType, item: any) {
  if (type === "event") return [item.date, item.location].filter(Boolean).join(" · ");
  return item.subtitle || "";
}

export default function HeroItemLayoutManager({ banners, featuredEvents, festivals, onUpdated }: { banners: any[]; featuredEvents: any[]; festivals: any[]; onUpdated: () => Promise<void> | void }) {
  const [globalLayout, setGlobalLayout] = useState<HeroLayoutStyle>("image_focus");
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState("");
  const [expandedKey, setExpandedKey] = useState("");

  useEffect(() => {
    async function loadGlobal() {
      const { data } = await supabase.from("homepage_hero_settings").select("layout_style").eq("id", "default").maybeSingle();
      if (data?.layout_style) setGlobalLayout(data.layout_style as HeroLayoutStyle);
    }
    loadGlobal();
  }, []);

  const groups = useMemo(() => [
    { type: "banner" as const, label: "Marketing Banners", items: banners },
    { type: "event" as const, label: "Featured Events", items: featuredEvents },
    { type: "festival" as const, label: "Festival Heroes", items: festivals },
  ], [banners, featuredEvents, festivals]);

  async function saveLayout(type: ItemType, item: any, heroLayout: LayoutChoice) {
    const key = `${type}:${item.id}`;
    setSavingKey(key);
    setMessage("");
    const table = type === "banner" ? "homepage_hero_banners" : type === "festival" ? "festival_hero_assets" : "events";
    const { error } = await supabase.from(table).update({ hero_layout: heroLayout }).eq("id", item.id);
    if (error) setMessage(error.message.includes("hero_layout") ? "Run supabase/hero-item-layouts.sql, then refresh this page." : `Layout update failed: ${error.message}`);
    else {
      setMessage(`${titleFor(type, item)} now uses ${heroLayout === "inherit" ? "the global layout" : LAYOUT_OPTIONS.find((option) => option.value === heroLayout)?.label}.`);
      await onUpdated();
    }
    setSavingKey("");
  }

  return <section className="mt-8 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl">
    <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-7">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Per-item Overrides</p>
      <h2 className="mt-2 text-3xl font-black">Layouts & Individual Previews</h2>
      <p className="mt-2 max-w-3xl text-slate-600">Each hero can inherit the global layout or use its own presentation. Expand any item to preview the exact result before or after changing it.</p>
      <div className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">Global default: {globalLayout.replaceAll("_", " ")}</div>
      {message && <p className="mt-4 rounded-xl bg-yellow-100 px-4 py-3 text-sm font-bold text-yellow-900">{message}</p>}
    </div>

    <div className="space-y-8 p-5 sm:p-7">
      {groups.map((group) => <div key={group.type}>
        <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-2xl font-black">{group.label}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{group.items.length}</span></div>
        {group.items.length === 0 ? <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-500">No items in this section.</div> : <div className="grid gap-4">
          {group.items.map((item) => {
            const key = `${group.type}:${item.id}`;
            const selected = (item.hero_layout || "inherit") as LayoutChoice;
            const effective = selected === "inherit" ? globalLayout : selected;
            const expanded = expandedKey === key;
            return <article key={key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-4 p-4 md:grid-cols-[1fr_280px_auto] md:items-center">
                <div className="min-w-0"><p className="text-xs font-black uppercase text-pink-600">{group.type}</p><h4 className="truncate text-xl font-black">{titleFor(group.type, item)}</h4><p className="mt-1 truncate text-sm text-slate-500">{subtitleFor(group.type, item) || "No subtitle"}</p></div>
                <label className="text-sm font-bold">Layout<select value={selected} disabled={savingKey === key} onChange={(event) => saveLayout(group.type, item, event.target.value as LayoutChoice)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold"><option value="inherit">Use global layout ({globalLayout.replaceAll("_", " ")})</option>{LAYOUT_OPTIONS.filter((option) => option.value !== "inherit").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <button onClick={() => setExpandedKey(expanded ? "" : key)} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{expanded ? "Hide Preview" : "Preview"}</button>
              </div>
              {expanded && <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-6"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase text-pink-600">Effective layout</p><p className="font-black">{effective.replaceAll("_", " ")}{selected === "inherit" ? " · inherited" : " · custom override"}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">Theme: {(item.theme || item.hero_theme || "fallback").replaceAll("_", " ")}</span></div><HeroPreview layout={effective} item={item} /></div>}
            </article>;
          })}
        </div>}
      </div>)}
    </div>
  </section>;
}
