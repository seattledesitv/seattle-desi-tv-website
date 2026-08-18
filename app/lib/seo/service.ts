import type { Metadata } from "next";
import { cache } from "react";
import * as repository from "./repository";
import type { SeoEntity, SeoEntityKind, SeoSitemapEntry } from "./types";
import { entityIdFromParam, seoEntityPath } from "./urls";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://seattledesitv.com").replace(/\/$/, "");
const DEFAULT_IMAGE = `${SITE_URL}/hero-sdtv.png`;

function text(value: unknown) { return String(value || "").trim(); }
function image(row: Record<string, unknown>) {
  const urls = Array.isArray(row.image_urls) ? row.image_urls : [];
  const value = text(urls[0] || row.image || row.cover_image_url);
  if (!value) return null;
  return value.startsWith("http") ? value : `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}
function description(value: unknown, fallback: string) {
  const clean = text(value).replace(/\s+/g, " ");
  return (clean || fallback).slice(0, 300);
}

const paths: Record<SeoEntityKind, string> = {
  event: "/events/", business: "/businesses/", classified: "/classifieds/", organization: "/community-organizations/",
  press_release: "/press-releases/", publication: "/publications/",
};

export const getEntity = cache(async (kind: SeoEntityKind, id: string): Promise<SeoEntity | null> => {
  const entityId = entityIdFromParam(id);
  const row = await repository.getPublicEntity(kind, entityId);
  if (!row) return null;
  const title = text(row.title || row.name);
  const fallback = kind === "event" ? `Community event details from Seattle Desi TV.`
    : kind === "business" ? `Learn about this Seattle-area local business.`
    : kind === "organization" ? `Learn about this Seattle-area community organization.`
    : kind === "classified" ? `Community classified listing on Seattle Desi TV.`
    : kind === "press_release" ? `Community press release published by Seattle Desi TV.`
    : `Seattle Desi TV community publication.`;
  return {
    id: entityId, kind, title: title || "Seattle Desi TV", description: description(row.description || row.summary, fallback),
    path: seoEntityPath(paths[kind].replace(/^\//, "").replace(/\/$/, ""), title, entityId), image: image(row), modifiedAt: text(row.updated_at) || null,
    publishedAt: text(row.published_at || row.release_date || row.created_at) || null,
    startDate: text(row.date || row.starts_at) || null, endDate: text(row.end_date || row.expires_at) || null,
    location: text(row.location || row.address) || null, organizationName: text(row.organization_name) || null,
    priceCents: row.price_cents == null ? null : Number(row.price_cents),
    website: text(row.website) || null, category: text(row.category) || null,
    offer: text(row.offer || row.discount) || null,
  };
});

export function entityMetadata(entity: SeoEntity | null, fallbackTitle: string): Metadata {
  if (!entity) return { title: fallbackTitle, robots: { index: false, follow: false } };
  const url = `${SITE_URL}${entity.path}`;
  const imageUrl = entity.image || DEFAULT_IMAGE;
  return {
    title: entity.title,
    description: entity.description,
    alternates: { canonical: entity.path },
    openGraph: { title: entity.title, description: entity.description, url, siteName: "Seattle Desi TV", type: entity.kind === "event" ? "website" : "article", images: [{ url: imageUrl, alt: entity.title }] },
    twitter: { card: "summary_large_image", title: entity.title, description: entity.description, images: [imageUrl] },
  };
}

export function staticMetadata(title: string, descriptionText: string, path: string): Metadata {
  const imageUrl = DEFAULT_IMAGE;
  return {
    title,
    description: descriptionText,
    alternates: { canonical: path },
    openGraph: { title, description: descriptionText, url: `${SITE_URL}${path}`, siteName: "Seattle Desi TV", type: "website", images: [{ url: imageUrl, alt: "Seattle Desi TV community media" }] },
    twitter: { card: "summary_large_image", title, description: descriptionText, images: [imageUrl] },
  };
}

export function entityJsonLd(entity: SeoEntity) {
  const url = `${SITE_URL}${entity.path}`;
  const common = { "@context": "https://schema.org", name: entity.title, description: entity.description, url, image: entity.image || DEFAULT_IMAGE };
  if (entity.kind === "event") return { ...common, "@type": "Event", startDate: entity.startDate, endDate: entity.endDate || entity.startDate, eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", location: entity.location ? { "@type": "Place", name: entity.location } : undefined, organizer: { "@type": "Organization", name: "Seattle Desi TV", url: SITE_URL } };
  if (entity.kind === "organization") return { ...common, "@type": "Organization", address: entity.location ? { "@type": "PostalAddress", addressLocality: entity.location } : undefined };
  if (entity.kind === "business") return { ...common, "@type": "LocalBusiness", address: entity.location ? { "@type": "PostalAddress", streetAddress: entity.location } : undefined, sameAs: entity.website ? [entity.website] : undefined };
  if (entity.kind === "classified") return { ...common, "@type": "Product", offers: entity.priceCents == null ? undefined : { "@type": "Offer", priceCurrency: "USD", price: (entity.priceCents / 100).toFixed(2), availability: "https://schema.org/InStock", url } };
  return { ...common, "@type": entity.kind === "press_release" ? "NewsArticle" : "Article", headline: entity.title, datePublished: entity.publishedAt || undefined, dateModified: entity.modifiedAt || entity.publishedAt || undefined, publisher: { "@type": "Organization", name: "Seattle Desi TV", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/sdtv-logo.png` } } };
}

export function safeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }

export async function listSitemapEntries(): Promise<SeoSitemapEntry[]> {
  const rows = await repository.listPublicEntities();
  const map = (items: Array<Record<string, unknown>>, prefix: string) => items.map((row) => ({ path: seoEntityPath(prefix, row.title || row.name, row.id), modifiedAt: text(row.updated_at || row.created_at) || null }));
  return [...map(rows.events, "events"), ...map(rows.businesses, "businesses"), ...map(rows.classifieds, "classifieds"), ...map(rows.organizations, "community-organizations"), ...map(rows.releases, "press-releases"), ...map(rows.publications, "publications")];
}
