import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryRange, DiscoveryResult, PublishingContentItem, PublishingSourceType } from "../core/content";
import { isApprovedRow, isWithinRange, normalizeRow } from "./normalizer";
import { countPublishingSourceRows, listPublishingSourceRows } from "../repositories/contentRepository";

type SourceDefinition = {
  sourceType: PublishingSourceType;
  label: string;
  table: string;
  publicPath: string;
  titleFields: string[];
  descriptionFields: string[];
  imageFields: string[];
  dateFields: string[];
  urlFields?: string[];
};

const SOURCES: SourceDefinition[] = [
  { sourceType: "event", label: "Events", table: "events", publicPath: "/events", titleFields: ["title", "name", "event_name"], descriptionFields: ["description", "short_description", "summary"], imageFields: ["image_url", "flyer_url", "image", "cover_image_url"], dateFields: ["event_date", "start_date", "date", "created_at"], urlFields: ["website", "event_url", "registration_url"] },
  { sourceType: "business", label: "Businesses", table: "local_businesses", publicPath: "/businesses", titleFields: ["name", "business_name", "title"], descriptionFields: ["description", "about", "short_description"], imageFields: ["image_url", "logo_url", "image", "cover_image_url"], dateFields: ["approved_at", "created_at", "updated_at"], urlFields: ["website", "website_url"] },
  { sourceType: "organization", label: "Organizations", table: "community_organizations", publicPath: "/community-organizations", titleFields: ["name", "organization_name", "title"], descriptionFields: ["description", "about", "mission"], imageFields: ["image_url", "logo_url", "image", "cover_image_url"], dateFields: ["approved_at", "created_at", "updated_at"], urlFields: ["website", "website_url"] },
  { sourceType: "group", label: "Community Groups", table: "community_groups", publicPath: "/community-groups", titleFields: ["name", "group_name", "title"], descriptionFields: ["description", "about", "summary"], imageFields: ["image_url", "logo_url", "image", "cover_image_url"], dateFields: ["approved_at", "created_at", "updated_at"], urlFields: ["group_url", "website", "join_url"] },
];

export async function discoverSource(supabase: SupabaseClient, definition: SourceDefinition, range: DiscoveryRange): Promise<DiscoveryResult> {
  let data: Record<string, unknown>[];
  try {
    data = await listPublishingSourceRows(supabase, definition.table);
  } catch (error) {
    return { sourceType: definition.sourceType, label: definition.label, items: [], error: error instanceof Error ? error.message : `Could not load ${definition.label}.` };
  }
  const items = data
    .filter(isApprovedRow)
    .map((row) => normalizeRow(row, definition))
    .filter((item) => isWithinRange(item.sourceDate, range.startDate, range.endDate))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || String(b.sourceDate || "").localeCompare(String(a.sourceDate || "")));
  return { sourceType: definition.sourceType, label: definition.label, items };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstImage(row: Record<string, unknown>) {
  const images = row.image_urls;
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return text(row.image_url) || text(row.image) || text(row.thumbnail_url) || text(row.photo) || text(row.picture) || "/hero-sdtv.png";
}

async function discoverHomepageHeroes(supabase: SupabaseClient): Promise<DiscoveryResult> {
  try {
    const [banners, festivals, events] = await Promise.all([
      listPublishingSourceRows(supabase, "homepage_hero_banners"),
      listPublishingSourceRows(supabase, "festival_hero_assets"),
      listPublishingSourceRows(supabase, "events"),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const inWindow = (row: Record<string, unknown>) => (!text(row.start_date) || text(row.start_date) <= today) && (!text(row.end_date) || text(row.end_date) >= today);
    const active = (row: Record<string, unknown>) => row.active !== false && isApprovedRow(row);
    const rows: Record<string, unknown>[] = [
      ...festivals.filter(active).filter(inWindow).map((row) => ({ ...row, _kind: "Festival feature", _url: "/events" })),
      ...events.filter((row) => active(row) && row.featured === true).map((row) => ({ ...row, _kind: "Featured event", _url: `/events/${String(row.id)}` })),
      ...banners.filter(active).filter(inWindow).map((row) => ({ ...row, _kind: text(row.banner_type) || "Homepage feature", _url: text(row.button_url) || "/" })),
    ];
    const items = rows.map((row, index) => ({
      sourceType: "hero" as const,
      sourceId: String(row.id || `homepage-hero-${index}`),
      title: text(row.title) || text(row.festival_name) || "Seattle Desi TV",
      description: text(row.subtitle) || text(row.description) || "Stories, culture, and community from Seattle Desi TV.",
      imageUrl: firstImage(row),
      destinationUrl: text(row._url) || "/",
      sourceDate: null,
      status: "active",
      featured: index === 0,
      metadata: { source: "homepage", kind: row._kind },
    }));
    if (!items.length) items.push({ sourceType: "hero", sourceId: "homepage-default", title: "Seattle Desi TV", description: "Stories. Culture. Community.", imageUrl: "/hero-sdtv.png", destinationUrl: "/", sourceDate: null, status: "active", featured: true, metadata: { source: "homepage", kind: "Default cover" } });
    return { sourceType: "hero", label: "Cover & Hero", items };
  } catch (error) {
    return { sourceType: "hero", label: "Cover & Hero", items: [], error: error instanceof Error ? error.message : "Could not load homepage heroes." };
  }
}

async function discoverFeaturedContent(supabase: SupabaseClient): Promise<DiscoveryResult[]> {
  try {
    const rows = (await listPublishingSourceRows(supabase, "featured_social_content")).filter((row) => row.active !== false && row.featured !== false);
    const makeItems = (sourceType: "highlight" | "video", filter: (row: Record<string, unknown>) => boolean): PublishingContentItem[] => rows.filter(filter).map((row, index) => ({
      sourceType,
      sourceId: String(row.id || `${sourceType}-${index}`),
      title: text(row.title) || "SDTV Community Highlight",
      description: text(row.subtitle) || text(row.description),
      imageUrl: firstImage(row),
      destinationUrl: text(row.content_url) || "https://www.youtube.com/@SeattleDesiTV",
      sourceDate: text(row.published_at) || text(row.created_at) || null,
      status: "active",
      featured: Boolean(row.featured),
      metadata: row,
    }));
    const isVideo = (row: Record<string, unknown>) => /video|youtube|reel|short/i.test(`${text(row.content_type)} ${text(row.platform)}`);
    return [
      { sourceType: "highlight" as const, label: "Community Highlights", items: makeItems("highlight", () => true) },
      { sourceType: "video" as const, label: "Videos", items: makeItems("video", isVideo) },
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load featured content.";
    return [
      { sourceType: "highlight" as const, label: "Community Highlights", items: [], error: message },
      { sourceType: "video" as const, label: "Videos", items: [], error: message },
    ];
  }
}

async function discoverRecognition(supabase: SupabaseClient): Promise<DiscoveryResult> {
  try {
    const rows = await listPublishingSourceRows(supabase, "team_members");
    return { sourceType: "recognition", label: "Recognition", items: rows.map((row, index) => ({ sourceType: "recognition", sourceId: String(row.id || `team-${index}`), title: text(row.name) || "SDTV Team Member", description: text(row.title) || text(row.role) || "Recognized SDTV community contributor", imageUrl: firstImage(row), destinationUrl: "/team", sourceDate: text(row.updated_at) || text(row.created_at) || null, status: "active", featured: false, metadata: row })) };
  } catch (error) {
    return { sourceType: "recognition", label: "Recognition", items: [], error: error instanceof Error ? error.message : "Could not load recognition." };
  }
}

async function discoverStatistics(supabase: SupabaseClient): Promise<DiscoveryResult> {
  const definitions: Array<[string, string, string, string, { column: string; value: string }?]> = [
    ["Events Published", "events", "Approved community events", "/events", { column: "status", value: "approved" }],
    ["Businesses Listed", "local_businesses", "Approved local businesses", "/businesses", { column: "status", value: "approved" }],
    ["Coverage Requests", "event_crew_assignments", "Organizer requests for SDTV coverage", "/coverage", { column: "assignment_type", value: "owner_coverage_request" }],
    ["Team Members", "team_members", "Public SDTV team profiles", "/team"],
    ["Radio Hosts", "radio_team_members", "SDTV radio team profiles", "/radio-team"],
  ];
  const items: Array<PublishingContentItem | null> = await Promise.all(definitions.map(async ([title, table, description, url, filter]): Promise<PublishingContentItem | null> => {
    try {
      const count = await countPublishingSourceRows(supabase, table, filter);
      return { sourceType: "statistic" as const, sourceId: table, title, description: `${count.toLocaleString()} — ${description}`, imageUrl: "", destinationUrl: url, sourceDate: null, status: "active", featured: false, metadata: { value: count, label: title, sourceTable: table } };
    } catch {
      return null;
    }
  }));
  try {
    const socialRows = await listPublishingSourceRows(supabase, "social_media_stats");
    const totals = socialRows.reduce((sum, row) => sum + Number(row.followers || 0), 0);
    items.push({ sourceType: "statistic", sourceId: "social-followers", title: "Social Followers", description: `${totals.toLocaleString()} — Combined across SDTV social platforms`, imageUrl: "", destinationUrl: "/#social", sourceDate: null, status: "active", featured: true, metadata: { value: totals, label: "Social Followers", sourceTable: "social_media_stats" } });
  } catch { /* Other live totals remain available. */ }
  return { sourceType: "statistic", label: "Impact & Statistics", items: items.filter((item): item is NonNullable<typeof item> => Boolean(item)) };
}

function discoverGetInvolved(): DiscoveryResult {
  const actions = [
    ["Volunteer", "Join the SDTV volunteer team and help serve the community.", "/contact?interest=volunteer"],
    ["Sponsor", "Support SDTV programming, events, and community storytelling.", "/contact?interest=sponsor"],
    ["Submit Content", "Share a community story, announcement, or media submission.", "/submit-content"],
    ["Request Coverage", "Invite Seattle Desi TV to cover your event or initiative.", "/coverage"],
  ];
  return { sourceType: "call_to_action", label: "Get Involved", items: actions.map(([title, description, destinationUrl], index) => ({ sourceType: "call_to_action", sourceId: `get-involved-${index}`, title, description, imageUrl: "", destinationUrl, sourceDate: null, status: "active", featured: index === 0, metadata: { source: "homepage-contact" } })) };
}

export async function discoverConfiguredSources(supabase: SupabaseClient, range: DiscoveryRange): Promise<DiscoveryResult[]> {
  const [standard, hero, featured, recognition, statistics] = await Promise.all([
    Promise.all(SOURCES.map((source) => discoverSource(supabase, source, range))),
    discoverHomepageHeroes(supabase),
    discoverFeaturedContent(supabase),
    discoverRecognition(supabase),
    discoverStatistics(supabase),
  ]);
  return [hero, ...featured, ...standard, recognition, statistics, discoverGetInvolved()];
}
