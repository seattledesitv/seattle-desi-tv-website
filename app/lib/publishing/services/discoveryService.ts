import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryRange, DiscoverySummary } from "../core/content";
import { discoverConfiguredSources } from "../discovery/sources";

export async function discoverPublicationContent(supabase: SupabaseClient, range: DiscoveryRange): Promise<DiscoverySummary> {
  const results = await discoverConfiguredSources(supabase, range);
  return {
    results,
    total: results.reduce((sum, result) => sum + result.items.length, 0),
    errors: results.flatMap((result) => result.error ? [`${result.label}: ${result.error}`] : []),
  };
}
