import { getSupabaseBrowserClient } from "./supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const SITE_URL = "https://www.seattledesitv.com";
const FALLBACK_IMAGE = `${SITE_URL}/sdtv-logo.png`;

function clean(value: any, fallback = "") { return String(value || fallback).trim(); }
function clip(value: any, max = 180) { const v = clean(value).replace(/\s+/g, " "); return v.length > max ? `${v.slice(0, max).trim()}...` : v; }
function firstArrayValue(value: any) { return Array.isArray(value) ? clean(value.find(Boolean)) : ""; }
function absoluteUrl(value: any) { const url = clean(value); if (!url) return ""; if (/^https?:\/\//i.test(url)) return url; return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`; }
function imageFrom(row: any) {
  return absoluteUrl(
    firstArrayValue(row?.image_urls) ||
    row?.image ||
    row?.image_url ||
    row?.logo_url ||
    row?.logo ||
    row?.thumbnail ||
    row?.thumbnailUrl ||
    row?.mediaUrl ||
    row?.media_url ||
    "",
  );
}
function dateLabel(value: any) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function toNumber(value: any, fallback = 4) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function detailUrl(base: string, row: any) { return row?.id ? `${SITE_URL}${base}/${row.id}` : `${SITE_URL}${base}`; }
function isPremiumActive(row: any) {
  if (!row?.is_premium) return false;
  const now = Date.now();
  const starts = row.premium_starts_at ? new Date(row.premium_starts_at).getTime() : 0;
  const ends = row.premium_ends_at ? new Date(row.premium_ends_at).getTime() : Number.POSITIVE_INFINITY;
  return starts <= now && now <= ends;
}

function itemFrom(row: any, fallbackUrl = "", options: any = {}) {
  const image = imageFrom(row);
  return {
    title: clean(row.title || row.name, "SDTV Update"),
    text: clip(row.description || row.caption || row.subtitle || row.offer || row.discount || row.category || ""),
    image: image || (options.useFallbackImage ? FALLBACK_IMAGE : ""),
    url: absoluteUrl(row.url || row.website || row.permalink || row.content_url || fallbackUrl),
    meta: clean(row.meta || row.date || row.location || row.category || row.platform || ""),
    badge: clean(options.badge || (isPremiumActive(row) ? row.premium_label || "Featured" : "")),
    cta: clean(options.cta || "View more"),
    imageFit: clean(row.image_display_mode) === "contain" ? "contain" : "cover",
  };
}

async function latestInstagram(limit: number) {
  try {
    const response = await fetch(`/api/instagram/latest?limit=${limit}`, { cache: "no-store" });
    const result = await response.json();
    return result?.ok && Array.isArray(result.posts) ? result.posts.map((p: any) => itemFrom(p, "", { cta: "View on Instagram", useFallbackImage: true })) : [];
  } catch { return []; }
}

async function latestYoutube(limit: number) {
  try {
    const response = await fetch("/api/youtube/latest", { cache: "no-store" });
    const result = await response.json();
    return result?.ok && Array.isArray(result.videos) ? result.videos.slice(0, limit).map((v: any) => itemFrom(v, "", { cta: "Watch now", useFallbackImage: true })) : [];
  } catch { return []; }
}

async function tableItems(sectionKey: string, limit: number) {
  const map: Record<string, any> = {
    events: { table: "events", select: "id,title,date,location,image,image_urls,status,created_at", base: "/events", order: "date", ascending: true, cta: "View event" },
    businesses: { table: "local_businesses", select: "id,name,description,category,discount,offer,website,image,image_urls,image_display_mode,created_at,status,is_premium,premium_rank,premium_starts_at,premium_ends_at", base: "/businesses", order: "created_at", ascending: false, cta: "Explore business" },
    groups: { table: "community_groups", select: "id,name,description,platform,url,status,created_at", base: "/community-groups", order: "created_at", ascending: false, cta: "Join or learn more" },
    organizations: { table: "community_organizations", select: "id,name,description,website,image,image_urls,image_display_mode,status,created_at,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label", base: "/community-organizations", order: "created_at", ascending: false, cta: "Explore organization" },
  };
  const config = map[sectionKey];
  if (!config) return [];

  let query = supabase.from(config.table).select(config.select).limit(Math.max(limit * 3, limit)).order(config.order, { ascending: config.ascending });
  if (["events", "groups", "organizations"].includes(sectionKey)) query = query.eq("status", "approved");
  const { data, error } = await query;
  if (error || !Array.isArray(data)) return [];

  const rows = [...data];
  if (["businesses", "organizations"].includes(sectionKey)) {
    rows.sort((a: any, b: any) => {
      const premiumDifference = Number(isPremiumActive(b)) - Number(isPremiumActive(a));
      if (premiumDifference) return premiumDifference;
      const rankDifference = toNumber(a.premium_rank, 999999) - toNumber(b.premium_rank, 999999);
      if (rankDifference) return rankDifference;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }

  return rows.slice(0, limit).map((row: any) => {
    const meta = row.date
      ? `${dateLabel(row.date)}${row.location ? ` · ${row.location}` : ""}`
      : [row.category, row.platform].filter(Boolean).join(" · ");
    const fallback = sectionKey === "groups" && row.url ? row.url : detailUrl(config.base, row);
    return itemFrom({ ...row, meta }, fallback, { cta: config.cta, useFallbackImage: ["businesses", "organizations", "events"].includes(sectionKey) });
  });
}

export async function generateNewsletterDraft(settings: any[]) {
  const enabled = settings.filter((s) => s.enabled !== false).sort((a, b) => toNumber(a.display_order, 999) - toNumber(b.display_order, 999));
  const draftSections = [];
  for (const section of enabled) {
    const limit = Math.max(1, toNumber(section.max_items, 4));
    let items: any[] = [];
    let body = "";
    if (section.section_key === "intro") body = "Discover what is happening across Seattle's South Asian community—from upcoming events and new videos to local businesses, organizations, and community groups worth knowing.";
    else if (section.section_key === "closing") body = "Thank you for supporting Seattle Desi TV. Together, we are building a stronger platform for community stories, local businesses, organizations, events, culture, and connection across the Pacific Northwest.";
    else if (section.section_key === "instagram") items = await latestInstagram(limit);
    else if (section.section_key === "tv") items = await latestYoutube(limit);
    else items = await tableItems(section.section_key, limit);
    if (body || items.length) draftSections.push({ id: `${section.section_key}-${Date.now()}-${Math.random()}`, key: section.section_key, title: section.title || section.section_key, body, items });
  }
  return {
    subject: `Seattle Desi TV Community Update - ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    preheader: "Upcoming events, inspiring stories, videos, local businesses, organizations, and community highlights from Seattle Desi TV.",
    sections: draftSections,
  };
}
