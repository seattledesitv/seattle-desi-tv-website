import "server-only";
import { createClient } from "@supabase/supabase-js";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function listPublishedCommunityStories(siteId: string | null, limit = 24) {
  const client = db();
  if (!client || !siteId) return [];
  const { data, error } = await client.from("community_stories").select("*").eq("site_id", siteId).eq("status", "published").order("published_at", { ascending: false }).limit(limit);
  if (error) return [];
  return data || [];
}

export async function getPublishedCommunityStory(siteId: string | null, slug: string) {
  const client = db();
  if (!client || !siteId) return null;
  const { data } = await client.from("community_stories").select("*").eq("site_id", siteId).eq("slug", slug).eq("status", "published").maybeSingle();
  return data || null;
}
