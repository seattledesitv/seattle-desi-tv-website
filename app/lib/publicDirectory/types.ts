export const publicDirectoryResources = [
  "events",
  "businesses",
  "organizations",
  "groups",
  "influencers",
  "classifieds",
] as const;

export type PublicDirectoryResource = (typeof publicDirectoryResources)[number];

export type PublicDirectoryPage = {
  generatedAt: string;
  resource: PublicDirectoryResource;
  limit: number;
  offset: number;
  count: number;
  hasMore: boolean;
  items: Record<string, unknown>[];
};

export function isPublicDirectoryResource(
  value: string,
): value is PublicDirectoryResource {
  return publicDirectoryResources.includes(value as PublicDirectoryResource);
}
