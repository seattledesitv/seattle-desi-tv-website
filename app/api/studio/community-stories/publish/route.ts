import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";
import { resolveSiteForHostname } from "../../../../lib/sites/siteResolver";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data } = await client.auth.getUser();
    const user = data.user;
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(client, user);
    if (!isAdminRole(role)) return NextResponse.json({ error: "Only an SDTV admin can publish a community story." }, { status: 403 });
    const site = await resolveSiteForHostname(request.headers.get("x-forwarded-host") || request.headers.get("host"));
    if (!site.id) return NextResponse.json({ error: "Active site could not be resolved." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const requestId = String(body.requestId || "");
    const target = await client.from("public_content_requests").select("id,site_id,status").eq("id", requestId).eq("site_id", site.id).maybeSingle();
    if (target.error || !target.data) return NextResponse.json({ error: target.error?.message || "Submission not found for this site." }, { status: 404 });
    const result = await client.rpc("publish_community_story", {
      request_id: requestId,
      story_slug: String(body.slug || body.title || ""),
      story_title: String(body.title || ""),
      story_summary: String(body.summary || ""),
      story_body: String(body.storyBody || ""),
      story_author_name: String(body.authorName || ""),
      story_category: String(body.category || "Community Story"),
      story_location: String(body.location || ""),
      story_image_urls: Array.isArray(body.imageUrls) ? body.imageUrls.map(String).filter(Boolean) : [],
      story_video_url: String(body.videoUrl || ""),
      story_source_url: String(body.sourceUrl || ""),
    });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
    const story = Array.isArray(result.data) ? result.data[0] : result.data;
    return NextResponse.json({ ok: true, story, url: `/news/stories/${story?.slug}` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Community story publishing failed." }, { status: 500 });
  }
}
