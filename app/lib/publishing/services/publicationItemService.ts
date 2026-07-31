import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deleteItem as deleteItemRecord,
  getItem as getItemRecord,
  listItems as listItemRecords,
  reorderItems as reorderItemRecords,
  setFeatured as setFeaturedRecord,
  setIncluded as setIncludedRecord,
  updateItem as updateItemRecord,
  type PublicationItemChanges,
  type PublicationItemRecord,
} from "../repositories/publicationItemRepository";

export type PublicationItemManualField =
  | "title"
  | "description"
  | "image_url"
  | "destination_url";

export type PublicationItemEditorialChanges = Partial<
  Pick<PublicationItemRecord, PublicationItemManualField>
>;

const MANUAL_FIELDS: PublicationItemManualField[] = [
  "title",
  "description",
  "image_url",
  "destination_url",
];

function requireId(value: string, label: string): string {
  const id = value.trim();
  if (!id) throw new Error(`${label} is required.`);
  return id;
}

function hasOwn<T extends object>(value: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function validateEditorialChanges(changes: PublicationItemEditorialChanges): void {
  const keys = Object.keys(changes);
  if (!keys.length) throw new Error("At least one publication item change is required.");

  const invalid = keys.find(
    (key) => !MANUAL_FIELDS.includes(key as PublicationItemManualField),
  );
  if (invalid) throw new Error(`Unsupported publication item field: ${invalid}`);
}

function mergeManualContent(
  item: PublicationItemRecord,
  changes: PublicationItemEditorialChanges,
): Record<string, unknown> {
  const manualContent = { ...(item.manual_content || {}) };

  for (const field of MANUAL_FIELDS) {
    if (hasOwn(changes, field)) manualContent[field] = changes[field];
  }

  return manualContent;
}

export async function getPublicationItems(
  supabase: SupabaseClient,
  publicationSectionId: string,
): Promise<PublicationItemRecord[]> {
  return listItemRecords(
    supabase,
    requireId(publicationSectionId, "Publication section ID"),
  );
}

export async function getPublicationItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<PublicationItemRecord> {
  return getItemRecord(supabase, requireId(itemId, "Publication item ID"));
}

export async function savePublicationItemEdits(
  supabase: SupabaseClient,
  itemId: string,
  changes: PublicationItemEditorialChanges,
): Promise<PublicationItemRecord> {
  const id = requireId(itemId, "Publication item ID");
  validateEditorialChanges(changes);

  const current = await getItemRecord(supabase, id);
  const repositoryChanges: PublicationItemChanges = {
    ...changes,
    manual_content: mergeManualContent(current, changes),
    is_manually_edited: true,
  };

  return updateItemRecord(supabase, id, repositoryChanges);
}

export async function includePublicationItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<PublicationItemRecord> {
  return setIncludedRecord(
    supabase,
    requireId(itemId, "Publication item ID"),
    true,
  );
}

export async function excludePublicationItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<PublicationItemRecord> {
  return setIncludedRecord(
    supabase,
    requireId(itemId, "Publication item ID"),
    false,
  );
}

export async function featurePublicationItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<PublicationItemRecord> {
  return setFeaturedRecord(
    supabase,
    requireId(itemId, "Publication item ID"),
    true,
  );
}

export async function unfeaturePublicationItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<PublicationItemRecord> {
  return setFeaturedRecord(
    supabase,
    requireId(itemId, "Publication item ID"),
    false,
  );
}

export async function savePublicationItemOrder(
  supabase: SupabaseClient,
  orderedItemIds: string[],
): Promise<void> {
  if (!orderedItemIds.length) return;

  const normalizedIds = orderedItemIds.map((id, index) =>
    requireId(id, `Publication item ID at position ${index + 1}`),
  );
  const uniqueIds = new Set(normalizedIds);

  if (uniqueIds.size !== normalizedIds.length) {
    throw new Error("Publication item order contains duplicate IDs.");
  }

  await reorderItemRecords(supabase, normalizedIds);
}

export async function removePublicationItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<void> {
  await deleteItemRecord(
    supabase,
    requireId(itemId, "Publication item ID"),
  );
}
