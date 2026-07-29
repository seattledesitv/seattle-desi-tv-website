import type { PublicationSectionSeed } from "../types";
import { DEFAULT_PUBLICATION_SECTIONS } from "../defaults";

export type SectionDefinition = PublicationSectionSeed & {
  label: string;
  description: string;
  supportsItems: boolean;
  defaultMaxItems: number | null;
};

const SECTION_DEFINITIONS: SectionDefinition[] = DEFAULT_PUBLICATION_SECTIONS.map((section) => ({
  ...section,
  label: section.title,
  description: section.introduction,
  supportsItems: section.section_type === "dynamic",
  defaultMaxItems: section.section_type === "dynamic" ? 12 : null,
}));

const sectionByKey = new Map(SECTION_DEFINITIONS.map((section) => [section.section_key, section]));

export function listSectionDefinitions(): SectionDefinition[] {
  return SECTION_DEFINITIONS.map((section) => ({ ...section }));
}

export function getSectionDefinition(sectionKey: string): SectionDefinition | null {
  const section = sectionByKey.get(sectionKey);
  return section ? { ...section } : null;
}

export function hasSectionDefinition(sectionKey: string): boolean {
  return sectionByKey.has(sectionKey);
}

export function createDefaultSectionSeeds(): PublicationSectionSeed[] {
  return SECTION_DEFINITIONS.map(({ label: _label, description: _description, supportsItems: _supportsItems, defaultMaxItems: _defaultMaxItems, ...seed }) => ({ ...seed }));
}
