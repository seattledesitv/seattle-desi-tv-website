import { createClient } from "@supabase/supabase-js";
import type { SeoEntityKind } from "./types";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const entityColumns: Record<SeoEntityKind, string> = {
  event: "id,title,description,date,location,image,image_urls,created_at",
  business: "id,name,address,website,category,discount,offer,image,image_urls,created_at",
  classified: "id,title,description,location,image_urls,price_cents,updated_at,created_at,starts_at",
  organization: "id,name,description,location,image,updated_at,created_at",
  press_release: "id,title,summary,organization_name,location,release_date,image_urls,published_at,updated_at",
  publication: "id,name,description,edition_label,cover_image_url,created_at,updated_at",
};

const entityTables: Record<SeoEntityKind, string> = {
  event: "events",
  business: "local_businesses",
  classified: "classified_ads",
  organization: "community_organizations",
  press_release: "press_releases",
  publication: "publications",
};

export async function getPublicEntity(kind: SeoEntityKind, id: string, siteId?: string | null) {
  const db = client();
  if (!db || !id) return null;
  let query = db.from(entityTables[kind]).select(entityColumns[kind]).eq("id", id);
  if ((kind === "event" || kind === "business" || kind === "organization") && siteId) query = query.eq("site_id", siteId);
  if (kind === "event") query = query.or("approved.eq.true,status.eq.approved");
  if (kind === "business") query = query.eq("status", "approved");
  const { data, error } = await query.maybeSingle();
  if (error) return null;
  return data as unknown as Record<string, unknown> | null;
}

async function list(table: string, columns: string, siteId?: string | null) {
  const db = client();
  if (!db) return [];
  let query = db.from(table).select(columns).limit(5000);
  if (["events", "local_businesses", "community_organizations"].includes(table) && siteId) query = query.eq("site_id", siteId);
  if (table === "events") query = query.or("approved.eq.true,status.eq.approved");
  if (table === "local_businesses") query = query.eq("status", "approved");
  const { data, error } = await query;
  return error ? [] : (data || []) as unknown as Array<Record<string, unknown>>;
}

export async function listPublicEntities(siteId?: string | null) {
  const [events, businesses, classifieds, organizations, releases, publications] = await Promise.all([
    list("events", "id,title,created_at", siteId),
    list("local_businesses", "id,name,created_at", siteId),
    list("classified_ads", "id,title,updated_at"),
    list("community_organizations", "id,name,updated_at", siteId),
    list("press_releases", "id,title,updated_at"),
    list("publications", "id,name,updated_at"),
  ]);
  return { events, businesses, classifieds, organizations, releases, publications };
}
