import { NextResponse } from "next/server";

type PlaylistConfig = { id?: string; title?: string };

function parseConfiguredPlaylists() {
  const rawJson = process.env.YOUTUBE_FEATURED_PLAYLISTS || "";
  const rawIds = process.env.YOUTUBE_PLAYLIST_IDS || "";
  if (rawJson.trim()) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) return parsed as PlaylistConfig[];
    } catch {}
  }
  if (!rawIds.trim()) return [];
  return rawIds.split(",").map((id) => ({ id: id.trim() })).filter((item) => item.id);
}

function titleMatches(title: string, wanted?: string) {
  if (!wanted) return true;
  return title.toLowerCase().includes(wanted.toLowerCase());
}

async function getPlaylistVideos(apiKey: string, playlistId: string, maxResults: number) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);
  const response = await fetch(url.toString(), { next: { revalidate: 1800 } });
  const result = await response.json();
  if (!response.ok) return [];
  return (result.items || []).map((item: any) => {
    const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId || "";
    return {
      id: videoId,
      title: item?.snippet?.title || "Seattle Desi TV Video",
      description: item?.snippet?.description || "",
      thumbnail: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || "",
      publishedAt: item?.contentDetails?.videoPublishedAt || item?.snippet?.publishedAt || "",
      url: videoId ? `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}` : `https://www.youtube.com/playlist?list=${playlistId}`,
    };
  }).filter((video: any) => video.id && video.title !== "Private video" && video.title !== "Deleted video");
}

async function getChannelPlaylists(apiKey: string, channelId: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("maxResults", "25");
  url.searchParams.set("key", apiKey);
  const response = await fetch(url.toString(), { next: { revalidate: 1800 } });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "YouTube playlist request failed.");
  return (result.items || []).map((item: any) => ({
    id: item?.id || "",
    title: item?.snippet?.title || "Seattle Desi TV Playlist",
    description: item?.snippet?.description || "",
    thumbnail: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || "",
    itemCount: item?.contentDetails?.itemCount || 0,
    url: item?.id ? `https://www.youtube.com/playlist?list=${item.id}` : "https://www.youtube.com/@SeattleDesiTV/playlists",
  })).filter((playlist: any) => playlist.id);
}

export async function GET(request: Request) {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "";
  const channelId = process.env.YOUTUBE_CHANNEL_ID || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || "";
  const { searchParams } = new URL(request.url);
  const perPlaylist = Math.max(1, Math.min(6, Number(searchParams.get("perPlaylist") || 4)));

  if (!apiKey || !channelId) {
    return NextResponse.json({ ok: false, playlists: [], error: "YouTube API key or channel ID is not configured." }, { status: 200 });
  }

  try {
    const configured = parseConfiguredPlaylists();
    let playlists = await getChannelPlaylists(apiKey, channelId);

    if (configured.length > 0) {
      playlists = configured.map((config) => {
        const match = config.id
          ? playlists.find((playlist: any) => playlist.id === config.id)
          : playlists.find((playlist: any) => titleMatches(playlist.title, config.title));
        return match || null;
      }).filter(Boolean);
    } else {
      const preferred = ["chai", "trail", "trailblazer", "trailblazers"];
      const preferredPlaylists = playlists.filter((playlist: any) => preferred.some((word) => playlist.title.toLowerCase().includes(word)));
      playlists = preferredPlaylists.length ? preferredPlaylists : playlists.slice(0, 4);
    }

    const hydrated = await Promise.all(playlists.slice(0, 6).map(async (playlist: any) => ({
      ...playlist,
      videos: await getPlaylistVideos(apiKey, playlist.id, perPlaylist),
    })));

    return NextResponse.json({ ok: true, playlists: hydrated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, playlists: [], error: error?.message || "Could not load YouTube playlists." }, { status: 200 });
  }
}
