import type { Metadata } from "next";
import BusinessesPageClient from "./BusinessesPageClient";
import { getInitialPublicBusinesses } from "../lib/publicCatalogServer";
import { resolveCurrentSite } from "../lib/sites/siteResolver";

export const metadata: Metadata = {
  title: "Seattle Local Business Directory",
  description: "Explore approved local businesses serving the Seattle-area South Asian community.",
  alternates: { canonical: "/businesses" },
};

export default async function BusinessesPage() {
  const site = await resolveCurrentSite();
  const initialBusinesses = await getInitialPublicBusinesses(site.id);
  return <BusinessesPageClient initialBusinesses={initialBusinesses} />;
}
