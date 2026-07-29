import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationSectionSeed } from "../types";

export type PublicationSectionRecord = {
  id: string;
  publication_id: string;
  section_key: string;
  title: string;
  introduction: string | null;
  included: boolean;
  sort_order: number;
  section_type: string;
  source_config: Record<string, unknown>;
  generated_content: Record<string, unknown>;
  manual_content: Record<string, unknown>;
  is_manually_edited: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicationSectionChanges = Partial<Pick<PublicationSectionRecord,
  "title" | "introduction" | "included" | "sort_order" | "source_config" | "manual_content" | "is_manually_edited"
>>;

const SECTION_COLUMNS = "id,publication_id,section_key,title,introduction,included,sort_order,section_type,source_config,generated_content,manual_content,is_manually_edited,created_at,updated_at";

export async function listSections(supabase: SupabaseClient, publicationId: string): Promise<PublicationSectionRecord[]> {
  const { data, error } = await supabase
    .from("publication_sections")
    .select(SECTION_COLUMNS)
    .eq("publication_id", publicationId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as PublicationSectionRecord[];
}

export async function createMissingSections(
  supabase: SupabaseClient,
  publicationId: string,
  seeds: PublicationSectionSeed[],
): Promise<PublicationSectionRecord[]> {
  const rows = seeds.map((seed) => ({ publication_id: publicationId, ...seed }));
  const { error } = await supabase
    .from("publication_sections")
    .upsert(rows, { onConflict: "publication_id,section_key", ignoreDuplicates: true });

  if (error) throw error;
  return listSections(supabase, publicationId);
}

export async function updateSection(
  supabase: SupabaseClient,
  sectionId: string,
  changes: PublicationSectionChanges,
): Promise<PublicationSectionRecord> {
  const { data, error } = await supabase
    .from("publication_sections")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", sectionId)
    .select(SECTION_COLUMNS)
    .single();

  if (error) throw error;
  return data as PublicationSectionRecord;
}

export async function reorderSections(
  supabase: SupabaseClient,
  orderedSectionIds: string[],
): Promise<void> {
  const updates = orderedSectionIds.map((id, index) =>
    supabase
      .from("publication_sections")
      .update({ sort_order: index * 10, updated_at: new Date().toISOString() })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
