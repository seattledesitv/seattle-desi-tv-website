import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "";
  const channelId = process.env.YOUTUBE_CHANNEL_ID || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || "";

  if (!apiKey || !channelId) {
    return NextResponse.json({ ok: false, videos: [], error: "YouTube API key or channel ID is not configured." }, { status: 200 });
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("channelId", channelId);
    url.searchParams.set("maxResults", "6");
    url.searchParams.set("order", "date");
    url.searchParams.set("type", "video");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), { next: { revalidate: 900 } });
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ ok: false, videos: [], error: result?.error?.message || "YouTube API request failed." }, { status: 200 });
    }

    const videos = (result.items || []).map((item: any) => ({
      id: item?.id?.videoId || "",
      title: item?.snippet?.title || "Seattle Desi TV Video",
      description: item?.snippet?.description || "",
      thumbnail: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || "",
      publishedAt: item?.snippet?.publishedAt || "",
      url: item?.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : "https://www.youtube.com/@SeattleDesiTV/videos",
    })).filter((video: any) => video.id);

    return NextResponse.json({ ok: true, videos });
  } catch (error: any) {
    return NextResponse.json({ ok: false, videos: [], error: error?.message || "Could not load YouTube videos." }, { status: 200 });
  }
}
