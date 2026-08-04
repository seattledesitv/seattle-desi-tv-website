import type { SupabaseClient } from "@supabase/supabase-js";
import { createDefaultSectionSeeds, hasSectionDefinition } from "../sections/registry";
import {
  createSection,
  createMissingSections,
  deleteSection,
  listSections,
  reorderSections,
  updateSection,
  type PublicationSectionChanges,
  type PublicationSectionRecord,
} from "../repositories/sectionRepository";

function requireId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

export async function ensurePublicationSections(
  supabase: SupabaseClient,
  publicationId: string,
): Promise<PublicationSectionRecord[]> {
  const current = await listSections(supabase, publicationId);
  const existingKeys = new Set(current.map((section) => section.section_key));
  const missing = createDefaultSectionSeeds().filter((seed) => !existingKeys.has(seed.section_key));

  if (!missing.length) return current;
  return createMissingSections(supabase, publicationId, missing);
}

export async function saveSectionChanges(
  supabase: SupabaseClient,
  section: PublicationSectionRecord,
  changes: PublicationSectionChanges,
): Promise<PublicationSectionRecord> {
  if (!hasSectionDefinition(section.section_key) && !section.section_key.startsWith("custom_")) {
    throw new Error(`Unknown publication section: ${section.section_key}`);
  }

  const nextChanges: PublicationSectionChanges = {
    ...changes,
    is_manually_edited: changes.is_manually_edited ?? true,
  };

  return updateSection(supabase, section.id, nextChanges);
}

export async function setSectionIncluded(
  supabase: SupabaseClient,
  section: PublicationSectionRecord,
  included: boolean,
): Promise<PublicationSectionRecord> {
  return saveSectionChanges(supabase, section, { included });
}

export async function saveSectionOrder(
  supabase: SupabaseClient,
  sections: PublicationSectionRecord[],
): Promise<PublicationSectionRecord[]> {
  await reorderSections(supabase, sections.map((section) => section.id));
  return sections.map((section, index) => ({ ...section, sort_order: index * 10 }));
}

export async function addCustomTextSection(
  supabase: SupabaseClient,
  publicationId: string,
  title: string,
  sortOrder: number,
): Promise<PublicationSectionRecord> {
  const normalizedTitle = title.trim() || "New text section";
  return createSection(supabase, {
    publication_id: requireId(publicationId, "Publication ID"),
    section_key: `custom_${crypto.randomUUID()}`,
    title: normalizedTitle,
    introduction: "",
    included: true,
    section_type: "custom_text",
    sort_order: sortOrder,
    source_config: { layout: "editorial", style: "standard" },
    manual_content: {},
    is_manually_edited: true,
  });
}

export async function removeCustomSection(
  supabase: SupabaseClient,
  section: PublicationSectionRecord,
): Promise<void> {
  if (!section.section_key.startsWith("custom_")) {
    throw new Error("Built-in publication sections cannot be deleted. Exclude them instead.");
  }
  await deleteSection(supabase, section.id);
}
