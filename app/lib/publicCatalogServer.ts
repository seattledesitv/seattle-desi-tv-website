import "server-only";

import { createClient } from "@supabase/supabase-js";

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function forSite<T extends { eq: (column: string, value: string) => T }>(query: T, siteId: string | null) {
  return siteId ? query.eq("site_id", siteId) : query;
}

export async function getInitialPublicEvents(siteId: string | null) {
  const db = publicClient();
  if (!db) return [];
  try {
    const query = db
      .from("events")
      .select("id,title,date,end_date,local_start_time,local_end_time,event_timezone,location,description,image,image_urls,ticket_url,created_by")
      .eq("status", "approved")
      .order("date", { ascending: true });
    const { data, error } = await forSite(query, siteId);
    return error ? [] : data || [];
  } catch {
    // Public rendering must remain available if the database is temporarily unavailable.
    return [];
  }
}

export async function getInitialPublicBusinesses(siteId: string | null) {
  const db = publicClient();
  if (!db) return [];
  try {
    const select = "id,name,address,website,category,discount,offer,image,image_urls,status,created_at,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label";
    const query = db
      .from("local_businesses")
      .select(select)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    const { data, error } = await forSite(query, siteId);
    if (!error) return data || [];

    // Preserve compatibility with databases that have not received premium columns yet.
    if (/is_premium|premium_/i.test(error.message || "")) {
      const fallback = db
        .from("local_businesses")
        .select("id,name,address,website,category,discount,offer,image,image_urls,status,created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      const result = await forSite(fallback, siteId);
      return result.error ? [] : result.data || [];
    }
    return [];
  } catch {
    return [];
  }
}
