import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type {
  PressRelease,
  PressReleaseInput,
  PressReleaseStatus,
} from "../types";

const db = getSupabaseBrowserClient();
const fields =
  "id,site_id,created_by,title,summary,body,organization_name,location,release_date,image_urls,image_position_x,image_position_y,image_zoom,image_display_mode,documents,contact_name,contact_email,source_url,status,admin_notes,approved_at,published_at,instagram_permalink,instagram_media_id,instagram_published_at,instagram_published_by,created_at,updated_at";

export async function listPublic(siteId: string) {
  const { data, error } = await db
    .from("press_releases")
    .select(fields)
    .eq("site_id", siteId)
    .eq("status", "approved")
    .lte("published_at", new Date().toISOString())
    .order("release_date", { ascending: false })
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PressRelease[];
}

export async function getPublic(id: string, siteId: string) {
  const { data, error } = await db
    .from("press_releases")
    .select(fields)
    .eq("id", id)
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw error;
  return data as PressRelease | null;
}

export async function listOwner(userId: string, siteId: string) {
  const { data, error } = await db
    .from("press_releases")
    .select(fields)
    .eq("created_by", userId)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PressRelease[];
}

export async function listAdmin(siteId: string) {
  const { data, error } = await db
    .from("press_releases")
    .select(fields)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as PressRelease[];
}

export async function create(
  input: PressReleaseInput,
  userId: string,
  siteId: string,
  status: PressReleaseStatus = "pending",
) {
  const published = status === "approved" ? new Date().toISOString() : null;
  const { data, error } = await db
    .from("press_releases")
    .insert({
      ...input,
      site_id: siteId,
      created_by: userId,
      status,
      approved_by: status === "approved" ? userId : null,
      approved_at: published,
      published_at: published,
    })
    .select(fields)
    .single();
  if (error) throw error;
  return data as PressRelease;
}

export async function updateOwner(
  id: string,
  changes: Partial<PressReleaseInput>,
  siteId: string,
) {
  const { error } = await db
    .from("press_releases")
    .update({
      ...changes,
      status: "pending",
      admin_notes: null,
      approved_by: null,
      approved_at: null,
      published_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("site_id", siteId);
  if (error) throw error;
}

export async function updateAdmin(
  id: string,
  changes: Partial<PressReleaseInput>,
  siteId: string,
) {
  const { error } = await db
    .from("press_releases")
    .update({
      ...changes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("site_id", siteId);
  if (error) throw error;
}

export async function review(
  id: string,
  decision: string,
  notes: string,
  siteId: string,
) {
  const target = await db
    .from("press_releases")
    .select("id")
    .eq("id", id)
    .eq("site_id", siteId)
    .maybeSingle();
  if (target.error) throw target.error;
  if (!target.data) throw new Error("Press release not found for this site.");
  const { error } = await db.rpc("review_press_release", {
    press_release_id: id,
    decision,
    review_notes: notes || null,
  });
  if (error) throw error;
}

export async function uploadFile(file: File, userId: string) {
  const safe = file.name.replace(/[^a-z0-9._-]/gi, "-");
  const path = `press-releases/${userId}/${crypto.randomUUID()}-${safe}`;
  const result = await db.storage.from("event-posters").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (result.error) throw result.error;
  return db.storage.from("event-posters").getPublicUrl(path).data.publicUrl;
}
