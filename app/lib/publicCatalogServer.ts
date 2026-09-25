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

export async function getInitialHomepageData(siteId: string | null) {
  const db = publicClient();
  const empty = {
    events: [],
    businesses: [],
    socialRows: [],
    counts: { events: 0, businesses: 0, coverage: 0, team: 0, radio: 0 },
  };
  if (!db) return empty;
  try {
    const today = new Date().toISOString().split("T")[0];
    const eventsQuery = forSite(
      db.from("events").select("id,title,date,location,image,image_urls").eq("status", "approved").gte("date", today).order("date", { ascending: true }).limit(12),
      siteId,
    );
    const businessesQuery = forSite(
      db.from("local_businesses").select("id,name,category,offer,discount,image,image_urls").eq("status", "approved").limit(6),
      siteId,
    );
    const socialQuery = siteId
      ? db.from("social_media_stats").select("platform,followers,views,videos,href").eq("site_id", siteId).order("platform")
      : Promise.resolve({ data: [], error: null });
    const count = async (query: any) => {
      const result = await query;
      return result.error ? 0 : result.count || 0;
    };
    const [eventsResult, businessesResult, socialResult, events, businesses, coverage, team, radio] = await Promise.all([
      eventsQuery,
      businessesQuery,
      socialQuery,
      count(forSite(db.from("events").select("id", { count: "exact", head: true }).eq("status", "approved"), siteId)),
      count(forSite(db.from("local_businesses").select("id", { count: "exact", head: true }).eq("status", "approved"), siteId)),
      count(forSite(db.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("assignment_type", "owner_coverage_request"), siteId)),
      count(forSite(db.from("team_members").select("id", { count: "exact", head: true }), siteId)),
      count(forSite(db.from("radio_team_members").select("id", { count: "exact", head: true }), siteId)),
    ]);
    return {
      events: eventsResult.error ? [] : eventsResult.data || [],
      businesses: businessesResult.error ? [] : businessesResult.data || [],
      socialRows: socialResult.error ? [] : socialResult.data || [],
      counts: { events, businesses, coverage, team, radio },
    };
  } catch {
    return empty;
  }
}
