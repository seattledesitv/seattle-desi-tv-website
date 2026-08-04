import type { SupabaseClient } from "@supabase/supabase-js";
import { listSections } from "../repositories/sectionRepository";
import { getPublicationItems } from "./publicationItemService";
import { openPublicationEditorialWorkspace } from "./publicationWorkspaceService";
import type { PublicationPreviewModel } from "../preview/types";
import { getPublication } from "../repository";
export async function buildPublicationPreview(supabase: SupabaseClient, publicationId: string): Promise<PublicationPreviewModel> {
  const publication = await openPublicationEditorialWorkspace(supabase, publicationId);
  const sections = (await listSections(supabase, publicationId)).filter((section) => section.included);
  const withItems = await Promise.all(sections.map(async (section) => ({ ...section, items: (await getPublicationItems(supabase, section.id)).filter((item) => item.inclusion_status === "included") })));
  return { publication, sections: withItems, generatedAt: new Date().toISOString() };
}
export async function buildPublicPublicationPreview(supabase: SupabaseClient, publicationId: string): Promise<PublicationPreviewModel> {
  const publication = await getPublication(supabase, publicationId);
  if (publication.status !== "published") throw new Error("This publication is not public.");
  const sections = (await listSections(supabase, publicationId)).filter((section) => section.included);
  const withItems = await Promise.all(sections.map(async (section) => ({ ...section, items: (await getPublicationItems(supabase, section.id)).filter((item) => item.inclusion_status === "included") })));
  return { publication, sections: withItems, generatedAt: publication.updated_at };
}
export function previewFileName(name: string, extension: string) { return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "publication"}.${extension}`; }
