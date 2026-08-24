import type { SupabaseClient } from "@supabase/supabase-js";
import { publishInstagramMedia } from "../../publishing/services/instagramPublishingService";
import { seoEntityPath } from "../../seo/urls";
import type { PressRelease } from "../types";

const SITE_URL = "https://seattledesitv.com";

export function buildPressReleaseInstagramCaption(release: PressRelease) {
  const publicUrl = `${SITE_URL}${seoEntityPath("press-releases", release.title, release.id)}`;
  return [
    `📣 ${release.title}`,
    release.summary,
    release.organization_name ? `From ${release.organization_name}` : "",
    `Read the complete press release: ${publicUrl}`,
    "#SeattleDesiTV #SeattleCommunity #PressRelease #SeattleDesi",
  ].filter(Boolean).join("\n\n");
}

export async function publishPressReleaseToInstagram(
  supabase: SupabaseClient,
  release: PressRelease,
  imageUrls: string[],
  caption: string,
) {
  if (release.status !== "approved") throw new Error("Approve this press release before posting it to Instagram.");
  return publishInstagramMedia(supabase, { pressReleaseId: release.id, imageUrls, caption });
}
