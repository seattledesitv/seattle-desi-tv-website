import { getSupabaseBrowserClient } from "./supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function clean(value: any, fallback = "") { return String(value || fallback).trim(); }
function clip(value: any, max = 180) { const v = clean(value).replace(/\s+/g, " "); return v.length > max ? `${v.slice(0, max)}...` : v; }
function imageFrom(row: any) { return Array.isArray(row?.image_urls) ? row.image_urls[0] || "" : row?.image_url || row?.thumbnail || row?.thumbnailUrl || row?.mediaUrl || row?.image || ""; }
function dateLabel(value: any) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(); }
function toNumber(value: any, fallback = 4) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

function itemFrom(row: any, fallbackUrl = "") {
  return {
    title: clean(row.title || row.name, "SDTV Update"),
    text: clip(row.description || row.caption || row.subtitle || row.offer || row.discount || row.category || ""),
    image: imageFrom(row),
    url: clean(row.url || row.website || row.permalink || row.content_url || fallbackUrl),
    meta: clean(row.meta || row.date || row.location || row.category || row.platform || ""),
  };
}

async function latestInstagram(limit: number) {
  try {
    const response = await fetch(`/api/instagram/latest?limit=${limit}`, { cache: "no-store" });
    const result = await response.json();
    return result?.ok && Array.isArray(result.posts) ? result.posts.map((p: any) => itemFrom(p)) : [];
  } catch { return []; }
}

async function latestYoutube(limit: number) {
  try {
    const response = await fetch("/api/youtube/latest", { cache: "no-store" });
    const result = await response.json();
    return result?.ok && Array.isArray(result.videos) ? result.videos.slice(0, limit).map((v: any) => itemFrom(v)) : [];
  } catch { return []; }
}

async function tableItems(sectionKey: string, limit: number) {
  const map: Record<string, any> = {
    events: ["events", "id,title,date,location,image_urls,status,created_at", "/events", "date"],
    businesses: ["local_businesses", "id,name,category,discount,offer,website,image_urls,created_at,status", "/businesses", "created_at"],
    groups: ["community_groups", "id,name,description,platform,url,status,created_at", "/community-groups", "created_at"],
    organizations: ["community_organizations", "id,name,description,website,status,created_at", "/community-organizations", "created_at"],
  };
  const config = map[sectionKey];
  if (!config) return [];
  let query = supabase.from(config[0]).select(config[1]).limit(limit).order(config[3], { ascending: sectionKey === "events" });
  if (["events", "groups", "organizations"].includes(sectionKey)) query = query.eq("status", "approved");
  const { data, error } = await query;
  if (error || !Array.isArray(data)) return [];
  return data.map((row: any) => itemFrom({ ...row, meta: row.date ? `${dateLabel(row.date)}${row.location ? ` · ${row.location}` : ""}` : row.category || row.platform || "" }, config[2]));
}

export async function generateNewsletterDraft(settings: any[]) {
  const enabled = settings.filter((s) => s.enabled !== false).sort((a, b) => toNumber(a.display_order, 999) - toNumber(b.display_order, 999));
  const draftSections = [];
  for (const section of enabled) {
    const limit = Math.max(1, toNumber(section.max_items, 4));
    let items: any[] = [];
    let body = "";
    if (section.section_key === "intro") body = "Here are the latest Seattle Desi TV stories, events, interviews, community updates, and local highlights curated for our community.";
    else if (section.section_key === "closing") body = "Thank you for staying connected with Seattle Desi TV. Follow us for more community stories, interviews, events, radio, and updates.";
    else if (section.section_key === "instagram") items = await latestInstagram(limit);
    else if (section.section_key === "tv") items = await latestYoutube(limit);
    else items = await tableItems(section.section_key, limit);
    if (body || items.length) draftSections.push({ id: `${section.section_key}-${Date.now()}-${Math.random()}`, key: section.section_key, title: section.title || section.section_key, body, items });
  }
  return {
    subject: `Seattle Desi TV Community Update - ${new Date().toLocaleDateString()}`,
    preheader: "Latest events, stories, interviews, local highlights, and community updates from Seattle Desi TV.",
    sections: draftSections,
  };
}
