import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://seattledesitv.com").replace(/\/$/, "");
const privateRoutes = [
  "/api/", "/studio/", "/my-", "/account/", "/payments/", "/debug-",
  "/login", "/onboarding", "/notifications", "/update-password", "/unsubscribe",
  "/manage-listing", "/sponsorship/review", "/business-response",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privateRoutes },
      { userAgent: ["OAI-SearchBot", "ChatGPT-User", "GPTBot"], allow: "/", disallow: privateRoutes },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
