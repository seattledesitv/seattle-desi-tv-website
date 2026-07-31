export type LatestYoutubeVideo = {
  id: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  publishedAt?: string;
  url?: string;
};

export type LatestInstagramPost = {
  id: string;
  caption?: string;
  mediaType?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
};

export async function listLatestYoutubeVideos(): Promise<LatestYoutubeVideo[]> {
  const response = await fetch("/api/youtube/latest", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the latest YouTube videos.");
  const result = await response.json();
  if (!result?.ok) throw new Error(result?.error || "YouTube feed is unavailable.");
  return Array.isArray(result.videos) ? result.videos : [];
}

export async function listLatestInstagramPosts(limit = 6): Promise<LatestInstagramPost[]> {
  const response = await fetch(`/api/instagram/latest?limit=${limit}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the latest Instagram posts.");
  const result = await response.json();
  if (!result?.ok) throw new Error(result?.error || "Instagram feed is unavailable.");
  return Array.isArray(result.posts) ? result.posts : [];
}
