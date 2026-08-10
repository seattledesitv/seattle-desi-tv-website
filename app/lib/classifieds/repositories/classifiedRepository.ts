import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type {
  ClassifiedAd,
  ClassifiedInput,
  ClassifiedPlacement,
  ClassifiedPricing,
} from "../types";
const db = getSupabaseBrowserClient();
const fields =
  "id,created_by,category,title,description,price_cents,price_type,item_condition,location,image_urls,contact_name,contact_email,contact_phone,contact_method,destination_url,requested_placement,status,quoted_price_cents,payment_status,payment_link,admin_notes,starts_at,expires_at,created_at,updated_at";
export async function listPublic() {
  const { data, error } = await db
    .from("classified_ads")
    .select(fields)
    .eq("status", "active")
    .lte("starts_at", new Date().toISOString())
    .gt("expires_at", new Date().toISOString())
    .order("requested_placement", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ClassifiedAd[];
}
export async function getPublic(id: string) {
  const { data, error } = await db
    .from("classified_ads")
    .select(fields)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ClassifiedAd | null;
}
export async function listOwner(userId: string) {
  const { data, error } = await db
    .from("classified_ads")
    .select(fields)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ClassifiedAd[];
}
export async function listAdmin() {
  const { data, error } = await db
    .from("classified_ads")
    .select(fields)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ClassifiedAd[];
}
export async function listPricing(all = false) {
  let q = db
    .from("classified_pricing")
    .select(
      "placement,label,description,price_cents,duration_days,active,display_order",
    )
    .order("display_order");
  if (!all) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as ClassifiedPricing[];
}
export async function create(input: ClassifiedInput, userId: string) {
  const { data, error } = await db
    .from("classified_ads")
    .insert({
      ...input,
      created_by: userId,
      status: "pending",
      payment_status: "not_required",
    })
    .select(fields)
    .single();
  if (error) throw error;
  return data as ClassifiedAd;
}
export async function updateOwner(
  id: string,
  changes: Record<string, unknown>,
) {
  const { error } = await db
    .from("classified_ads")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
export async function review(
  id: string,
  decision: string,
  placement: ClassifiedPlacement,
  price: number | null,
  notes: string,
) {
  const { error } = await db.rpc("review_classified", {
    classified_id: id,
    decision,
      requested_placement_input: placement,
    final_price_cents: price,
    review_notes: notes || null,
  });
  if (error) throw error;
}
export async function updatePricing(
  placement: ClassifiedPlacement,
  changes: Record<string, unknown>,
) {
  const { error } = await db
    .from("classified_pricing")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("placement", placement);
  if (error) throw error;
}
export async function report(
  classifiedId: string,
  userId: string,
  email: string,
  reason: string,
  details: string,
) {
  const { error } = await db
    .from("classified_reports")
    .insert({
      classified_id: classifiedId,
      reporter_user_id: userId,
      reporter_email: email,
      reason,
      details: details || null,
    });
  if (error) throw error;
}
export async function uploadImage(file: File, userId: string) {
  const safe = file.name.replace(/[^a-z0-9._-]/gi, "-");
  const path = `classifieds/${userId}/${crypto.randomUUID()}-${safe}`;
  const result = await db.storage
    .from("event-posters")
    .upload(path, file, { upsert: false });
  if (result.error) throw result.error;
  return db.storage.from("event-posters").getPublicUrl(path).data.publicUrl;
}
