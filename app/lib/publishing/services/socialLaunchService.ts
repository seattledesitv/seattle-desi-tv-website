import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationPreviewModel } from "../preview/types";

export type SocialLaunchChannel = "instagram" | "facebook" | "linkedin";
export type SocialLaunchAsset = { channel: SocialLaunchChannel; file: File; previewUrl: string };

export const socialLaunchFormats: Record<SocialLaunchChannel, { width: number; height: number; label: string }> = {
  instagram: { width: 1080, height: 1350, label: "Instagram" },
  facebook: { width: 1200, height: 630, label: "Facebook" },
  linkedin: { width: 1200, height: 627, label: "LinkedIn" },
};

export function publicPublicationUrl(publicationId: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin = configured || (typeof window !== "undefined" ? window.location.origin : "https://seattledesitv.com");
  return `${origin}/publications/${publicationId}`;
}

export function defaultSocialLaunchCaptions(model: PublicationPreviewModel) {
  const url = publicPublicationUrl(model.publication.id);
  const title = model.publication.name;
  const edition = model.publication.edition_label ? ` — ${model.publication.edition_label}` : "";
  return {
    instagram: `Our new publication is live! 📖\n\n${title}${edition}\n\nRead the complete edition: ${url}\n\n#SeattleDesiTV #SeattleCommunity #SouthAsianCommunity`,
    facebook: `The latest Seattle Desi TV publication is now live: ${title}${edition}. Discover community stories, events, and opportunities to get involved.\n\nRead it here: ${url}`,
    linkedin: `Seattle Desi TV has launched its latest publication: ${title}${edition}. Explore stories, community highlights, upcoming events, and ways to participate.\n\nRead the publication: ${url}\n\n#CommunityMedia #Seattle #SouthAsianCommunity`,
  } satisfies Record<SocialLaunchChannel, string>;
}

function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.trim().split(/\s+/); const lines: string[] = []; let line = "";
  words.forEach((word) => { const next = line ? `${line} ${word}` : word; if (line && context.measureText(next).width > width) { lines.push(line); line = word; } else line = next; });
  if (line) lines.push(line); return lines;
}

async function loadImage(url: string) {
  const response = await fetch(url); if (!response.ok) throw new Error("Could not load the publication cover image.");
  return createImageBitmap(await response.blob());
}

function canvasFile(canvas: HTMLCanvasElement, channel: SocialLaunchChannel) {
  return new Promise<File>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(new File([blob], `sdtv-${channel}-publication-launch.png`, { type: "image/png" })) : reject(new Error("Could not create the social image.")), "image/png"));
}

export async function renderSocialLaunchImage(model: PublicationPreviewModel, channel: SocialLaunchChannel) {
  const { width, height } = socialLaunchFormats[channel]; const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Image generation is unavailable in this browser.");
  const cover = model.publication.cover_image_url || model.sections.find((section) => section.section_key === "cover")?.items.find((item) => item.image_url)?.image_url || "";
  context.fillStyle = "#07091c"; context.fillRect(0, 0, width, height);
  if (cover) { try { const image = await loadImage(cover); const scale = Math.max(width / image.width, height / image.height); const drawWidth = image.width * scale; const drawHeight = image.height * scale; context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight); image.close(); } catch {} }
  const gradient = context.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, "rgba(7,9,28,.18)"); gradient.addColorStop(.48, "rgba(7,9,28,.52)"); gradient.addColorStop(1, "rgba(7,9,28,.98)"); context.fillStyle = gradient; context.fillRect(0, 0, width, height);
  const margin = Math.round(width * .075); const bottom = Math.round(height * .09); context.textBaseline = "top";
  context.fillStyle = "#f9a8d4"; context.font = `800 ${Math.round(width * .026)}px Arial`; context.fillText("SEATTLE DESI TV  •  NEW PUBLICATION", margin, margin);
  context.fillStyle = "white"; context.font = `900 ${Math.round(width * (channel === "instagram" ? .072 : .058))}px Arial`;
  const lines = wrap(context, model.publication.name, width - margin * 2).slice(0, 3); const lineHeight = Math.round(width * (channel === "instagram" ? .085 : .067)); const titleY = height - bottom - lineHeight * lines.length - Math.round(width * .12); lines.forEach((line, index) => context.fillText(line, margin, titleY + index * lineHeight));
  if (model.publication.edition_label) { context.fillStyle = "#fbcfe8"; context.font = `700 ${Math.round(width * .03)}px Arial`; context.fillText(model.publication.edition_label, margin, titleY - Math.round(width * .055)); }
  context.fillStyle = "#db2777"; const pillY = height - bottom; const pillWidth = Math.round(width * .34); const pillHeight = Math.round(width * .065); context.beginPath(); context.roundRect(margin, pillY, pillWidth, pillHeight, pillHeight / 2); context.fill(); context.fillStyle = "white"; context.font = `800 ${Math.round(width * .025)}px Arial`; context.fillText("READ THE NEW EDITION", margin + Math.round(width * .025), pillY + Math.round(width * .019));
  return canvasFile(canvas, channel);
}

export async function publishSocialLaunch(supabase: SupabaseClient, publicationId: string, channel: SocialLaunchChannel, imageUrl: string, caption: string) {
  const { data } = await supabase.auth.getSession(); const token = data.session?.access_token; if (!token) throw new Error("Your session expired. Sign in again.");
  const endpoint = channel === "instagram" ? "/api/instagram/publish" : `/api/social/${channel}/publish`;
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(channel === "instagram" ? { publicationId, imageUrls: [imageUrl], caption } : { publicationId, imageUrl, caption }) });
  const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || `Could not publish to ${socialLaunchFormats[channel].label}.`); return result;
}
