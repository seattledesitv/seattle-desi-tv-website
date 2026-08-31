import * as repository from "../repositories/influencerRepository";
import type { InfluencerAdminInput } from "../types";

function normalizeUrl(value: string | null) {
  const trimmed = value?.trim() || "";
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const InfluencerService = {
  listAdmin: repository.listAdmin,
  async createAdmin(input: InfluencerAdminInput, approvedBy: string, siteId: string) {
    if (input.full_name.trim().length < 2) throw new Error("Influencer name is required.");
    if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) throw new Error("A valid contact email is required.");
    const hasChannel = [input.instagram_url, input.tiktok_url, input.youtube_url, input.website_url].some((value) => value?.trim());
    if (!hasChannel) throw new Error("Add at least one social channel or website.");
    return repository.createAdmin({
      ...input,
      email: input.email.trim().toLowerCase(),
      full_name: input.full_name.trim(),
      city: input.city?.trim() || "Washington",
      bio: input.bio?.trim() || null,
      niche: input.niche?.trim() || null,
      follower_count: input.follower_count?.trim() || null,
      instagram_url: normalizeUrl(input.instagram_url),
      tiktok_url: normalizeUrl(input.tiktok_url),
      youtube_url: normalizeUrl(input.youtube_url),
      website_url: normalizeUrl(input.website_url),
      photo_url: normalizeUrl(input.photo_url),
    }, approvedBy, siteId);
  },
  updateAdmin: repository.updateAdmin,
};
