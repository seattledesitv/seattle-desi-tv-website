import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";
import { resolveCurrentSite } from "../../../../lib/sites/siteResolver";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function clean(value?: string) { return String(value || "").trim().replace(/^["']|["']$/g, ""); }
function siteEnvironment(name: string, siteCode: string) {
  const scoped = clean(process.env[`${name}_${siteCode.toUpperCase()}`]);
  return scoped || (siteCode === "sea" ? clean(process.env[name]) : "");
}
async function json(url: URL) {
  const response = await fetch(url.toString(), { cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || `${response.status} request failed.`);
  return body;
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !anonKey) return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 500 });
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: request.headers.get("authorization") || "" } } });
    const userResult = await sessionClient.auth.getUser();
    const user = userResult.data?.user || null;
    if (!user) return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(sessionClient, user);
    if (!isAdminRole(role)) return NextResponse.json({ ok: false, error: "Studio admin access required." }, { status: 403 });
    if (!serviceKey) return NextResponse.json({ ok: false, error: "Supabase server key is not configured." }, { status: 500 });

    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ ok: false, error: "Site context is not configured." }, { status: 500 });
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const existingResult = await db.from("social_media_stats").select("platform,followers,views,videos,href").eq("site_id", site.id);
    if (existingResult.error) throw existingResult.error;
    const existing = new Map((existingResult.data || []).map((row: any) => [String(row.platform).toLowerCase(), row]));
    const updates: any[] = [];
    const results: Array<{ platform: string; ok: boolean; message: string; followers?: number; views?: number; videos?: number }> = [];
    const updatedAt = new Date().toISOString();

    const youtubeApiKey = siteEnvironment("YOUTUBE_API_KEY", site.code) || siteEnvironment("NEXT_PUBLIC_YOUTUBE_API_KEY", site.code);
    const youtubeChannelId = siteEnvironment("YOUTUBE_CHANNEL_ID", site.code) || siteEnvironment("NEXT_PUBLIC_YOUTUBE_CHANNEL_ID", site.code);
    if (youtubeApiKey && youtubeChannelId) {
      try {
        const url = new URL("https://www.googleapis.com/youtube/v3/channels");
        url.searchParams.set("part", "statistics"); url.searchParams.set("id", youtubeChannelId); url.searchParams.set("key", youtubeApiKey);
        const body = await json(url); const stats = body?.items?.[0]?.statistics;
        if (!stats) throw new Error("The configured YouTube channel was not found.");
        const previous: any = existing.get("youtube") || {};
        const followers = Number(stats.subscriberCount || 0); const views = Number(stats.viewCount || 0); const videos = Number(stats.videoCount || 0);
        updates.push({ site_id: site.id, platform: "YouTube", followers, views, videos, href: previous.href || `https://www.youtube.com/channel/${youtubeChannelId}`, updated_at: updatedAt });
        results.push({ platform: "YouTube", ok: true, message: "Channel statistics refreshed.", followers, views, videos });
      } catch (error: any) { results.push({ platform: "YouTube", ok: false, message: error?.message || "YouTube refresh failed." }); }
    } else results.push({ platform: "YouTube", ok: false, message: `YouTube credentials are not configured for ${site.code.toUpperCase()}.` });

    const instagramToken = siteEnvironment("INSTAGRAM_ACCESS_TOKEN", site.code) || siteEnvironment("META_INSTAGRAM_ACCESS_TOKEN", site.code);
    const instagramAccountId = siteEnvironment("INSTAGRAM_BUSINESS_ACCOUNT_ID", site.code) || siteEnvironment("META_INSTAGRAM_BUSINESS_ACCOUNT_ID", site.code);
    if (instagramToken) {
      try {
        const loginApi = instagramToken.startsWith("IG");
        if (!loginApi && !instagramAccountId) throw new Error("Instagram Business Account ID is missing.");
        const url = loginApi ? new URL("https://graph.instagram.com/v23.0/me") : new URL(`https://graph.facebook.com/v21.0/${instagramAccountId}`);
        url.searchParams.set("fields", "username,followers_count,media_count"); url.searchParams.set("access_token", instagramToken);
        const body = await json(url); const previous: any = existing.get("instagram") || {};
        const followers = Number(body.followers_count || 0); const videos = Number(body.media_count || 0); const views = Number(previous.views || 0);
        updates.push({ site_id: site.id, platform: "Instagram", followers, views, videos, href: previous.href || (body.username ? `https://instagram.com/${body.username}` : null), updated_at: updatedAt });
        results.push({ platform: "Instagram", ok: true, message: "Professional account statistics refreshed.", followers, views, videos });
      } catch (error: any) { results.push({ platform: "Instagram", ok: false, message: error?.message || "Instagram refresh failed." }); }
    } else results.push({ platform: "Instagram", ok: false, message: `Instagram credentials are not configured for ${site.code.toUpperCase()}.` });

    if (updates.length) {
      const updateResult = await db.from("social_media_stats").upsert(updates, { onConflict: "site_id,platform" });
      if (updateResult.error) throw updateResult.error;
    }
    return NextResponse.json({ ok: updates.length > 0, site: site.code, updatedAt, updated: updates.length, results });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Social statistics refresh failed." }, { status: 500 });
  }
}
