import type { PublishingChannel } from "../repositories/publishingPipelineRepository";
export type PublishingAdapter = { channel: PublishingChannel; deliveryMode: "manual" | "automatic"; configurationKey: string | null };
const adapters: Record<PublishingChannel, PublishingAdapter> = {
  website: { channel: "website", deliveryMode: "manual", configurationKey: null },
  newsletter: { channel: "newsletter", deliveryMode: "manual", configurationKey: "RESEND_API_KEY" },
  instagram: { channel: "instagram", deliveryMode: "automatic", configurationKey: "INSTAGRAM_ACCESS_TOKEN" },
  facebook: { channel: "facebook", deliveryMode: "automatic", configurationKey: "FACEBOOK_PAGE_ACCESS_TOKEN" },
  linkedin: { channel: "linkedin", deliveryMode: "automatic", configurationKey: "LINKEDIN_ACCESS_TOKEN" },
  pdf: { channel: "pdf", deliveryMode: "manual", configurationKey: null },
  email: { channel: "email", deliveryMode: "automatic", configurationKey: "RESEND_API_KEY" },
};
export function getPublishingAdapter(channel: PublishingChannel) { return adapters[channel]; }
