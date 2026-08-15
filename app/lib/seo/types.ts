export type SeoEntityKind = "event" | "classified" | "organization" | "press_release" | "publication";

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
};

export type SeoSitemapEntry = Pick<SeoEntity, "path" | "modifiedAt">;
