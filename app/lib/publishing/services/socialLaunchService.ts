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

function roundedBox(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string) {
  context.beginPath(); context.roundRect(x, y, width, height, radius); context.fillStyle = fill; context.fill();
}

async function drawInstagramNewsletterPreview(context: CanvasRenderingContext2D, model: PublicationPreviewModel, cover: string) {
  const width = 1080; const height = 1350;
  const background = context.createLinearGradient(0, 0, width, height); background.addColorStop(0, "#fff7fb"); background.addColorStop(.52, "#fdf2f8"); background.addColorStop(1, "#eef2ff"); context.fillStyle = background; context.fillRect(0, 0, width, height);
  context.fillStyle = "#be185d"; context.font = "900 28px Arial"; context.fillText("SEATTLE DESI TV", 72, 58); context.fillStyle = "#64748b"; context.font = "700 19px Arial"; context.fillText("COMMUNITY STORIES • EVENTS • PEOPLE", 72, 98);
  roundedBox(context, 800, 54, 208, 54, 27, "#db2777"); context.fillStyle = "white"; context.font = "800 19px Arial"; context.fillText("NEW EDITION", 837, 72);

  const cardX = 118; const cardY = 160; const cardWidth = 844; const cardHeight = 980;
  context.save(); context.shadowColor = "rgba(15,23,42,.20)"; context.shadowBlur = 42; context.shadowOffsetY = 20; roundedBox(context, cardX, cardY, cardWidth, cardHeight, 34, "white"); context.restore();
  roundedBox(context, cardX, cardY, cardWidth, 58, 34, "#f8fafc"); context.fillStyle = "#fb7185"; context.beginPath(); context.arc(cardX + 32, cardY + 29, 7, 0, Math.PI * 2); context.fill(); context.fillStyle = "#fbbf24"; context.beginPath(); context.arc(cardX + 54, cardY + 29, 7, 0, Math.PI * 2); context.fill(); context.fillStyle = "#4ade80"; context.beginPath(); context.arc(cardX + 76, cardY + 29, 7, 0, Math.PI * 2); context.fill(); roundedBox(context, cardX + 116, cardY + 14, 570, 30, 15, "#e2e8f0"); context.fillStyle = "#64748b"; context.font = "600 13px Arial"; context.fillText("seattledesitv.com/publications", cardX + 142, cardY + 22);

  const heroY = cardY + 58; const heroHeight = 360; context.save(); context.beginPath(); context.rect(cardX, heroY, cardWidth, heroHeight); context.clip();
  context.fillStyle = "#11132d"; context.fillRect(cardX, heroY, cardWidth, heroHeight);
  if (cover) { try { const image = await loadImage(cover); const scale = Math.max(cardWidth / image.width, heroHeight / image.height); const drawWidth = image.width * scale; const drawHeight = image.height * scale; context.drawImage(image, cardX + (cardWidth - drawWidth) / 2, heroY + (heroHeight - drawHeight) / 2, drawWidth, drawHeight); image.close(); } catch {} }
  const overlay = context.createLinearGradient(0, heroY, 0, heroY + heroHeight); overlay.addColorStop(0, "rgba(2,6,23,.08)"); overlay.addColorStop(1, "rgba(2,6,23,.92)"); context.fillStyle = overlay; context.fillRect(cardX, heroY, cardWidth, heroHeight); context.restore();
  context.fillStyle = "#fbcfe8"; context.font = "800 18px Arial"; context.fillText(model.publication.edition_label || "LATEST EDITION", cardX + 42, heroY + 218); context.fillStyle = "white"; context.font = "900 48px Arial"; const titleLines = wrap(context, model.publication.name, cardWidth - 84).slice(0, 2); titleLines.forEach((line, index) => context.fillText(line, cardX + 42, heroY + 252 + index * 54));

  const contentY = heroY + heroHeight + 34; context.fillStyle = "#0f172a"; context.font = "900 23px Arial"; context.fillText("Inside this edition", cardX + 38, contentY);
  const sections = model.sections.filter((section) => section.section_key !== "cover").slice(0, 4); const tileWidth = 369; const tileHeight = 178;
  sections.forEach((section, index) => { const x = cardX + 38 + (index % 2) * (tileWidth + 30); const y = contentY + 46 + Math.floor(index / 2) * (tileHeight + 24); roundedBox(context, x, y, tileWidth, tileHeight, 20, index === 0 ? "#fdf2f8" : "#f8fafc"); context.fillStyle = index === 0 ? "#db2777" : "#94a3b8"; context.fillRect(x, y, 7, tileHeight); context.fillStyle = "#0f172a"; context.font = "900 21px Arial"; wrap(context, section.title, tileWidth - 42).slice(0, 2).forEach((line, lineIndex) => context.fillText(line, x + 24, y + 25 + lineIndex * 25)); const item = section.items[0]; const summary = item?.title || section.introduction || "Explore the latest community update"; context.fillStyle = "#64748b"; context.font = "600 16px Arial"; wrap(context, summary, tileWidth - 46).slice(0, 3).forEach((line, lineIndex) => context.fillText(line, x + 24, y + 88 + lineIndex * 21)); });

  context.fillStyle = "#0f172a"; context.font = "900 30px Arial"; context.fillText("The new edition is live", 72, 1200); context.fillStyle = "#64748b"; context.font = "600 20px Arial"; context.fillText("Read stories, discover events, and connect with our community.", 72, 1245); roundedBox(context, 742, 1192, 266, 72, 36, "#db2777"); context.fillStyle = "white"; context.font = "900 21px Arial"; context.fillText("READ NOW  →", 800, 1217);
}

export async function renderSocialLaunchImage(model: PublicationPreviewModel, channel: SocialLaunchChannel) {
  const { width, height } = socialLaunchFormats[channel]; const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Image generation is unavailable in this browser.");
  const cover = model.publication.cover_image_url || model.sections.find((section) => section.section_key === "cover")?.items.find((item) => item.image_url)?.image_url || "";
  context.textBaseline = "top";
  if (channel === "instagram") { await drawInstagramNewsletterPreview(context, model, cover); return canvasFile(canvas, channel); }
  context.fillStyle = "#07091c"; context.fillRect(0, 0, width, height);
  if (cover) { try { const image = await loadImage(cover); const scale = Math.max(width / image.width, height / image.height); const drawWidth = image.width * scale; const drawHeight = image.height * scale; context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight); image.close(); } catch {} }
  const gradient = context.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, "rgba(7,9,28,.18)"); gradient.addColorStop(.48, "rgba(7,9,28,.52)"); gradient.addColorStop(1, "rgba(7,9,28,.98)"); context.fillStyle = gradient; context.fillRect(0, 0, width, height);
  const margin = Math.round(width * .075); const bottom = Math.round(height * .09);
  context.fillStyle = "#f9a8d4"; context.font = `800 ${Math.round(width * .026)}px Arial`; context.fillText("SEATTLE DESI TV  •  NEW PUBLICATION", margin, margin);
  context.fillStyle = "white"; context.font = `900 ${Math.round(width * .058)}px Arial`;
  const lines = wrap(context, model.publication.name, width - margin * 2).slice(0, 3); const lineHeight = Math.round(width * .067); const titleY = height - bottom - lineHeight * lines.length - Math.round(width * .12); lines.forEach((line, index) => context.fillText(line, margin, titleY + index * lineHeight));
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
