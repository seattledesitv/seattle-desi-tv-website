import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type {
  MatrimonyAccessRequest,
  MatrimonyContact,
  MatrimonyPricing,
  MatrimonyProfile,
  MatrimonyProfileInput,
} from "../types";
const db = getSupabaseBrowserClient();
const profileFields =
  "id,site_id,owner_user_id,display_name,birth_year,gender,seeking,marital_status,religion,community,languages,education,occupation,city,state_region,country,about,partner_preferences,photo_paths,status,admin_notes,consent_confirmed,created_at,updated_at";
const accessFields =
  "id,site_id,requester_user_id,requester_email,reason,status,quoted_price_cents,duration_days,payment_status,payment_link,payment_reference,access_starts_at,access_expires_at,admin_notes,created_at,updated_at";

export async function getOwnProfile(userId: string, siteId: string) {
  const { data, error } = await db
    .from("matrimony_profiles")
    .select(
      `${profileFields},contact:matrimony_profile_contacts(profile_id,full_name,email,phone,preferred_contact)`,
    )
    .eq("owner_user_id", userId)
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as
    (MatrimonyProfile & { contact: MatrimonyContact | null }) | null;
}
export async function listVisibleProfiles(siteId: string) {
  const { data, error } = await db
    .from("matrimony_profiles")
    .select(profileFields)
    .eq("site_id", siteId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as MatrimonyProfile[];
}
export async function listAdminProfiles(siteId: string) {
  const { data, error } = await db
    .from("matrimony_profiles")
    .select(
      `${profileFields},contact:matrimony_profile_contacts(profile_id,full_name,email,phone,preferred_contact)`,
    )
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Array<
    MatrimonyProfile & { contact: MatrimonyContact | null }
  >;
}
export async function saveProfile(
  input: MatrimonyProfileInput,
  userId: string,
  siteId: string,
  profileId?: string,
) {
  const { contact, ...profile } = input;
  let id = profileId;
  if (id) {
    const { error } = await db
      .from("matrimony_profiles")
      .update({
        ...profile,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("site_id", siteId);
    if (error) throw error;
  } else {
    const { data, error } = await db
      .from("matrimony_profiles")
      .insert({
        ...profile,
        site_id: siteId,
        owner_user_id: userId,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }
  const { error: contactError } = await db
    .from("matrimony_profile_contacts")
    .upsert(
      { ...contact, profile_id: id, owner_user_id: userId },
      { onConflict: "profile_id" },
    );
  if (contactError) throw contactError;
  return id!;
}
export async function getOwnAccess(userId: string, siteId: string) {
  const { data, error } = await db
    .from("matrimony_access_requests")
    .select(accessFields)
    .eq("requester_user_id", userId)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as MatrimonyAccessRequest | null;
}
export async function listAdminAccess(siteId: string) {
  const { data, error } = await db
    .from("matrimony_access_requests")
    .select(accessFields)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as MatrimonyAccessRequest[];
}
export async function createAccess(
  _userId: string,
  email: string,
  reason: string,
  siteId: string,
) {
  const { error } = await db.rpc("submit_matrimony_access_request", {
    requester_email_input: email,
    reason_input: reason.trim(),
    site_id_input: siteId,
  });
  if (error) throw error;
}
export async function getPricing(admin = false) {
  let query = db
    .from("matrimony_access_pricing")
    .select(
      "plan_key,label,description,price_cents,duration_days,active,updated_at",
    );
  if (!admin) query = query.eq("active", true);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as MatrimonyPricing | null;
}
export async function updatePricing(changes: Partial<MatrimonyPricing>) {
  const { error } = await db
    .from("matrimony_access_pricing")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("plan_key", "standard_access");
  if (error) throw error;
}
export async function reviewProfile(
  id: string,
  decision: string,
  notes: string,
  siteId: string,
) {
  const target = await db
    .from("matrimony_profiles")
    .select("id")
    .eq("id", id)
    .eq("site_id", siteId)
    .maybeSingle();
  if (target.error) throw target.error;
  if (!target.data) throw new Error("Profile not found for this site.");
  const { error } = await db.rpc("review_matrimony_profile", {
    profile_id: id,
    decision,
    notes: notes || null,
    site_id_input: siteId,
  });
  if (error) throw error;
}
export async function reviewAccess(
  id: string,
  decision: string,
  price: number | null,
  duration: number | null,
  notes: string,
  paymentLink: string,
  siteId: string,
) {
  const target = await db
    .from("matrimony_access_requests")
    .select("id")
    .eq("id", id)
    .eq("site_id", siteId)
    .maybeSingle();
  if (target.error) throw target.error;
  if (!target.data) throw new Error("Access request not found for this site.");
  const { error } = await db.rpc("review_matrimony_access", {
    request_id: id,
    decision,
    final_price_cents: price,
    final_duration_days: duration,
    notes: notes || null,
    pay_url: paymentLink || null,
    site_id_input: siteId,
  });
  if (error) throw error;
}
export async function completePayment(
  id: string,
  reference: string,
  siteId: string,
) {
  const target = await db
    .from("matrimony_access_requests")
    .select("id")
    .eq("id", id)
    .eq("site_id", siteId)
    .maybeSingle();
  if (target.error) throw target.error;
  if (!target.data) throw new Error("Access request not found for this site.");
  const { error } = await db.rpc("complete_matrimony_access_payment", {
    request_id: id,
    reference: reference || null,
    site_id_input: siteId,
  });
  if (error) throw error;
}
export async function uploadPhoto(userId: string, file: File) {
  const safe = file.name.replace(/[^a-z0-9._-]/gi, "-");
  const path = `${userId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await db.storage
    .from("matrimony-profile-images")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}
export async function signPhotos(paths: string[]) {
  if (!paths.length) return [];
  const { data, error } = await db.storage
    .from("matrimony-profile-images")
    .createSignedUrls(paths, 3600);
  if (error) throw error;
  return data.map((item) => item.signedUrl);
}
