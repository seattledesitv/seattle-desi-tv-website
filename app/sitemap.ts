import type { MetadataRoute } from "next";
import { listSitemapEntries, SITE_URL } from "./lib/seo/service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicRoutes = [
    "",
    "/about",
    "/events",
    "/businesses",
    "/offers",
    "/classifieds",
    "/community-groups",
    "/community-organizations",
    "/influencers",
    "/press-releases",
    "/publications",
    "/subscribe",
    "/matrimony",
    "/radio",
    "/radio-team",
    "/team",
    "/recognition",
    "/marketing-packages",
    "/contact",
    "/share-with-sdtv",
    "/submit-content",
    "/tv",
    "/mobile-app",
    "/privacy",
    "/terms",
  ];

  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/events" || route === "/businesses" || route === "/publications" ? 0.9 : 0.7,
  }));
  const dynamicEntries = await listSitemapEntries();
  return [...staticEntries, ...dynamicEntries.map((entry) => ({
    url: `${SITE_URL}${entry.path}`,
    lastModified: entry.modifiedAt ? new Date(entry.modifiedAt) : undefined,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))];
}
