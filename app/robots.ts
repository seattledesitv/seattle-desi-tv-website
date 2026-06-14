import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://seattledesitv.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio", "/studio/", "/studio/*", "/my-hub", "/my-hub/", "/my-hub/*", "/login"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
