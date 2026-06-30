import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function cleanEnv(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function getInstagramConfig() {
  const accessToken = cleanEnv(process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_INSTAGRAM_ACCESS_TOKEN || "");
  const instagramBusinessAccountId = cleanEnv(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID || "");
  const isInstagramLoginToken = accessToken.startsWith("IG");
  const graphBase = isInstagramLoginToken ? "https://graph.instagram.com/v23.0" : "https://graph.facebook.com/v21.0";
  const actorId = isInstagramLoginToken ? "me" : instagramBusinessAccountId;
  return { accessToken, instagramBusinessAccountId, isInstagramLoginToken, graphBase, actorId };
}

async function postToGraph(url: URL) {
  const response = await fetch(url.toString(), { method: "POST", cache: "no-store" });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error?.message || `Instagram API request failed with status ${response.status}.`);
  }
  return result;
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await sessionClient.auth.getUser();
    const user = userData?.user || null;
    if (userError || !user) return NextResponse.json({ error: "Login required." }, { status: 401 });

    const resolvedRole = await resolveUserRole(sessionClient, user);
    if (!isAdminRole(resolvedRole)) return NextResponse.json({ error: `Studio admin access required. Resolved role: ${resolvedRole}.` }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const imageUrl = String(body.imageUrl || "").trim();
    const caption = String(body.caption || "").trim();

    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
      return NextResponse.json({ error: "A public HTTPS image URL is required for this first Instagram publish test." }, { status: 400 });
    }
    if (!caption) return NextResponse.json({ error: "Caption is required." }, { status: 400 });

    const { accessToken, instagramBusinessAccountId, isInstagramLoginToken, graphBase, actorId } = getInstagramConfig();
    if (!accessToken) return NextResponse.json({ error: "Instagram access token is not configured in Vercel." }, { status: 500 });
    if (!isInstagramLoginToken && !instagramBusinessAccountId) {
      return NextResponse.json({ error: "INSTAGRAM_BUSINESS_ACCOUNT_ID is required for Facebook Graph tokens." }, { status: 500 });
    }

    const createContainerUrl = new URL(`${graphBase}/${actorId}/media`);
    createContainerUrl.searchParams.set("image_url", imageUrl);
    createContainerUrl.searchParams.set("caption", caption);
    createContainerUrl.searchParams.set("access_token", accessToken);

    const container = await postToGraph(createContainerUrl);
    const creationId = container?.id;
    if (!creationId) throw new Error("Instagram did not return a media creation ID.");

    const publishUrl = new URL(`${graphBase}/${actorId}/media_publish`);
    publishUrl.searchParams.set("creation_id", creationId);
    publishUrl.searchParams.set("access_token", accessToken);

    const published = await postToGraph(publishUrl);
    const mediaId = published?.id || "";

    let permalink = "";
    if (mediaId) {
      try {
        const mediaUrl = new URL(`${graphBase}/${mediaId}`);
        mediaUrl.searchParams.set("fields", "id,permalink");
        mediaUrl.searchParams.set("access_token", accessToken);
        const mediaResponse = await fetch(mediaUrl.toString(), { cache: "no-store" });
        const media = await mediaResponse.json().catch(() => null);
        permalink = media?.permalink || "";
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      message: "Published to Instagram.",
      source: isInstagramLoginToken ? "instagram-login" : "facebook-graph",
      creationId,
      mediaId,
      permalink,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Instagram publish failed." }, { status: 500 });
  }
}
