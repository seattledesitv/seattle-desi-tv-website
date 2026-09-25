import type { Metadata } from "next";
import EventsPageClient from "./EventsPageClient";
import { getInitialPublicEvents } from "../lib/publicCatalogServer";
import { resolveCurrentSite } from "../lib/sites/siteResolver";

export const metadata: Metadata = {
  title: "Seattle Community Events",
  description: "Discover approved cultural, nonprofit, business, and community events featured by Seattle Desi TV.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const site = await resolveCurrentSite();
  const initialEvents = await getInitialPublicEvents(site.id);
  return <EventsPageClient initialEvents={initialEvents} />;
}
