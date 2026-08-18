export type SeoEntityKind = "event" | "business" | "classified" | "organization" | "press_release" | "publication";

export type SeoEntity = {
  id: string;
  kind: SeoEntityKind;
  title: string;
  description: string;
  path: string;
  image: string | null;
  modifiedAt: string | null;
  publishedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  organizationName: string | null;
  priceCents: number | null;
  website: string | null;
  category: string | null;
  offer: string | null;
};

export type SeoSitemapEntry = Pick<SeoEntity, "path" | "modifiedAt">;
