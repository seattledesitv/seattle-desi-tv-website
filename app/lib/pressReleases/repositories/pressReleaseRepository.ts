import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type { PressRelease, PressReleaseInput, PressReleaseStatus } from "../types";

const db = getSupabaseBrowserClient();
const fields = "id,created_by,title,summary,body,organization_name,location,release_date,image_urls,contact_name,contact_email,source_url,status,admin_notes,approved_at,published_at,created_at,updated_at";

export async function listPublic() {
  const { data, error } = await db.from("press_releases").select(fields)
    .eq("status", "approved").lte("published_at", new Date().toISOString())
    .order("release_date", { ascending: false }).order("published_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PressRelease[];
}

export async function getPublic(id: string) {
  const { data, error } = await db.from("press_releases").select(fields).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as PressRelease | null;
}

export async function listOwner(userId: string) {
  const { data, error } = await db.from("press_releases").select(fields)
    .eq("created_by", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PressRelease[];
}

export async function listAdmin() {
  const { data, error } = await db.from("press_releases").select(fields)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PressRelease[];
}

export async function create(input: PressReleaseInput, userId: string, status: PressReleaseStatus = "pending") {
  const published = status === "approved" ? new Date().toISOString() : null;
  const { data, error } = await db.from("press_releases").insert({
    ...input, created_by: userId, status,
    approved_by: status === "approved" ? userId : null,
    approved_at: published, published_at: published,
  }).select(fields).single();
  if (error) throw error;
  return data as PressRelease;
}

export async function updateOwner(id: string, changes: Partial<PressReleaseInput>) {
  const { error } = await db.from("press_releases").update({
    ...changes, status: "pending", updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw error;
}

export async function review(id: string, decision: string, notes: string) {
  const { error } = await db.rpc("review_press_release", {
    press_release_id: id, decision, review_notes: notes || null,
  });
  if (error) throw error;
}

export async function uploadImage(file: File, userId: string) {
  const safe = file.name.replace(/[^a-z0-9._-]/gi, "-");
  const path = `press-releases/${userId}/${crypto.randomUUID()}-${safe}`;
  const result = await db.storage.from("event-posters").upload(path, file, {
    cacheControl: "3600", upsert: false,
  });
  if (result.error) throw result.error;
  return db.storage.from("event-posters").getPublicUrl(path).data.publicUrl;
}
