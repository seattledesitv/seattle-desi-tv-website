import { NextResponse } from "next/server";

function normalizeLimit(value: string | null) {
  const parsed = Number(value || 6);
  if (!Number.isFinite(parsed)) return 6;
  return Math.max(1, Math.min(12, Math.floor(parsed)));
}

function looksLikeInstagramLoginToken(token: string) {
  return token.trim().startsWith("IG");
}

function toPost(item: any) {
  const mediaType = String(item?.media_type || "").toUpperCase();
  const mediaUrl = mediaType === "VIDEO" ? (item?.thumbnail_url || item?.media_url || "") : (item?.media_url || item?.thumbnail_url || "");
  return {
    id: item?.id || "",
    caption: item?.caption || "",
    mediaType,
    mediaUrl,
    thumbnailUrl: item?.thumbnail_url || mediaUrl,
    permalink: item?.permalink || "https://www.instagram.com/seattledesitv/",
    timestamp: item?.timestamp || "",
    username: item?.username || "seattledesitv",
  };
}

export async function GET(request: Request) {
  const rawToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_INSTAGRAM_ACCESS_TOKEN || "";
  const accessToken = rawToken.trim().replace(/^['\"]|['\"]$/g, "");
  const instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID || "";
  const { searchParams } = new URL(request.url);
  const limit = normalizeLimit(searchParams.get("limit"));

  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      posts: [],
      error: "Instagram API is not configured. Add INSTAGRAM_ACCESS_TOKEN in Vercel environment variables.",
    }, { status: 200 });
  }

  try {
    // Tokens generated from the new Instagram API with Instagram Login usually start with IG
    // and must be used with graph.instagram.com/me/media. Older Facebook-login/Page tokens
    // use graph.facebook.com/{instagram-business-account-id}/media.
    const useInstagramLoginApi = looksLikeInstagramLoginToken(accessToken);
    const url = useInstagramLoginApi
      ? new URL("https://graph.instagram.com/v23.0/me/media")
      : new URL(`https://graph.facebook.com/v21.0/${instagramBusinessAccountId}/media`);

    if (!useInstagramLoginApi && !instagramBusinessAccountId) {
      return NextResponse.json({
        ok: false,
        posts: [],
        error: "Instagram Business Account ID is required for Facebook Graph tokens. Add INSTAGRAM_BUSINESS_ACCOUNT_ID or use an IG access token.",
      }, { status: 200 });
    }

    url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString(), { next: { revalidate: 900 } });
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ ok: false, posts: [], error: result?.error?.message || "Instagram API request failed." }, { status: 200 });
    }

    const posts = (result?.data || []).map(toPost).filter((post: any) => post.id && post.permalink);
    return NextResponse.json({ ok: true, posts, source: useInstagramLoginApi ? "instagram-login" : "facebook-graph" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, posts: [], error: error?.message || "Could not load Instagram posts." }, { status: 200 });
  }
}
