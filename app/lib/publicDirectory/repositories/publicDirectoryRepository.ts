import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicDirectoryResource } from "../types";

type PageInput = { limit: number; offset: number };

const selections: Record<PublicDirectoryResource, string> = {
  events: "id,title,date,local_start_time,local_end_time,event_timezone,location,description,image,image_urls,ticket_url,created_at",
  businesses: "id,name,address,website,category,discount,offer,image,image_urls,created_at,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label",
  organizations: "id,name,organization_type,category,location,website,description,created_at,image",
  groups: "id,name,platform,category,language,location,description,group_url,created_at",
  influencers: "id,user_id,email,full_name,city,bio,instagram_url,tiktok_url,youtube_url,website_url,photo_url,niche,follower_count,created_at",
};

export async function listApproved(db: SupabaseClient, resource: PublicDirectoryResource, page: PageInput) {
  const table = resource === "businesses" ? "local_businesses"
    : resource === "organizations" ? "community_organizations"
      : resource === "groups" ? "community_groups"
        : resource === "influencers" ? "influencer_profiles"
          : "events";

  let query = db.from(table).select(selections[resource], { count: "exact" }).eq("status", "approved");
  if (resource === "organizations" || resource === "groups") query = query.eq("approved", true);
  if (resource === "influencers") query = query.eq("public_listing", true);
  query = resource === "events"
    ? query.order("date", { ascending: true })
    : query.order(resource === "influencers" ? "full_name" : resource === "businesses" ? "name" : "created_at", { ascending: resource !== "organizations" && resource !== "groups" });

  const { data, error, count } = await query.range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  return { rows: (data || []) as unknown as Record<string, unknown>[], count: count || 0 };
}

export async function listHiddenIdentities(db: SupabaseClient) {
  const [profiles, controls] = await Promise.all([
    db.from("user_profiles").select("user_id,email").eq("public_visibility_disabled", true),
    db.from("public_visibility_controls").select("user_id,email").eq("public_visibility_disabled", true),
  ]);
  const rows = [...(profiles.error ? [] : profiles.data || []), ...(controls.error ? [] : controls.data || [])];
  return {
    userIds: new Set(rows.map((row) => String(row.user_id || "")).filter(Boolean)),
    emails: new Set(rows.map((row) => String(row.email || "").toLowerCase()).filter(Boolean)),
  };
}
