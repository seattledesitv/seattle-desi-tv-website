"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import HomepageHeroV2, { type HomepageHeroItem, type HeroLayoutStyle } from "./HomepageHeroV2";

const supabase = getSupabaseBrowserClient();

function dateText(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function firstImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length) return row.image_urls[0];
  return row?.image_url || row?.image || "/hero-sdtv.png";
}

function withinWindow(row: any, today: string) {
  return (!row.start_date || String(row.start_date).split("T")[0] <= today) && (!row.end_date || String(row.end_date).split("T")[0] >= today);
}

export default function HomepageHeroBridgeV2() {
  const pathname = usePathname();
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<HomepageHeroItem[]>([]);
  const [globalLayout, setGlobalLayout] = useState<HeroLayoutStyle>("image_focus");

  useEffect(() => {
    if (pathname !== "/") { setMount(null); return; }

    function locate() {
      const main = document.querySelector("main");
      if (!main) return;
      const oldHero = main.querySelector(":scope > section");
      if (!oldHero) return;
      let target = main.querySelector<HTMLElement>(":scope > [data-homepage-hero-v2]");
      if (!target) {
        target = document.createElement("div");
        target.setAttribute("data-homepage-hero-v2", "true");
        main.insertBefore(target, oldHero);
      }
      (oldHero as HTMLElement).style.display = "none";
      setMount(target);
    }

    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") return;
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [settingsResult, bannersResult, eventsResult, festivalsResult] = await Promise.all([
        supabase.from("homepage_hero_settings").select("layout_style").eq("id", "default").maybeSingle(),
        supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,theme,hero_layout,start_date,end_date,display_order,active").eq("active", true).order("display_order", { ascending: true }),
        supabase.from("events").select("id,title,date,location,image,image_urls,featured,featured_order,hero_theme,hero_layout,status").eq("status", "approved").eq("featured", true).order("featured_order", { ascending: true }).order("date", { ascending: true }).limit(8),
        supabase.from("festival_hero_assets").select("id,festival_name,festival_key,title,subtitle,image_url,theme,hero_layout,start_date,end_date,active").eq("active", true).order("start_date", { ascending: true }),
      ]);

      if (settingsResult.data?.layout_style) setGlobalLayout(settingsResult.data.layout_style as HeroLayoutStyle);

      const banners: HomepageHeroItem[] = (bannersResult.data || []).filter((row: any) => withinWindow(row, today)).map((row: any) => ({
        id: `banner-${row.id}`,
        title: row.title,
        subtitle: row.subtitle,
        image_url: row.image_url,
        button_text: row.button_text,
        button_url: row.button_url,
        badge: row.banner_type ? `${String(row.banner_type).toUpperCase()} FEATURE` : "Seattle Desi TV",
        display_order: Number(row.display_order || 0),
        theme: row.theme || "fallback",
        hero_layout: row.hero_layout || "inherit",
      }));

      const events: HomepageHeroItem[] = (eventsResult.data || []).map((row: any) => ({
        id: `event-${row.id}`,
        title: row.title,
        subtitle: `${dateText(row.date)}${row.location ? ` · ${row.location}` : ""}`,
        image_url: firstImage(row),
        button_text: "View Event",
        button_url: `/events/${row.id}`,
        badge: "Featured Event",
        display_order: Number(row.featured_order || 0),
        theme: row.hero_theme || "fallback",
        hero_layout: row.hero_layout || "inherit",
      }));

      const festivals: HomepageHeroItem[] = (festivalsResult.data || []).filter((row: any) => withinWindow(row, today)).map((row: any) => ({
        id: `festival-${row.id}`,
        title: row.title || row.festival_name,
        subtitle: row.subtitle || `Celebrating ${row.festival_name} with the Seattle Desi community.`,
        image_url: row.image_url,
        button_text: "Explore Events",
        button_url: "/events",
        badge: row.festival_name,
        display_order: -1,
        theme: row.theme || "festival",
        hero_layout: row.hero_layout || "inherit",
      }));

      const merged = [...festivals, ...events, ...banners].filter((item) => item.title).sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
      setItems(merged);
    }
    load();
  }, [pathname]);

  if (pathname !== "/" || !mount) return null;
  return createPortal(<HomepageHeroV2 items={items} globalLayout={globalLayout} />, mount);
}
