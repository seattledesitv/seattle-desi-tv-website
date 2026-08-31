import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryRange, DiscoveryResult, DiscoverySummary } from "../core/content";
import { discoverConfiguredSources } from "../discovery/sources";
import { listPublicationSections, saveDiscoverySnapshot } from "../repositories/contentRepository";

export async function discoverPublicationContent(supabase: SupabaseClient, range: DiscoveryRange, siteId: string, siteName: string): Promise<DiscoverySummary> {
  const results = await discoverConfiguredSources(supabase, range, siteId, siteName);
  return {
    results,
    total: results.reduce((sum, result) => sum + result.items.length, 0),
    errors: results.flatMap((result) => result.error ? [`${result.label}: ${result.error}`] : []),
  };
}

export async function savePublicationDiscovery(
  supabase: SupabaseClient,
  publicationId: string,
  results: DiscoveryResult[],
): Promise<number> {
  const sections = await listPublicationSections(supabase, publicationId);
  return saveDiscoverySnapshot(supabase, sections, results);
}
