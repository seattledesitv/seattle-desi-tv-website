import type { SupabaseClient } from "@supabase/supabase-js";

export type InstagramPublishResult = { mediaId: string; permalink?: string; message: string };

export async function publishInstagramCarousel(supabase: SupabaseClient, publicationId: string, imageUrls: string[], caption: string): Promise<InstagramPublishResult> {
  if (!imageUrls.length || imageUrls.some((url) => !url.startsWith("https://"))) throw new Error("Upload every carousel image before publishing.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Sign in again before publishing.");
  const response = await fetch("/api/instagram/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ publicationId, imageUrls, caption }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Instagram publishing failed.");
  return result as InstagramPublishResult;
}
