"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import HeroCarouselV4, { type HeroItemV4, type HeroLayoutStyle } from "../../components/home/HeroCarouselV4";

const supabase = getSupabaseBrowserClient();
const layoutByName: Record<string, HeroLayoutStyle> = {
  "Image Focus": "image_focus",
  Classic: "classic",
  "Premium Framed": "premium",
  Cinematic: "cinematic",
  "Split — Poster Right": "split_right",
  "Split — Poster Left": "split_left",
  Spotlight: "spotlight",
  "Minimal Overlay": "minimal",
};
const extraLayouts = [
  { key: "split_right" as const, name: "Split — Poster Right", note: "Text on the left with the full poster on the right." },
  { key: "split_left" as const, name: "Split — Poster Left", note: "Poster first, with the event information on the right." },
  { key: "spotlight" as const, name: "Spotlight", note: "Centered content with a theatrical vignette." },
  { key: "minimal" as const, name: "Minimal Overlay", note: "Image-led design with a compact translucent text panel." },
];
const fallbackPreview: HeroItemV4 = {
  id: "preview",
  title: "Seattle Desi TV",
  subtitle: "Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.",
  image_url: "/hero-sdtv.png",
  button_text: "Explore Events",
  button_url: "/events",
  badge: "Live Layout Preview",
  theme: "fallback",
  layout_style: "inherit",
};

export default function HeroLayoutPreviewBridge() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<HeroLayoutStyle>("image_focus");
  const [item, setItem] = useState<HeroItemV4>(fallbackPreview);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPreviewData() {
      const [settingsResult, bannerResult, eventResult] = await Promise.all([
        supabase.from("homepage_hero_settings").select("layout_style").eq("id", "default").maybeSingle(),
        supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,theme").eq("active", true).order("display_order", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("events").select("id,title,date,location,image,image_urls,hero_theme").eq("status", "approved").eq("featured", true).order("featured_order", { ascending: true }).limit(1).maybeSingle(),
      ]);
      if (settingsResult.data?.layout_style) setLayout(settingsResult.data.layout_style as HeroLayoutStyle);
      const banner = bannerResult.data;
      if (banner?.title) {
        setItem({ id: banner.id, title: banner.title, subtitle: banner.subtitle, image_url: banner.image_url, button_text: banner.button_text || "Learn More", button_url: banner.button_url || "/events", badge: "Marketing Feature", theme: banner.theme || "fallback", layout_style: "inherit" });
        return;
      }
      const event = eventResult.data;
      if (event?.title) {
        const image = Array.isArray(event.image_urls) && event.image_urls.length ? event.image_urls[0] : event.image;
        setItem({ id: `event-${event.id}`, title: event.title, subtitle: `${event.date || ""}${event.location ? ` · ${event.location}` : ""}`, image_url: image || "/hero-sdtv.png", button_text: "View Event", button_url: `/events/${event.id}`, badge: "Featured Event", theme: event.hero_theme || "fallback", layout_style: "inherit" });
      }
    }
    loadPreviewData();
  }, []);

  useEffect(() => {
    function locateTarget() {
      const heading = Array.from(document.querySelectorAll("h2")).find((node) => node.textContent?.trim() === "Choose a global layout");
      const section = heading?.closest("section");
      if (!section) { setTarget(null); return; }
      let mount = section.querySelector<HTMLElement>("[data-hero-layout-preview]");
      if (!mount) {
        mount = document.createElement("div");
        mount.setAttribute("data-hero-layout-preview", "true");
        section.appendChild(mount);
      }
      setTarget(mount);
    }
    locateTarget();
    const observer = new MutationObserver(locateTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    function handleClick(event: MouseEvent) {
      const button = (event.target as HTMLElement).closest("button");
      const name = button?.querySelector("h3")?.textContent?.trim();
      if (name && layoutByName[name]) setLayout(layoutByName[name]);
    }
    document.addEventListener("click", handleClick);
    return () => { observer.disconnect(); document.removeEventListener("click", handleClick); };
  }, []);

  async function saveExtraLayout() {
    setSaving(true);
    const { error } = await supabase.from("homepage_hero_settings").upsert({ id: "default", layout_style: layout, updated_at: new Date().toISOString() });
    setMessage(error ? error.message : "Global hero layout saved.");
    setSaving(false);
  }

  if (!target) return null;
  return createPortal(
    <div className="mt-8 border-t border-slate-200 pt-7">
      <p className="text-xs font-black uppercase tracking-wide text-pink-600">Additional layouts</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {extraLayouts.map((option) => <button key={option.key} onClick={() => setLayout(option.key)} className={`rounded-2xl border-2 p-4 text-left ${layout === option.key ? "border-pink-500 bg-pink-50" : "border-slate-200"}`}><h3 className="font-black">{option.name}</h3><p className="mt-1 text-sm text-slate-600">{option.note}</p></button>)}
      </div>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Live Preview</p><h3 className="text-2xl font-black text-slate-950">How the homepage hero will look</h3></div><span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">{layout.replaceAll("_", " ")}</span></div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl"><HeroCarouselV4 items={[item]} layoutStyle={layout} compact autoRotate={false} /></div>
      <button onClick={saveExtraLayout} disabled={saving} className="mt-5 rounded-xl bg-pink-600 px-6 py-3 font-black text-white disabled:opacity-50">{saving ? "Saving..." : "Save Selected Global Layout"}</button>
      {message && <p className="mt-3 font-bold text-emerald-700">{message}</p>}
    </div>,
    target,
  );
}
