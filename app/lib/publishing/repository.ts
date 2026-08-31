import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PUBLICATION_SECTIONS } from "./defaults";
import type { PublicationDraftInput, PublicationRecord, PublicationStatus } from "./types";

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export async function listPublications(supabase: SupabaseClient, siteId: string): Promise<PublicationRecord[]> {
  const { data, error } = await supabase.from("publications").select("*").eq("site_id", siteId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PublicationRecord[];
}

export async function getPublication(supabase: SupabaseClient, publicationId: string, siteId?: string): Promise<PublicationRecord> {
  let query = supabase.from("publications").select("*").eq("id", publicationId);
  if (siteId) query = query.eq("site_id", siteId);
  const { data, error } = await query.single();
  if (error) throw error;
  return data as PublicationRecord;
}

export async function createPublication(supabase: SupabaseClient, input: PublicationDraftInput, userId: string, siteId: string): Promise<PublicationRecord> {
  const { data, error } = await supabase.from("publications").insert({
    name: input.name.trim(), edition_label: clean(input.edition_label), publication_type: input.publication_type,
    start_date: clean(input.start_date), end_date: clean(input.end_date), description: clean(input.description),
    site_id: siteId, status: "draft", created_by: userId, updated_by: userId,
  }).select("*").single();
  if (error) throw error;
  const sectionResult = await supabase.from("publication_sections").insert(DEFAULT_PUBLICATION_SECTIONS.map((section) => ({ ...section, publication_id: data.id })));
  if (sectionResult.error) { await supabase.from("publications").delete().eq("id", data.id); throw sectionResult.error; }
  return data as PublicationRecord;
}

export async function updatePublication(supabase: SupabaseClient, publicationId: string, changes: Partial<PublicationDraftInput> & { status?: PublicationStatus }, userId: string): Promise<PublicationRecord> {
  const payload: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };
  if (changes.name !== undefined) payload.name = changes.name.trim();
  if (changes.edition_label !== undefined) payload.edition_label = clean(changes.edition_label);
  if (changes.publication_type !== undefined) payload.publication_type = changes.publication_type;
  if (changes.start_date !== undefined) payload.start_date = clean(changes.start_date);
  if (changes.end_date !== undefined) payload.end_date = clean(changes.end_date);
  if (changes.description !== undefined) payload.description = clean(changes.description);
  if (changes.status !== undefined) payload.status = changes.status;
  const { data, error } = await supabase.from("publications").update(payload).eq("id", publicationId).select("*").single();
  if (error) throw error;
  return data as PublicationRecord;
}

export async function duplicatePublication(supabase: SupabaseClient, source: PublicationRecord, userId: string): Promise<PublicationRecord> {
  const duplicate = await createPublication(supabase, { name: `${source.name} Copy`, edition_label: source.edition_label || "", publication_type: source.publication_type, start_date: source.start_date || "", end_date: source.end_date || "", description: source.description || "" }, userId, source.site_id);
  const { data: sourceSections, error } = await supabase.from("publication_sections").select("section_key,title,introduction,included,sort_order,section_type,source_config,generated_content,manual_content,is_manually_edited").eq("publication_id", source.id).order("sort_order");
  if (error || !sourceSections?.length) return duplicate;
  await supabase.from("publication_sections").delete().eq("publication_id", duplicate.id);
  const copyResult = await supabase.from("publication_sections").insert(sourceSections.map((section) => ({ ...section, publication_id: duplicate.id })));
  if (copyResult.error) throw copyResult.error;
  return duplicate;
}

export async function archivePublication(supabase: SupabaseClient, publicationId: string, userId: string) {
  return updatePublication(supabase, publicationId, { status: "archived" }, userId);
}

export async function deleteDraftPublication(supabase: SupabaseClient, publication: PublicationRecord) {
  if (publication.status !== "draft") throw new Error("Only draft publications can be deleted. Archive other publications instead.");
  const { error } = await supabase.from("publications").delete().eq("id", publication.id).eq("status", "draft");
  if (error) throw error;
}
