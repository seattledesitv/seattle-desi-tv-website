import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryRange, DiscoveryResult, PublishingSourceType } from "../core/content";
import { isApprovedRow, isWithinRange, normalizeRow } from "./normalizer";

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
  const { data, error } = await supabase.from(definition.table).select("*").limit(250);
  if (error) return { sourceType: definition.sourceType, label: definition.label, items: [], error: error.message };
  const items = (data || [])
    .filter(isApprovedRow)
    .map((row) => normalizeRow(row, definition))
    .filter((item) => isWithinRange(item.sourceDate, range.startDate, range.endDate))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || String(b.sourceDate || "").localeCompare(String(a.sourceDate || "")));
  return { sourceType: definition.sourceType, label: definition.label, items };
}

export async function discoverConfiguredSources(supabase: SupabaseClient, range: DiscoveryRange) {
  return Promise.all(SOURCES.map((source) => discoverSource(supabase, source, range)));
}
