import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

type CheckResult = {
  ok: boolean;
  status?: number;
  message?: string;
  data?: any;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function cleanToken(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function getTokenInfo() {
  const primary = cleanToken(process.env.INSTAGRAM_ACCESS_TOKEN || "");
  const fallback = cleanToken(process.env.META_INSTAGRAM_ACCESS_TOKEN || "");
  const token = primary || fallback;
  const source = primary ? "INSTAGRAM_ACCESS_TOKEN" : fallback ? "META_INSTAGRAM_ACCESS_TOKEN" : "none";
  return { token, source, primaryConfigured: Boolean(primary), fallbackConfigured: Boolean(fallback) };
}

function maskToken(token: string) {
  if (!token) return { prefix: "", suffix: "", length: 0, tokenType: "missing" };
  return {
    prefix: token.slice(0, 8),
    suffix: token.slice(-4),
    length: token.length,
    tokenType: token.startsWith("IG") ? "instagram-login" : "facebook-graph",
  };
}

async function fetchJson(url: URL): Promise<CheckResult> {
  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) return { ok: false, status: response.status, message: data?.error?.message || "Request failed.", data };
    return { ok: true, status: response.status, data };
  } catch (error: any) {
    return { ok: false, message: error?.message || "Request failed." };
  }
}

async function requireAdmin(request: Request) {
  if (!supabaseUrl || !anonKey) return { ok: false as const, response: NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 500 }) };
  const authHeader = request.headers.get("authorization") || "";
  const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await sessionClient.auth.getUser();
  const user = data?.user || null;
  if (error || !user) return { ok: false as const, response: NextResponse.json({ ok: false, error: "Login required." }, { status: 401 }) };
  const role = await resolveUserRole(sessionClient, user);
  if (!isAdminRole(role)) return { ok: false as const, response: NextResponse.json({ ok: false, error: `Studio admin access required. Resolved role: ${role}.` }, { status: 403 }) };
  return { ok: true as const, user, role };
}

export async function GET() {
  const { token, source, primaryConfigured, fallbackConfigured } = getTokenInfo();
  const instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID || "";
  const masked = maskToken(token);
  const generatedAt = new Date().toISOString();

  if (!token) {
    return NextResponse.json({
      ok: false,
      generatedAt,
      config: { tokenSource: source, primaryConfigured, fallbackConfigured, instagramBusinessAccountIdConfigured: Boolean(instagramBusinessAccountId), instagramBusinessAccountId },
      token: masked,
      checks: { profile: { ok: false, message: "No Instagram token configured." }, media: { ok: false, message: "No Instagram token configured." } },
    }, { status: 200 });
  }

  const isInstagramLogin = token.startsWith("IG");
  const profileUrl = isInstagramLogin
    ? new URL("https://graph.instagram.com/me")
    : new URL(`https://graph.facebook.com/v21.0/${instagramBusinessAccountId || "me"}`);
  profileUrl.searchParams.set("fields", isInstagramLogin ? "user_id,username" : "id,username");
  profileUrl.searchParams.set("access_token", token);

  const mediaUrl = isInstagramLogin
    ? new URL("https://graph.instagram.com/me/media")
    : new URL(`https://graph.facebook.com/v21.0/${instagramBusinessAccountId}/media`);
  mediaUrl.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username");
  mediaUrl.searchParams.set("limit", "3");
  mediaUrl.searchParams.set("access_token", token);

  const [profile, media] = await Promise.all([
    fetchJson(profileUrl),
    !isInstagramLogin && !instagramBusinessAccountId
      ? Promise.resolve({ ok: false, message: "INSTAGRAM_BUSINESS_ACCOUNT_ID is required for Facebook Graph tokens." } as CheckResult)
      : fetchJson(mediaUrl),
  ]);

  const samplePosts = Array.isArray(media.data?.data)
    ? media.data.data.map((item: any) => ({ id: item.id, mediaType: item.media_type, timestamp: item.timestamp, hasMediaUrl: Boolean(item.media_url || item.thumbnail_url), permalink: item.permalink })).slice(0, 3)
    : [];

  return NextResponse.json({
    ok: Boolean(profile.ok && media.ok),
    generatedAt,
    config: {
      tokenSource: source,
      primaryConfigured,
      fallbackConfigured,
      warning: primaryConfigured && fallbackConfigured ? "Both INSTAGRAM_ACCESS_TOKEN and META_INSTAGRAM_ACCESS_TOKEN are set. INSTAGRAM_ACCESS_TOKEN wins." : "",
      instagramBusinessAccountIdConfigured: Boolean(instagramBusinessAccountId),
      instagramBusinessAccountId,
      endpointMode: isInstagramLogin ? "graph.instagram.com/me/media" : "graph.facebook.com/{instagramBusinessAccountId}/media",
    },
    token: masked,
    checks: {
      profile: {
        ok: profile.ok,
        status: profile.status,
        message: profile.message || "Profile check passed.",
        username: profile.data?.username,
        userId: profile.data?.user_id || profile.data?.id,
      },
      media: {
        ok: media.ok,
        status: media.status,
        message: media.message || "Media check passed.",
        returnedCount: Array.isArray(media.data?.data) ? media.data.data.length : 0,
        samplePosts,
      },
    },
  }, { status: 200 });
}

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => ({}));
    const imageUrl = String(body.imageUrl || "").trim();
    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
      return NextResponse.json({ ok: false, error: "Enter a public HTTPS image URL to test post creation." }, { status: 400 });
    }

    const { token } = getTokenInfo();
    const instagramBusinessAccountId = cleanToken(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID || "");
    if (!token) return NextResponse.json({ ok: false, error: "Instagram access token is not configured." }, { status: 500 });

    const isInstagramLogin = token.startsWith("IG");
    const graphBase = isInstagramLogin ? "https://graph.instagram.com/v23.0" : "https://graph.facebook.com/v21.0";
    const actorId = isInstagramLogin ? "me" : instagramBusinessAccountId;
    if (!actorId) return NextResponse.json({ ok: false, error: "Instagram business account ID is required." }, { status: 500 });

    const createUrl = new URL(`${graphBase}/${actorId}/media`);
    createUrl.searchParams.set("image_url", imageUrl);
    createUrl.searchParams.set("caption", "SDTV Instagram diagnostics — unpublished media container test.");
    createUrl.searchParams.set("access_token", token);

    const createResponse = await fetch(createUrl.toString(), { method: "POST", cache: "no-store" });
    const created = await createResponse.json().catch(() => null);
    if (!createResponse.ok || !created?.id) {
      return NextResponse.json({
        ok: false,
        status: createResponse.status,
        error: created?.error?.message || "Instagram did not return a media creation ID.",
        graphCode: created?.error?.code,
        graphSubcode: created?.error?.error_subcode,
        imageUrl,
      }, { status: 200 });
    }

    const creationId = created.id;
    const statusUrl = new URL(`${graphBase}/${creationId}`);
    statusUrl.searchParams.set("fields", "id,status_code");
    statusUrl.searchParams.set("access_token", token);
    const statusResponse = await fetch(statusUrl.toString(), { cache: "no-store" });
    const statusData = await statusResponse.json().catch(() => null);

    return NextResponse.json({
      ok: true,
      message: "Instagram accepted the image and returned a media creation ID. Nothing was published.",
      creationId,
      containerStatus: statusData?.status_code || "CREATED",
      statusCheckOk: statusResponse.ok,
      source: isInstagramLogin ? "instagram-login" : "facebook-graph",
      imageUrl,
      published: false,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Post creation diagnostic failed." }, { status: 500 });
  }
}
