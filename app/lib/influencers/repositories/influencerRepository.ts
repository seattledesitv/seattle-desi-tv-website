import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type { InfluencerAdminInput, InfluencerProfile } from "../types";

const fields = "id,site_id,user_id,email,full_name,city,bio,instagram_url,tiktok_url,youtube_url,website_url,photo_url,niche,follower_count,status,public_listing,created_at,updated_at";

export async function listAdmin(siteId: string) {
  const { data, error } = await getSupabaseBrowserClient().from("influencer_profiles").select(fields).eq("site_id", siteId).order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data || []) as InfluencerProfile[];
}

export async function createAdmin(input: InfluencerAdminInput, approvedBy: string, siteId: string) {
  const now = new Date().toISOString();
  const approved = input.status === "approved";
  const { data, error } = await getSupabaseBrowserClient().from("influencer_profiles").insert({
    ...input,
    site_id: siteId,
    user_id: null,
    public_listing: approved && input.public_listing,
    approved_by: approved ? approvedBy : null,
    approved_at: approved ? now : null,
    updated_at: now,
  }).select(fields).single();
  if (error) throw error;
  return data as InfluencerProfile;
}

export async function updateAdmin(id: string, changes: Record<string, unknown>, siteId: string) {
  const { error } = await getSupabaseBrowserClient().from("influencer_profiles").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id).eq("site_id", siteId);
  if (error) throw error;
}
