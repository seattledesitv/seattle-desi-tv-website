import HomePageClient from "./HomePageClient";
import { getInitialHomepageData } from "./lib/publicCatalogServer";
import { resolveCurrentSite } from "./lib/sites/siteResolver";

export default async function HomePage() {
  const site = await resolveCurrentSite();
  const initialData = await getInitialHomepageData(site.id);
  return <HomePageClient initialData={initialData} />;
}
