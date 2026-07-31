"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import HeroPreview, { type HeroLayoutStyle } from "./HeroPreview";
import HeroItemLayoutManager from "./HeroItemLayoutManager";

const supabase = getSupabaseBrowserClient();
const LAYOUTS: Array<{ key: HeroLayoutStyle; name: string; note: string }> = [
  { key: "image_focus", name: "Image Focus", note: "Keeps the uploaded image dominant with a neutral readability overlay." },
  { key: "classic", name: "Classic", note: "Text-led layout with a balanced poster treatment." },
  { key: "premium", name: "Premium Framed", note: "Adds a polished glass frame and stronger visual depth." },
  { key: "cinematic", name: "Cinematic", note: "Full-width background with a bold centered presentation." },
  { key: "split_right", name: "Split — Poster Right", note: "Content on the left with the complete poster on the right." },
  { key: "split_left", name: "Split — Poster Left", note: "Poster first with the title and action panel on the right." },
  { key: "spotlight", name: "Spotlight", note: "Centered theatrical treatment with focused image lighting." },
  { key: "minimal", name: "Minimal Overlay", note: "Image-led layout with a compact translucent information panel." },
];

export default function HeroLayoutDesigner({ banners, featuredEvents, festivals }: { banners: any[]; featuredEvents: any[]; festivals: any[] }) {
  const [layout, setLayout] = useState<HeroLayoutStyle>("image_focus");
  const [savedLayout, setSavedLayout] = useState<HeroLayoutStyle>("image_focus");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewSource, setPreviewSource] = useState("auto");
  const isDirty = layout !== savedLayout;

  const previewItems = useMemo(() => {
    const activeBanner = banners.find((row) => row.active) || banners[0];
    const activeFestival = festivals.find((row) => row.active) || festivals[0];
    return [
      ...(activeBanner ? [{ key: `banner:${activeBanner.id}`, label: `Banner — ${activeBanner.title}`, item: activeBanner }] : []),
      ...(featuredEvents[0] ? [{ key: `event:${featuredEvents[0].id}`, label: `Event — ${featuredEvents[0].title}`, item: featuredEvents[0] }] : []),
      ...(activeFestival ? [{ key: `festival:${activeFestival.id}`, label: `Festival — ${activeFestival.festival_name}`, item: activeFestival }] : []),
    ];
  }, [banners, featuredEvents, festivals]);
  const previewItem = previewSource === "auto" ? previewItems[0]?.item : previewItems.find((entry) => entry.key === previewSource)?.item;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("homepage_hero_settings").select("layout_style").eq("id", "default").maybeSingle();
      if (!error && data?.layout_style) {
        setLayout(data.layout_style as HeroLayoutStyle);
        setSavedLayout(data.layout_style as HeroLayoutStyle);
      }
      if (error) setMessage("Run supabase/homepage-hero-settings.sql to enable saving the global layout.");
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("homepage_hero_settings").upsert({ id: "default", layout_style: layout, updated_at: new Date().toISOString() });
    if (error) setMessage(`Layout save failed: ${error.message}`);
    else {
      setSavedLayout(layout);
      setMessage("Global hero layout saved. Open the homepage preview to verify the live carousel.");
    }
    setSaving(false);
  }

  return <>
    <section className="mt-8 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl">
      <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Whole Hero Section</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-black">Global Layout & Live Preview</h2>
            <p className="mt-2 max-w-3xl text-slate-600">Choose the default structure for the homepage hero. Individual items can override it below.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDirty && <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase text-amber-800">Unsaved global layout</span>}
            <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">Saved: {savedLayout.replaceAll("_", " ")}</span>
            <a href="/" target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase text-slate-800 hover:border-pink-400 hover:text-pink-600">Open Homepage Preview ↗</a>
          </div>
        </div>
      </div>
      <div className="grid gap-7 p-5 sm:p-7 xl:grid-cols-[420px_1fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{LAYOUTS.map((option) => <button key={option.key} onClick={() => setLayout(option.key)} className={`rounded-2xl border-2 p-4 text-left transition ${layout === option.key ? "border-pink-500 bg-pink-50" : "border-slate-200 hover:border-slate-400"}`}><div className="flex items-center justify-between gap-3"><h3 className="font-black">{option.name}</h3><span className={`h-4 w-4 rounded-full border-4 ${layout === option.key ? "border-pink-600 bg-pink-600" : "border-slate-300"}`} /></div><p className="mt-1 text-sm text-slate-600">{option.note}</p></button>)}</div>
          <button onClick={save} disabled={saving || !isDirty} className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving..." : isDirty ? "Save Global Layout" : "Layout Saved"}</button>
          {message && <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>}
        </div>
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Instant Preview</p><h3 className="text-2xl font-black">Desktop and mobile-safe preview</h3></div>
            {previewItems.length > 0 && <select value={previewSource} onChange={(e) => setPreviewSource(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold"><option value="auto">Use first active item</option>{previewItems.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select>}
          </div>
          <HeroPreview layout={layout} item={previewItem} />
          <p className="mt-3 text-sm text-slate-500">Long titles are clamped, missing images use the SDTV fallback, and split layouts stack vertically on smaller screens.</p>
        </div>
      </div>
    </section>
    <HeroItemLayoutManager />
  </>;
}
