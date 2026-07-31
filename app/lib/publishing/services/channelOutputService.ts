import type { PublicationPreviewModel } from "../preview/types";
import type { PublishingChannel } from "../repositories/publishingPipelineRepository";
import type { ChannelMediaAsset, ChannelOutputPayload } from "../pipeline/types";

const SITE_URL = "https://seattledesitv.com";

function clean(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value: unknown) {
  return clean(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function absoluteUrl(value: string | null | undefined) {
  const url = clean(value);
  if (!url) return "";
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function includedItems(model: PublicationPreviewModel) {
  return model.sections.flatMap((section) => section.items.map((item) => ({ section, item })));
}

function mediaAssets(model: PublicationPreviewModel): ChannelMediaAsset[] {
  const seen = new Set<string>();
  return includedItems(model).flatMap(({ item }) => {
    const url = clean(item.image_url);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ url: absoluteUrl(url), alt: clean(item.title) || "Seattle Desi TV publication image", sourceUrl: absoluteUrl(item.destination_url) || null }];
  }).slice(0, 10);
}

function sectionText(model: PublicationPreviewModel) {
  return model.sections.map((section) => {
    const items = section.items.map((item) => `- ${clean(item.title)}${item.description ? `: ${clean(item.description)}` : ""}${item.destination_url ? ` (${absoluteUrl(item.destination_url)})` : ""}`).join("\n");
    return `${section.title}\n${clean(section.introduction)}${items ? `\n${items}` : ""}`.trim();
  }).join("\n\n");
}

function publicationHtml(model: PublicationPreviewModel, compact = false) {
  const cover = model.publication.cover_image_url || model.sections.find((section) => section.section_key === "cover")?.items.find((item) => item.image_url)?.image_url;
  const sections = model.sections.filter((section) => section.section_key !== "cover").map((section) => `<section class="${escapeHtml(section.section_key)}"><h2>${escapeHtml(section.title)}</h2>${section.introduction ? `<p>${escapeHtml(section.introduction)}</p>` : ""}<div class="grid">${section.items.map((item) => `<article>${item.image_url ? `<img src="${escapeHtml(absoluteUrl(item.image_url))}" alt="${escapeHtml(item.title)}">` : ""}<div><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${item.destination_url ? `<a href="${escapeHtml(absoluteUrl(item.destination_url))}">Learn more</a>` : ""}</div></article>`).join("")}</div></section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><base href="${SITE_URL}/"><title>${escapeHtml(model.publication.name)}</title><style>body{margin:0;font:16px/1.6 Arial,sans-serif;color:#0f172a;background:#f8fafc}header{min-height:${compact ? "300px" : "420px"};padding:48px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:end;color:#fff;background:linear-gradient(0deg,rgba(2,6,23,.94),rgba(2,6,23,.22))${cover ? `,url('${escapeHtml(absoluteUrl(cover))}') center/cover` : ",#831843"}}header h1{font-size:${compact ? "38px" : "48px"};line-height:1.05;margin:8px 0}main{max-width:1050px;margin:auto;padding:32px}section{margin:34px 0}h2{border-bottom:3px solid #db2777}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}article{overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:#fff;break-inside:avoid}article img{width:100%;height:180px;object-fit:cover}article div{padding:18px}a{color:#be185d;font-weight:700}.get_involved{padding:28px;border:2px solid #0f172a;border-radius:24px}.statistics h3{font-size:24px;color:#db2777}@media(max-width:600px){header{padding:24px}header h1{font-size:34px}main{padding:18px}}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{background:#fff}header{min-height:9.5in;break-after:page}article,section{break-inside:avoid}@page{size:letter portrait;margin:.45in}}</style></head><body><header><small>SEATTLE DESI TV</small><h1>${escapeHtml(model.publication.name)}</h1>${model.publication.edition_label ? `<strong>${escapeHtml(model.publication.edition_label)}</strong>` : ""}${model.publication.description ? `<p>${escapeHtml(model.publication.description)}</p>` : ""}</header><main>${sections}</main></body></html>`;
}

function emailHtml(model: PublicationPreviewModel) {
  const cover = model.publication.cover_image_url || model.sections.find((section) => section.section_key === "cover")?.items.find((item) => item.image_url)?.image_url;
  const sectionRows = model.sections.filter((section) => section.section_key !== "cover").map((section) => {
    const actions = section.section_key === "get_involved";
    const itemRows = section.items.map((item) => {
      const image = item.image_url ? `<tr><td style="padding:0"><img src="${escapeHtml(absoluteUrl(item.image_url))}" alt="${escapeHtml(item.title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : "";
      const link = item.destination_url ? `<p style="margin:16px 0 0"><a href="${escapeHtml(absoluteUrl(item.destination_url))}" style="display:inline-block;background:${actions ? "#db2777" : "#0f172a"};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">${actions ? escapeHtml(item.title || "Get involved") : "Read more"}</a></p>` : "";
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;overflow:hidden"><tbody>${image}<tr><td style="padding:20px"><h3 style="margin:0;color:#0f172a;font:700 20px/1.3 Arial,sans-serif">${escapeHtml(item.title || "Untitled")}</h3>${item.description ? `<p style="margin:10px 0 0;color:#475569;font:15px/1.6 Arial,sans-serif">${escapeHtml(item.description)}</p>` : ""}${link}</td></tr></tbody></table>`;
    }).join("");
    return `<tr><td style="padding:28px 26px ${actions ? "30px" : "10px"};${actions ? "background:#0f172a;border-radius:18px" : ""}"><h2 style="margin:0;padding:0 0 10px;border-bottom:3px solid #db2777;color:${actions ? "#ffffff" : "#0f172a"};font:800 26px/1.2 Arial,sans-serif">${escapeHtml(section.title)}</h2>${section.introduction ? `<p style="margin:12px 0 18px;color:${actions ? "#cbd5e1" : "#475569"};font:16px/1.6 Arial,sans-serif">${escapeHtml(section.introduction)}</p>` : ""}${itemRows}</td></tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(model.publication.name)}</title></head><body style="margin:0;padding:0;background:#f1f5f9"><div style="display:none;max-height:0;overflow:hidden;color:transparent">${escapeHtml(model.publication.description || model.publication.name)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9"><tbody><tr><td align="center" style="padding:20px 10px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:652px;background:#ffffff;border-radius:20px;overflow:hidden"><tbody>${cover ? `<tr><td><img src="${escapeHtml(absoluteUrl(cover))}" alt="${escapeHtml(model.publication.name)}" width="652" style="display:block;width:100%;max-width:652px;height:auto;border:0"></td></tr>` : ""}<tr><td style="padding:32px 26px;background:#211025"><p style="margin:0;color:#f9a8d4;font:800 12px/1.4 Arial,sans-serif;letter-spacing:2px">SEATTLE DESI TV</p><h1 style="margin:10px 0 0;color:#ffffff;font:900 34px/1.08 Arial,sans-serif">${escapeHtml(model.publication.name)}</h1>${model.publication.edition_label ? `<p style="margin:12px 0 0;color:#fbcfe8;font:700 18px/1.4 Arial,sans-serif">${escapeHtml(model.publication.edition_label)}</p>` : ""}${model.publication.description ? `<p style="margin:16px 0 0;color:#e2e8f0;font:16px/1.6 Arial,sans-serif">${escapeHtml(model.publication.description)}</p>` : ""}</td></tr>${sectionRows}<tr><td style="padding:24px;text-align:center;background:#f8fafc;color:#64748b;font:13px/1.5 Arial,sans-serif">Seattle Desi TV · Community Media Platform<br><a href="${SITE_URL}/publications" style="color:#be185d;font-weight:700">View all publications online</a></td></tr></tbody></table></td></tr></tbody></table></body></html>`;
}

function socialCaption(model: PublicationPreviewModel, channel: PublishingChannel) {
  const featured = includedItems(model).filter(({ item }) => item.featured).slice(0, 3);
  const selected = featured.length ? featured : includedItems(model).slice(0, 3);
  const lines = selected.map(({ item }) => `• ${clean(item.title)}`);
  const limit = channel === "instagram" ? 2100 : channel === "linkedin" ? 2800 : 5000;
  const value = [`${clean(model.publication.name)}${model.publication.edition_label ? ` — ${clean(model.publication.edition_label)}` : ""}`, clean(model.publication.description), ...lines, `Read more: ${SITE_URL}`].filter(Boolean).join("\n\n");
  return value.length > limit ? `${value.slice(0, limit - 1).trim()}…` : value;
}

export function buildChannelOutput(model: PublicationPreviewModel, channel: PublishingChannel): ChannelOutputPayload {
  const title = clean(model.publication.name);
  const edition = clean(model.publication.edition_label) || null;
  const summary = clean(model.publication.description) || `Latest community stories and updates from ${title}.`;
  const hashtags = ["SeattleDesiTV", "SeattleDesi", "Community", "PacificNorthwest"];
  const social = ["instagram", "facebook", "linkedin"].includes(channel);
  const email = channel === "newsletter" || channel === "email";
  const html = social ? null : email ? emailHtml(model) : publicationHtml(model, false);
  const caption = social ? socialCaption(model, channel) : null;
  return {
    schemaVersion: 2,
    channel,
    title,
    edition,
    summary,
    subject: email ? `${title}${edition ? ` — ${edition}` : ""}` : null,
    preheader: email ? summary.slice(0, 150) : null,
    caption,
    hashtags: social ? hashtags : [],
    html,
    text: caption || `${title}${edition ? ` — ${edition}` : ""}\n\n${summary}\n\n${sectionText(model)}`,
    media: mediaAssets(model),
    sourceSnapshotGeneratedAt: model.generatedAt,
    generatedAt: new Date().toISOString(),
  };
}

export function channelOutputExtension(payload: ChannelOutputPayload) {
  return payload.html ? "html" : "txt";
}

export function serializeChannelOutput(payload: ChannelOutputPayload) {
  if (payload.html) return { content: payload.html, type: "text/html;charset=utf-8" };
  const socialText = [payload.caption, payload.hashtags.map((tag) => `#${tag}`).join(" ")].filter(Boolean).join("\n\n");
  return { content: socialText || payload.text, type: "text/plain;charset=utf-8" };
}

export function readChannelOutput(value: Record<string, unknown>): ChannelOutputPayload | null {
  if (value.schemaVersion !== 2 || typeof value.channel !== "string" || typeof value.title !== "string" || typeof value.text !== "string") return null;
  return value as unknown as ChannelOutputPayload;
}
