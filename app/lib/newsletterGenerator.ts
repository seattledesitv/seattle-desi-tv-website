import { getSupabaseBrowserClient } from "./supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const SITE_URL = "https://www.seattledesitv.com";
const FALLBACK_IMAGE = `${SITE_URL}/sdtv-logo.png`;

function clean(value: any, fallback = "") { return String(value || fallback).trim(); }
function clip(value: any, max = 180) { const v = clean(value).replace(/\s+/g, " "); return v.length > max ? `${v.slice(0, max).trim()}...` : v; }
function firstArrayValue(value: any) { return Array.isArray(value) ? clean(value.find(Boolean)) : ""; }
function absoluteUrl(value: any) { const url = clean(value); if (!url) return ""; if (/^https?:\/\//i.test(url)) return url; return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`; }
function imageFrom(row: any) { return absoluteUrl(firstArrayValue(row?.image_urls) || row?.image || row?.image_url || row?.photo_url || row?.profile_photo_url || row?.logo_url || row?.logo || row?.thumbnail || row?.thumbnailUrl || row?.mediaUrl || row?.media_url || ""); }
function dateLabel(value: any) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function toNumber(value: any, fallback = 4) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function detailUrl(base: string, row: any) { return row?.id ? `${SITE_URL}${base}/${row.id}` : `${SITE_URL}${base}`; }
function isPremiumActive(row: any) { if (!row?.is_premium) return false; const now = Date.now(); const starts = row.premium_starts_at ? new Date(row.premium_starts_at).getTime() : 0; const ends = row.premium_ends_at ? new Date(row.premium_ends_at).getTime() : Number.POSITIVE_INFINITY; return starts <= now && now <= ends; }
function isPublished(row: any) { if (row?.approved === true || row?.is_approved === true || row?.published === true || row?.active === true) return true; const status = clean(row?.status).toLowerCase(); if (!status) return true; return ["approved", "active", "published", "live"].includes(status); }
function itemFrom(row: any, fallbackUrl = "", options: any = {}) { const image = imageFrom(row); return { title: clean(row.title || row.name, "SDTV Update"), text: clip(row.description || row.caption || row.subtitle || row.offer || row.discount || row.category || row.about || ""), image: image || (options.useFallbackImage ? FALLBACK_IMAGE : ""), url: absoluteUrl(row.url || row.website || row.permalink || row.content_url || fallbackUrl), meta: clean(row.meta || row.date || row.location || row.city || row.category || row.platform || ""), badge: clean(options.badge || (isPremiumActive(row) ? row.premium_label || "Featured" : "")), cta: clean(options.cta || "View more"), imageFit: clean(row.image_display_mode) === "contain" ? "contain" : "cover" }; }

async function latestInstagram(limit: number) { try { const response = await fetch(`/api/instagram/latest?limit=${limit}`, { cache: "no-store" }); const result = await response.json(); return result?.ok && Array.isArray(result.posts) ? result.posts.slice(0, limit).map((p: any) => itemFrom(p, "", { cta: "View on Instagram", useFallbackImage: true })) : []; } catch { return []; } }
async function latestYoutube(limit: number) { try { const response = await fetch("/api/youtube/latest", { cache: "no-store" }); const result = await response.json(); return result?.ok && Array.isArray(result.videos) ? result.videos.slice(0, limit).map((v: any) => itemFrom(v, "", { cta: "Watch now", useFallbackImage: true })) : []; } catch { return []; } }

async function newTeamMembers(limit: number) {
  const { data, error } = await supabase.from("team_members").select("id,name,title,image,email,user_id,created_at,show_on_public_team").order("created_at", { ascending: false }).limit(Math.max(limit * 3, 20));
  if (error || !Array.isArray(data)) return { items: [], reason: error?.message || "No team members returned." };
  const rows = data.filter((row: any) => row.show_on_public_team !== false).slice(0, limit);
  return { items: rows.map((row: any) => itemFrom({ ...row, meta: row.created_at ? `Joined ${dateLabel(row.created_at)}` : "New team member", description: row.title || "Seattle Desi TV Team Member" }, `${SITE_URL}/team`, { cta: "Meet the team", useFallbackImage: true, badge: "New" })), reason: rows.length ? "" : "No public team members found." };
}

async function teamLeaderboard(limit: number) {
  const [assignmentsResult, profilesResult] = await Promise.all([
    supabase.from("event_crew_assignments").select("id,user_id,user_email,coverage_completed,status,completed_at").eq("coverage_completed", true).order("completed_at", { ascending: false }).limit(1000),
    supabase.from("user_profiles").select("user_id,email,full_name,profile_photo_url,id_badge_url"),
  ]);
  if (assignmentsResult.error) return { items: [], reason: assignmentsResult.error.message };
  const byUser: Record<string, any> = {};
  (profilesResult.data || []).forEach((profile: any) => { if (profile.user_id) byUser[`u:${profile.user_id}`] = profile; if (profile.email) byUser[`e:${String(profile.email).toLowerCase()}`] = profile; });
  const scores: Record<string, any> = {};
  (assignmentsResult.data || []).forEach((row: any) => { const key = row.user_id ? `u:${row.user_id}` : `e:${String(row.user_email || "").toLowerCase()}`; if (!key || key === "e:") return; const profile = byUser[key] || byUser[`e:${String(row.user_email || "").toLowerCase()}`] || {}; if (!scores[key]) scores[key] = { key, count: 0, name: profile.full_name || row.user_email || "SDTV Team Member", image: profile.profile_photo_url || profile.id_badge_url || "" }; scores[key].count += 1; });
  const ranked = Object.values(scores).sort((a: any, b: any) => b.count - a.count).slice(0, limit);
  return { items: ranked.map((row: any, index: number) => itemFrom({ ...row, title: `${index + 1}. ${row.name}`, description: `${row.count} completed event coverage assignment${row.count === 1 ? "" : "s"}`, meta: index === 0 ? "Community Champion" : `Rank #${index + 1}` }, `${SITE_URL}/team`, { cta: "View team", useFallbackImage: true, badge: index < 3 ? ["Gold", "Silver", "Bronze"][index] : "" })), reason: ranked.length ? "" : "No completed coverage activity found." };
}

async function communityStats(limit: number) {
  const sources = [["Events", "events"], ["Businesses", "local_businesses"], ["Organizations", "community_organizations"], ["Community Groups", "community_groups"], ["Team Members", "team_members"], ["Newsletter Subscribers", "newsletter_subscribers"]];
  const results = await Promise.all(sources.map(async ([label, table]) => { let query: any = supabase.from(table).select("*", { count: "exact", head: true }); if (table === "newsletter_subscribers") query = query.eq("status", "active"); const { count, error } = await query; return { label, count: error ? 0 : Number(count || 0) }; }));
  const items = results.filter((row) => row.count > 0).slice(0, limit).map((row) => ({ title: row.count.toLocaleString("en-US"), text: row.label, image: "", url: "", meta: "SDTV Community", badge: "", cta: "", imageFit: "cover" }));
  return { items, reason: items.length ? "" : "No community statistics were available." };
}

async function milestones(limit: number) {
  const stats = await communityStats(20);
  const thresholds = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 1000000];
  const items = stats.items.map((item: any) => { const value = Number(String(item.title).replace(/,/g, "")); const hit = thresholds.filter((threshold) => value >= threshold).pop(); if (!hit) return null; return { ...item, title: `We reached ${hit.toLocaleString("en-US")} ${item.text}!`, text: "Thank you to everyone who helped Seattle Desi TV reach this community milestone.", meta: "Milestone Celebration", badge: "Celebrate", image: FALLBACK_IMAGE, imageFit: "contain" }; }).filter(Boolean).slice(0, limit);
  return { items, reason: items.length ? "" : "No milestone thresholds reached yet." };
}

type TableResult = { items: any[]; reason: string };
async function tableItems(sectionKey: string, limit: number): Promise<TableResult> {
  const map: Record<string, any> = { events: { table: "events", base: "/events", order: "date", ascending: true, cta: "View event" }, businesses: { table: "local_businesses", base: "/businesses", order: "created_at", ascending: false, cta: "Explore business" }, groups: { table: "community_groups", base: "/community-groups", order: "created_at", ascending: false, cta: "Join or learn more" }, organizations: { table: "community_organizations", base: "/community-organizations", order: "created_at", ascending: false, cta: "Explore organization" } };
  const config = map[sectionKey];
  if (!config) return { items: [], reason: "Unsupported section." };
  let query = supabase.from(config.table).select("*").limit(Math.max(limit * 8, 40));
  if (config.order) query = query.order(config.order, { ascending: config.ascending });
  const { data, error } = await query;
  if (error) return { items: [], reason: error.message || `Could not read ${config.table}.` };
  if (!Array.isArray(data)) return { items: [], reason: `No rows returned from ${config.table}.` };
  let rows = data.filter((row: any) => isPublished(row));
  if (sectionKey === "events") { const today = new Date(); today.setHours(0, 0, 0, 0); const upcoming = rows.filter((row: any) => !row.date || Number.isNaN(new Date(row.date).getTime()) || new Date(row.date).getTime() >= today.getTime()); if (upcoming.length) rows = upcoming; }
  if (["businesses", "organizations"].includes(sectionKey)) rows.sort((a: any, b: any) => { const premiumDifference = Number(isPremiumActive(b)) - Number(isPremiumActive(a)); if (premiumDifference) return premiumDifference; const rankDifference = toNumber(a.premium_rank, 999999) - toNumber(b.premium_rank, 999999); if (rankDifference) return rankDifference; return new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime(); });
  const items = rows.slice(0, limit).map((row: any) => { const meta = row.date ? `${dateLabel(row.date)}${row.location ? ` · ${row.location}` : ""}` : [row.category, row.city, row.platform].filter(Boolean).join(" · "); const fallback = sectionKey === "groups" && row.url ? row.url : detailUrl(config.base, row); return itemFrom({ ...row, meta }, fallback, { cta: config.cta, useFallbackImage: ["businesses", "organizations", "events"].includes(sectionKey) }); });
  return { items, reason: items.length ? "" : `${data.length} row(s) found, but none were approved or publishable.` };
}

const magazineDefaults = [
  { section_key: "new_team", display_order: 5, enabled: true, title: "Welcome New Team Members", max_items: 4 },
  { section_key: "leaderboard", display_order: 6, enabled: true, title: "Team Leaderboard", max_items: 5 },
  { section_key: "stats", display_order: 7, enabled: true, title: "SDTV by the Numbers", max_items: 6 },
  { section_key: "milestones", display_order: 8, enabled: true, title: "Milestones Worth Celebrating", max_items: 3 },
  { section_key: "volunteer", display_order: 90, enabled: true, title: "Join the SDTV Family", max_items: 1 },
];

export async function generateNewsletterDraft(settings: any[]) {
  const supplied = Array.isArray(settings) ? settings : [];
  const missingMagazineSections = magazineDefaults.filter((item) => !supplied.some((row: any) => row.section_key === item.section_key));
  const enabled = [...supplied, ...missingMagazineSections].filter((s) => s.enabled !== false).sort((a, b) => toNumber(a.display_order, 999) - toNumber(b.display_order, 999));
  const draftSections = [];
  const generationSummary: any[] = [];
  for (const section of enabled) {
    const limit = Math.max(1, toNumber(section.max_items, 4));
    let items: any[] = []; let body = ""; let reason = "";
    if (section.section_key === "intro") body = "Discover what is happening across Seattle's South Asian community—from upcoming events and new videos to local businesses, organizations, team achievements, and community milestones.";
    else if (section.section_key === "closing") body = "Thank you for supporting Seattle Desi TV. Together, we are building a stronger platform for community stories, local businesses, organizations, events, culture, and connection across the Pacific Northwest.";
    else if (section.section_key === "volunteer") { body = "Love community, media, events, or storytelling? Join the Seattle Desi TV family. Volunteer, learn, grow, and make an impact."; items = [{ title: "Want to Volunteer? Join the Team", text: "Build skills, meet community leaders, cover exciting events, and help share stories that matter.", image: FALLBACK_IMAGE, imageFit: "contain", url: `${SITE_URL}/volunteer`, cta: "Join the Team", badge: "Volunteer" }]; }
    else if (section.section_key === "instagram") { items = await latestInstagram(limit); reason = items.length ? "" : "Instagram returned no posts."; }
    else if (section.section_key === "tv") { items = await latestYoutube(limit); reason = items.length ? "" : "YouTube returned no videos."; }
    else if (section.section_key === "new_team") ({ items, reason } = await newTeamMembers(limit));
    else if (section.section_key === "leaderboard") ({ items, reason } = await teamLeaderboard(limit));
    else if (section.section_key === "stats") ({ items, reason } = await communityStats(limit));
    else if (section.section_key === "milestones") ({ items, reason } = await milestones(limit));
    else { const result = await tableItems(section.section_key, limit); items = result.items; reason = result.reason; }
    generationSummary.push({ key: section.section_key, title: section.title || section.section_key, count: items.length, included: Boolean(body || items.length), reason });
    if (body || items.length) draftSections.push({ id: `${section.section_key}-${Date.now()}-${Math.random()}`, key: section.section_key, title: section.title || section.section_key, body, items });
  }
  return { subject: `Seattle Desi TV Community Update - ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, preheader: "Upcoming events, latest videos, new team members, community achievements, businesses, organizations, and highlights from Seattle Desi TV.", sections: draftSections, generationSummary };
}
