import { NextResponse } from "next/server";

type CheckResult = {
  ok: boolean;
  status?: number;
  message?: string;
  data?: any;
};

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
