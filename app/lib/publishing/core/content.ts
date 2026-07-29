export type PublishingSourceType = "event" | "business" | "organization" | "group" | "recognition" | "video";

export type PublishingContentItem = {
  sourceType: PublishingSourceType;
  sourceId: string;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  sourceDate: string | null;
  status: string;
  featured: boolean;
  metadata: Record<string, unknown>;
};

export type DiscoveryRange = {
  startDate: string | null;
  endDate: string | null;
};

export type DiscoveryResult = {
  sourceType: PublishingSourceType;
  label: string;
  items: PublishingContentItem[];
  error?: string;
};

export type DiscoverySummary = {
  results: DiscoveryResult[];
  total: number;
  errors: string[];
};
