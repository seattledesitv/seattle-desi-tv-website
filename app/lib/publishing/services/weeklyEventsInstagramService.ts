import type { PublicationItemRecord } from "../repositories/publicationItemRepository";

export type WeeklyEventsInstagramCopy = {
  headline: string;
  weekLabel: string;
  intro: string;
  caption: string;
  hashtags: string;
};

const WIDTH = 1080;
const HEIGHT = 1350;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) visible[maxLines - 1] = `${visible[maxLines - 1].replace(/[.,;:]?$/, "")}…`;
  visible.forEach((value, index) => context.fillText(value, x, y + (index * lineHeight)));
}

function drawCover(copy: WeeklyEventsInstagramCopy, eventCount: number) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH; canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image generation is not supported in this browser.");
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#08091c"); gradient.addColorStop(0.58, "#29102e"); gradient.addColorStop(1, "#ca3478");
  context.fillStyle = gradient; context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "rgba(255,255,255,.07)"; context.beginPath(); context.arc(930, 180, 310, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#f9a8d4"; context.font = "900 31px Arial"; context.fillText("SEATTLE DESI TV PRESENTS", 80, 130);
  context.fillStyle = "#ffffff"; context.font = "900 94px Arial"; wrapText(context, copy.headline, 80, 310, 900, 104, 3);
  context.fillStyle = "#facc15"; context.font = "900 42px Arial"; context.fillText(copy.weekLabel, 82, 640);
  context.fillStyle = "#e2e8f0"; context.font = "500 38px Arial"; wrapText(context, copy.intro, 82, 735, 880, 54, 4);
  context.fillStyle = "#ffffff"; roundedRect(context, 80, 1040, 920, 150, 36); context.fill();
  context.fillStyle = "#9d174d"; context.font = "900 40px Arial"; context.fillText(`${eventCount} COMMUNITY EVENT${eventCount === 1 ? "" : "S"}`, 130, 1134);
  context.fillStyle = "#f9a8d4"; context.font = "800 28px Arial"; context.fillText("SWIPE FOR FLYERS & DETAILS  →", 80, 1285);
  return canvas;
}

async function drawEvent(item: PublicationItemRecord, index: number, total: number, copy: WeeklyEventsInstagramCopy) {
  const canvas = document.createElement("canvas"); canvas.width = WIDTH; canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image generation is not supported in this browser.");
  context.fillStyle = "#07091a"; context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#f9a8d4"; context.font = "900 27px Arial"; context.fillText("SEATTLE DESI TV · WEEKLY EVENTS", 55, 65);
  context.textAlign = "right"; context.fillStyle = "#ffffff"; context.fillText(`${index + 1} / ${total}`, 1025, 65); context.textAlign = "left";
  const flyer = await loadImage(item.image_url || "");
  context.fillStyle = "#17182d"; roundedRect(context, 55, 105, 970, 920, 30); context.fill();
  if (flyer) {
    const scale = Math.min(970 / flyer.naturalWidth, 920 / flyer.naturalHeight);
    const width = flyer.naturalWidth * scale; const height = flyer.naturalHeight * scale;
    context.save(); roundedRect(context, 55, 105, 970, 920, 30); context.clip();
    context.drawImage(flyer, 55 + ((970 - width) / 2), 105 + ((920 - height) / 2), width, height); context.restore();
  } else {
    context.fillStyle = "#f9a8d4"; context.font = "900 44px Arial"; context.textAlign = "center";
    context.fillText("EVENT FLYER", WIDTH / 2, 535); context.textAlign = "left";
  }
  context.fillStyle = "#ffffff"; context.font = "900 43px Arial"; wrapText(context, item.title || "Community Event", 55, 1090, 970, 51, 3);
  context.fillStyle = "#facc15"; context.font = "800 25px Arial"; context.fillText(copy.weekLabel, 55, 1276);
  context.textAlign = "right"; context.fillStyle = "#f9a8d4"; context.fillText("Details in caption · seattledesitv.com", 1025, 1276); context.textAlign = "left";
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the Instagram image.")), "image/png"));
}

export function defaultWeeklyEventsCopy(editionLabel?: string | null): WeeklyEventsInstagramCopy {
  const weekLabel = editionLabel?.trim() || "This Week in Seattle";
  return {
    headline: "What’s Happening This Week",
    weekLabel,
    intro: "Discover community celebrations, performances, workshops, and gatherings around Seattle.",
    caption: `Your weekly Seattle-area community event guide is here! Swipe through the flyers and save the dates.\n\n${weekLabel}`,
    hashtags: "#SeattleDesiTV #SeattleEvents #DesiCommunity #SeattleCommunity",
  };
}

export async function renderWeeklyEventsInstagramCarousel(items: PublicationItemRecord[], copy: WeeklyEventsInstagramCopy): Promise<File[]> {
  if (!items.length) throw new Error("Select at least one event before generating images.");
  if (items.length > 9) throw new Error("Instagram allows 10 carousel slides. Select no more than 9 events plus the cover.");
  const canvases: HTMLCanvasElement[] = [drawCover(copy, items.length)];
  for (let index = 0; index < items.length; index += 1) canvases.push(await drawEvent(items[index], index, items.length, copy));
  const files: File[] = [];
  for (let index = 0; index < canvases.length; index += 1) {
    files.push(new File([await canvasToBlob(canvases[index])], `sdtv-weekly-events-${index + 1}.png`, { type: "image/png" }));
  }
  return files;
}

export function buildWeeklyEventsCaption(copy: WeeklyEventsInstagramCopy, items: PublicationItemRecord[]) {
  const details = items.map((item, index) => `${index + 1}. ${item.title || "Community Event"}${item.destination_url ? `\n${item.destination_url}` : ""}`).join("\n\n");
  return `${copy.caption.trim()}\n\n${details}\n\n${copy.hashtags.trim()}`.trim();
}
