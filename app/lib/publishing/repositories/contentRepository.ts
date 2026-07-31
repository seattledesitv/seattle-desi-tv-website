import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryResult, PublishingContentItem } from "../core/content";
import type { PublicationItemRecord } from "./publicationItemRepository";

export type PublicationSectionRecord = {
  id: string;
  publication_id: string;
  section_key: string;
  title: string;
  introduction: string | null;
  included: boolean;
  sort_order: number;
};

export async function listPublicationSections(supabase: SupabaseClient, publicationId: string): Promise<PublicationSectionRecord[]> {
  const { data, error } = await supabase.from("publication_sections").select("id,publication_id,section_key,title,introduction,included,sort_order").eq("publication_id", publicationId).order("sort_order");
  if (error) throw error;
  return (data || []) as PublicationSectionRecord[];
}

export async function listPublicationItems(supabase: SupabaseClient, sectionIds: string[]) {
  if (!sectionIds.length) return [];
  const { data, error } = await supabase.from("publication_items").select("*").in("publication_section_id", sectionIds).order("sort_order");
  if (error) throw error;
  return data || [];
}

function sectionKeyFor(sourceType: PublishingContentItem["sourceType"]) {
  const mapping: Record<PublishingContentItem["sourceType"], string> = {
    hero: "cover",
    highlight: "highlights",
    event: "events",
    business: "businesses",
    organization: "organizations",
    group: "groups",
    recognition: "recognition",
    video: "videos",
    statistic: "statistics",
    call_to_action: "get_involved",
  };
  return mapping[sourceType];
}

export async function listPublishingSourceRows(supabase: SupabaseClient, table: string) {
  const { data, error } = await supabase.from(table).select("*").limit(250);
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function countPublishingSourceRows(
  supabase: SupabaseClient,
  table: string,
  filter?: { column: string; value: string },
) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) query = query.eq(filter.column, filter.value);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function saveDiscoverySnapshot(
  supabase: SupabaseClient,
  sections: PublicationSectionRecord[],
  results: DiscoveryResult[],
) {
  const sectionByKey = new Map(sections.map((section) => [section.section_key, section]));
  const sectionIds = sections.map((section) => section.id);
  const existing = await listPublicationItems(supabase, sectionIds);
  const existingBySource = new Map((existing as PublicationItemRecord[]).map((item) => [`${item.publication_section_id}:${item.source_type}:${item.source_id}`, item]));
  const rows: Record<string, unknown>[] = [];

  for (const result of results) {
    for (const [index, item] of result.items.entries()) {
      const section = sectionByKey.get(sectionKeyFor(item.sourceType));
      if (!section) continue;
      const previous = existingBySource.get(`${section.id}:${item.sourceType}:${item.sourceId}`);
      rows.push({
        publication_section_id: section.id,
        source_type: item.sourceType,
        source_id: item.sourceId,
        title: previous?.is_manually_edited ? previous.title : item.title,
        description: previous?.is_manually_edited ? previous.description : item.description,
        image_url: previous?.is_manually_edited ? previous.image_url : item.imageUrl || null,
        destination_url: previous?.is_manually_edited ? previous.destination_url : item.destinationUrl || null,
        inclusion_status: previous?.inclusion_status || "included",
        featured: previous?.featured ?? item.featured,
        sort_order: previous?.sort_order ?? index,
        generated_content: { sourceDate: item.sourceDate, status: item.status, metadata: item.metadata },
        manual_content: previous?.manual_content || {},
        is_manually_edited: previous?.is_manually_edited || false,
      });
    }
  }

  if (!rows.length) return 0;
  const { error } = await supabase.from("publication_items").upsert(rows, { onConflict: "publication_section_id,source_type,source_id" });
  if (error) throw error;
  return rows.length;
}

export async function updatePublicationItem(supabase: SupabaseClient, itemId: string, changes: Record<string, unknown>) {
  const { data, error } = await supabase.from("publication_items").update({ ...changes, is_manually_edited: true, updated_at: new Date().toISOString() }).eq("id", itemId).select("*").single();
  if (error) throw error;
  return data;
}
