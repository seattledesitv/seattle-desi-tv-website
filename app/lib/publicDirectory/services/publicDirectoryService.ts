import type { SupabaseClient } from "@supabase/supabase-js";
import * as repository from "../repositories/publicDirectoryRepository";
import type { PublicDirectoryPage, PublicDirectoryResource } from "../types";

function imageUrls(row: Record<string, unknown>) {
  const urls = Array.isArray(row.image_urls)
    ? row.image_urls.filter(
        (value): value is string => typeof value === "string" && Boolean(value),
      )
    : [];
  if (urls.length) return urls;
  return typeof row.image === "string" && row.image ? [row.image] : [];
}

function normalize(
  resource: PublicDirectoryResource,
  row: Record<string, unknown>,
) {
  if (resource === "events")
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      startTime: row.local_start_time,
      endTime: row.local_end_time,
      timezone: row.event_timezone || "America/Los_Angeles",
      location: row.location,
      description: row.description,
      imageUrls: imageUrls(row),
      ticketUrl: row.ticket_url,
      createdAt: row.created_at,
    };
  if (resource === "businesses")
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      website: row.website,
      category: row.category,
      discount: row.discount,
      offer: row.offer,
      imageUrls: imageUrls(row),
      premium: Boolean(row.is_premium),
      premiumLabel: row.premium_label,
      premiumRank: row.premium_rank,
      premiumStartsAt: row.premium_starts_at,
      premiumEndsAt: row.premium_ends_at,
      createdAt: row.created_at,
    };
  if (resource === "organizations")
    return {
      id: row.id,
      name: row.name,
      type: row.organization_type,
      category: row.category,
      location: row.location,
      website: row.website,
      description: row.description,
      imageUrls: imageUrls(row),
      createdAt: row.created_at,
    };
  if (resource === "groups")
    return {
      id: row.id,
      name: row.name,
      platform: row.platform,
      category: row.category,
      language: row.language,
      location: row.location,
      description: row.description,
      groupUrl: row.group_url,
      imageUrls: imageUrls(row),
      createdAt: row.created_at,
    };
  if (resource === "classifieds")
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      location: row.location,
      imageUrls: imageUrls(row),
      priceCents: row.price_cents,
      priceType: row.price_type,
      condition: row.item_condition,
      placement: row.requested_placement,
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  return {
    id: row.id,
    name: row.full_name,
    city: row.city,
    bio: row.bio,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    youtubeUrl: row.youtube_url,
    websiteUrl: row.website_url,
    photoUrl: row.photo_url,
    niche: row.niche,
    followerCount: row.follower_count,
    createdAt: row.created_at,
  };
}

export const PublicDirectoryService = {
  async list(
    db: SupabaseClient,
    resource: PublicDirectoryResource,
    limit: number,
    offset: number,
    siteId?: string | null,
  ): Promise<PublicDirectoryPage> {
    const result = await repository.listApproved(db, resource, {
      limit,
      offset,
      siteId,
    });
    let rows = result.rows;
    if (resource === "influencers") {
      const hidden = await repository.listHiddenIdentities(db);
      rows = rows.filter(
        (row) =>
          !hidden.userIds.has(String(row.user_id || "")) &&
          !hidden.emails.has(String(row.email || "").toLowerCase()),
      );
    }
    const items = rows.map((row) => normalize(resource, row));
    return {
      generatedAt: new Date().toISOString(),
      resource,
      limit,
      offset,
      count: items.length,
      hasMore: offset + result.rows.length < result.count,
      items,
    };
  },
};
