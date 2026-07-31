import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";

async function linkedInJson(url: string, accessToken: string, version: string, init: RequestInit) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": version, "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" });
  const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result?.message || result?.errorDetails?.message || `LinkedIn request failed (${response.status}).`); return { response, result };
}

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
    if (publication?.status !== "published") return NextResponse.json({ error: "Publish the website edition before announcing it on LinkedIn." }, { status: 409 });
    if (!imageUrl.startsWith("https://") || !caption) return NextResponse.json({ error: "A public HTTPS image and caption are required." }, { status: 400 });
    const accessToken = (process.env.LINKEDIN_ACCESS_TOKEN || "").trim(); const author = (process.env.LINKEDIN_AUTHOR_URN || "").trim(); const version = (process.env.LINKEDIN_API_VERSION || "").trim();
    if (!accessToken || !author || !version) return NextResponse.json({ error: "LinkedIn publishing is not configured. Add LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR_URN, and a supported LINKEDIN_API_VERSION in Vercel." }, { status: 500 });
    const initialized = await linkedInJson("https://api.linkedin.com/rest/images?action=initializeUpload", accessToken, version, { method: "POST", body: JSON.stringify({ initializeUploadRequest: { owner: author } }) });
    const uploadUrl = initialized.result?.value?.uploadUrl; const image = initialized.result?.value?.image; if (!uploadUrl || !image) throw new Error("LinkedIn did not return an image upload target.");
    const source = await fetch(imageUrl); if (!source.ok) throw new Error("Could not download the launch image for LinkedIn."); const upload = await fetch(uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": source.headers.get("content-type") || "image/png" }, body: await source.arrayBuffer() }); if (!upload.ok) throw new Error(`LinkedIn image upload failed (${upload.status}).`);
    const created = await linkedInJson("https://api.linkedin.com/rest/posts", accessToken, version, { method: "POST", body: JSON.stringify({ author, commentary: caption, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, content: { media: { id: image, altText: "Seattle Desi TV publication launch" } }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false }) });
    return NextResponse.json({ ok: true, message: "Published to LinkedIn.", postId: created.response.headers.get("x-restli-id") || "" });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "LinkedIn publishing failed." }, { status: 500 }); }
}
