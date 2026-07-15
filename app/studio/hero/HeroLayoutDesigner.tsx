"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export type HeroLayoutStyle =
  | "image_focus"
  | "classic"
  | "premium"
  | "cinematic"
  | "split_right"
  | "split_left"
  | "spotlight"
  | "minimal";

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

function getImage(item: any) {
  if (item?.image_url) return item.image_url;
  if (Array.isArray(item?.image_urls) && item.image_urls.length) return item.image_urls[0];
  return item?.image || "/hero-sdtv.png";
}

function HeroPreview({ layout, item }: { layout: HeroLayoutStyle; item: any }) {
  const image = getImage(item);
  const title = item?.title || item?.festival_name || "Seattle Desi TV";
  const subtitle = item?.subtitle || [item?.date, item?.location].filter(Boolean).join(" · ") || "Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.";
  const reverse = layout === "split_left";
  const split = layout === "split_left" || layout === "split_right" || layout === "classic" || layout === "premium";

  if (layout === "cinematic" || layout === "spotlight" || layout === "minimal" || layout === "image_focus") {
    return <div className={`relative min-h-[360px] overflow-hidden rounded-3xl bg-slate-950 text-white ${layout === "premium" ? "p-4" : ""}`}>
      <img src={image} alt="Hero preview" className={`absolute inset-0 h-full w-full ${layout === "image_focus" ? "object-contain bg-black" : "object-cover"}`} />
      <div className={`absolute inset-0 ${layout === "image_focus" ? "bg-gradient-to-r from-black/80 via-black/35 to-black/15" : layout === "spotlight" ? "bg-[radial-gradient(circle_at_center,transparent_5%,rgba(2,6,23,.88)_78%)]" : "bg-gradient-to-t from-black/90 via-black/30 to-black/10"}`} />
      <div className={`relative z-10 flex min-h-[360px] p-7 sm:p-10 ${layout === "cinematic" || layout === "spotlight" ? "items-center justify-center text-center" : layout === "minimal" ? "items-end" : "items-center"}`}>
        <div className={`${layout === "minimal" ? "max-w-xl rounded-2xl border border-white/20 bg-black/55 p-5 backdrop-blur" : "max-w-2xl"}`}>
          <span className="inline-flex rounded-full bg-pink-600 px-3 py-1 text-xs font-black uppercase tracking-wide">Live Preview</span>
          <h3 className="mt-4 text-3xl font-black sm:text-5xl">{title}</h3>
          <p className="mt-3 text-sm text-slate-200 sm:text-lg">{subtitle}</p>
          <button className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-slate-950">Learn More</button>
        </div>
      </div>
    </div>;
  }

  if (split) {
    return <div className={`grid min-h-[360px] overflow-hidden rounded-3xl bg-slate-950 text-white lg:grid-cols-2 ${reverse ? "direction-rtl" : ""}`}>
      <div className={`flex items-center p-7 sm:p-10 ${reverse ? "lg:order-2" : ""}`}>
        <div>
          <span className="inline-flex rounded-full bg-pink-600 px-3 py-1 text-xs font-black uppercase tracking-wide">Live Preview</span>
          <h3 className="mt-4 text-3xl font-black sm:text-5xl">{title}</h3>
          <p className="mt-3 text-slate-300">{subtitle}</p>
          <button className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Learn More</button>
        </div>
      </div>
      <div className={`relative min-h-[300px] bg-black ${reverse ? "lg:order-1" : ""} ${layout === "premium" ? "m-5 overflow-hidden rounded-2xl border border-white/20 shadow-2xl" : ""}`}>
        <img src={image} alt="Hero preview" className="absolute inset-0 h-full w-full object-contain" />
      </div>
    </div>;
  }

  return null;
}

export default function HeroLayoutDesigner({ banners, featuredEvents, festivals }: { banners: any[]; featuredEvents: any[]; festivals: any[] }) {
  const [layout, setLayout] = useState<HeroLayoutStyle>("image_focus");
  const [savedLayout, setSavedLayout] = useState<HeroLayoutStyle>("image_focus");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewSource, setPreviewSource] = useState("auto");

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
    async function load() {
      const { data, error } = await supabase.from("homepage_hero_settings").select("layout_style").eq("id", "default").maybeSingle();
      if (!error && data?.layout_style) {
        setLayout(data.layout_style as HeroLayoutStyle);
        setSavedLayout(data.layout_style as HeroLayoutStyle);
      }
      if (error) setMessage("Run supabase/homepage-hero-settings.sql to enable saving the global layout.");
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("homepage_hero_settings").upsert({ id: "default", layout_style: layout, updated_at: new Date().toISOString() });
    if (error) setMessage(`Layout save failed: ${error.message}`);
    else { setSavedLayout(layout); setMessage("Global hero layout saved."); }
    setSaving(false);
  }

  return <section className="mt-8 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl">
    <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-7">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Whole Hero Section</p>
      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="text-3xl font-black">Global Layout & Live Preview</h2><p className="mt-2 max-w-3xl text-slate-600">Choose the default structure for the homepage hero. Item-specific layouts will be added in the next step.</p></div>
        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">Saved: {savedLayout.replaceAll("_", " ")}</div>
      </div>
    </div>
    <div className="grid gap-7 p-5 sm:p-7 xl:grid-cols-[420px_1fr]">
      <div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{LAYOUTS.map((option) => <button key={option.key} onClick={() => setLayout(option.key)} className={`rounded-2xl border-2 p-4 text-left transition ${layout === option.key ? "border-pink-500 bg-pink-50" : "border-slate-200 hover:border-slate-400"}`}><div className="flex items-center justify-between gap-3"><h3 className="font-black">{option.name}</h3><span className={`h-4 w-4 rounded-full border-4 ${layout === option.key ? "border-pink-600 bg-pink-600" : "border-slate-300"}`} /></div><p className="mt-1 text-sm text-slate-600">{option.note}</p></button>)}</div>
        <button onClick={save} disabled={saving || layout === savedLayout} className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving..." : layout === savedLayout ? "Layout Saved" : "Save Global Layout"}</button>
        {message && <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>}
      </div>
      <div className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Instant Preview</p><h3 className="text-2xl font-black">How this layout will look</h3></div>{previewItems.length > 0 && <select value={previewSource} onChange={(e) => setPreviewSource(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold"><option value="auto">Use first active item</option>{previewItems.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select>}</div>
        <HeroPreview layout={layout} item={previewItem} />
        <p className="mt-3 text-sm text-slate-500">The preview changes immediately. Saving only stores the global default; it does not yet change the production homepage in this step.</p>
      </div>
    </div>
  </section>;
}
