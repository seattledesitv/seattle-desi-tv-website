"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import HeroCarouselV3, { type HeroItemV3 } from "./HeroCarouselV3";

const supabase = getSupabaseBrowserClient();

function firstImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || row?.image_url || "/hero-sdtv.png";
}
function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}
function activeToday(row: any, today: string) {
  return (!row.start_date || row.start_date <= today) && (!row.end_date || row.end_date >= today);
}

export default function HomepageHeroLoader() {
  const [items, setItems] = useState<HeroItemV3[]>([]);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [eventsResult, bannersResult, festivalsResult] = await Promise.all([
        supabase.from("events").select("id,title,date,location,image,image_urls,featured_order,hero_theme").eq("status", "approved").eq("featured", true).order("featured_order", { ascending: true }).limit(8),
        supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,theme,start_date,end_date,display_order,active").eq("active", true).order("display_order", { ascending: true }),
        supabase.from("festival_hero_assets").select("id,festival_name,title,subtitle,image_url,theme,start_date,end_date,active").eq("active", true).order("start_date", { ascending: true }),
      ]);

      const eventItems: HeroItemV3[] = (eventsResult.data || []).map((row: any) => ({
        id: `event-${row.id}`,
        title: row.title,
        subtitle: `${formatDate(row.date)}${row.location ? ` · ${row.location}` : ""}`,
        image_url: firstImage(row),
        button_text: "View Event",
        button_url: `/events/${row.id}`,
        badge: "Featured Event",
        display_order: Number(row.featured_order || 0),
        theme: row.hero_theme || "fallback",
      }));
      const bannerItems: HeroItemV3[] = (bannersResult.data || []).filter((row: any) => activeToday(row, today)).map((row: any) => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        image_url: row.image_url,
        button_text: row.button_text,
        button_url: row.button_url,
        badge: row.banner_type ? `${String(row.banner_type).toUpperCase()} FEATURE` : "Seattle Desi TV",
        display_order: Number(row.display_order || 0),
        theme: row.theme || "fallback",
      }));
      const festivalItems: HeroItemV3[] = (festivalsResult.data || []).filter((row: any) => activeToday(row, today)).map((row: any) => ({
        id: `festival-${row.id}`,
        title: row.title || row.festival_name,
        subtitle: row.subtitle || `Celebrating ${row.festival_name} with the Seattle Desi community.`,
        image_url: row.image_url,
        button_text: "Explore Events",
        button_url: "/events",
        badge: row.festival_name,
        display_order: -1,
        theme: row.theme || "festival",
      }));

      setItems([...festivalItems, ...eventItems, ...bannerItems].filter((item) => item.title).sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0)));
    }
    load();
  }, []);

  return <HeroCarouselV3 items={items} />;
}
