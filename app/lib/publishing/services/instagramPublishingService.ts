import type { SupabaseClient } from "@supabase/supabase-js";

export type InstagramPublishResult = { mediaId: string; permalink?: string; message: string; recordingWarning?: string };

export type InstagramPublishInput = {
  publicationId?: string;
  pressReleaseId?: string;
  imageUrls: string[];
  caption: string;
};

export async function publishInstagramMedia(supabase: SupabaseClient, input: InstagramPublishInput): Promise<InstagramPublishResult> {
  if (!input.imageUrls.length || input.imageUrls.some((url) => !url.startsWith("https://"))) throw new Error("Upload every carousel image before publishing.");
  if (input.imageUrls.length > 10) throw new Error("Instagram supports no more than 10 images in one carousel.");
  if (!input.caption.trim()) throw new Error("Instagram caption is required.");
  if (input.caption.length > 2200) throw new Error("Instagram captions cannot exceed 2,200 characters.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Sign in again before publishing.");
  const response = await fetch("/api/instagram/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Instagram publishing failed.");
  return result as InstagramPublishResult;
}

export async function publishInstagramCarousel(supabase: SupabaseClient, publicationId: string, imageUrls: string[], caption: string): Promise<InstagramPublishResult> {
  return publishInstagramMedia(supabase, { publicationId, imageUrls, caption });
}
