import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: request.headers.get("authorization") || "" } } });
    const { data } = await sessionClient.auth.getUser(); if (!data.user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    if (!isAdminRole(await resolveUserRole(sessionClient, data.user))) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });
    const body = await request.json().catch(() => ({})); const publicationId = String(body.publicationId || ""); const imageUrl = String(body.imageUrl || ""); const caption = String(body.caption || "").trim();
    const { data: publication, error } = await sessionClient.from("publications").select("status").eq("id", publicationId).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (publication?.status !== "published") return NextResponse.json({ error: "Publish the website edition before announcing it on Facebook." }, { status: 409 });
    if (!imageUrl.startsWith("https://") || !caption) return NextResponse.json({ error: "A public HTTPS image and caption are required." }, { status: 400 });
    const pageId = (process.env.FACEBOOK_PAGE_ID || "").trim(); const accessToken = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || "").trim();
    if (!pageId || !accessToken) return NextResponse.json({ error: "Facebook publishing is not configured. Add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in Vercel." }, { status: 500 });
    const graphVersion = (process.env.META_GRAPH_API_VERSION || "v23.0").trim(); const endpoint = new URL(`https://graph.facebook.com/${graphVersion}/${pageId}/photos`); endpoint.searchParams.set("url", imageUrl); endpoint.searchParams.set("caption", caption); endpoint.searchParams.set("access_token", accessToken);
    const response = await fetch(endpoint, { method: "POST", cache: "no-store" }); const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || "Facebook rejected the post.");
    return NextResponse.json({ ok: true, message: "Published to Facebook.", postId: result.post_id || result.id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Facebook publishing failed." }, { status: 500 }); }
}
