import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicationItemInclusionStatus =
  | "included"
  | "excluded_by_editor"
  | "source_unavailable";

export type PublicationItemRecord = {
  id: string;
  publication_section_id: string;
  source_type: string;
  source_id: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  destination_url: string | null;
  inclusion_status: PublicationItemInclusionStatus;
  featured: boolean;
  sort_order: number;
  generated_content: Record<string, unknown>;
  manual_content: Record<string, unknown>;
  is_manually_edited: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicationItemChanges = Partial<
  Pick<
    PublicationItemRecord,
    | "title"
    | "description"
    | "image_url"
    | "destination_url"
    | "inclusion_status"
    | "featured"
    | "sort_order"
    | "generated_content"
    | "manual_content"
    | "is_manually_edited"
  >
>;

const ITEM_COLUMNS = [
  "id",
  "publication_section_id",
  "source_type",
  "source_id",
  "title",
  "description",
  "image_url",
  "destination_url",
  "inclusion_status",
  "featured",
  "sort_order",
  "generated_content",
  "manual_content",
  "is_manually_edited",
  "created_at",
  "updated_at",
].join(",");

export async function listItems(
  supabase: SupabaseClient,
  publicationSectionId: string,
): Promise<PublicationItemRecord[]> {
  const { data, error } = await supabase
    .from("publication_items")
    .select(ITEM_COLUMNS)
    .eq("publication_section_id", publicationSectionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as PublicationItemRecord[];
}

export async function getItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<PublicationItemRecord> {
  const { data, error } = await supabase
    .from("publication_items")
    .select(ITEM_COLUMNS)
    .eq("id", itemId)
    .single();

  if (error) throw error;
  return data as unknown as PublicationItemRecord;
}

export async function updateItem(
  supabase: SupabaseClient,
  itemId: string,
  changes: PublicationItemChanges,
): Promise<PublicationItemRecord> {
  const { data, error } = await supabase
    .from("publication_items")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select(ITEM_COLUMNS)
    .single();

  if (error) throw error;
  return data as unknown as PublicationItemRecord;
}

export async function setIncluded(
  supabase: SupabaseClient,
  itemId: string,
  included: boolean,
): Promise<PublicationItemRecord> {
  return updateItem(supabase, itemId, {
    inclusion_status: included ? "included" : "excluded_by_editor",
  });
}

export async function setFeatured(
  supabase: SupabaseClient,
  itemId: string,
  featured: boolean,
): Promise<PublicationItemRecord> {
  return updateItem(supabase, itemId, { featured });
}

export async function reorderItems(
  supabase: SupabaseClient,
  orderedItemIds: string[],
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const updates = orderedItemIds.map((id, index) =>
    supabase
      .from("publication_items")
      .update({ sort_order: index * 10, updated_at: updatedAt })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export async function deleteItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await supabase
    .from("publication_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}
