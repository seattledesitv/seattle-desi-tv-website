import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("app");
const CONTENT_TABLES = [
  "events", "local_businesses", "community_organizations", "community_groups",
  "classifieds", "matrimonial_profiles", "press_releases", "influencer_profiles",
  "business_managers", "organization_managers", "event_organizations",
  "organization_event_link_requests", "business_edit_suggestions",
  "organization_edit_suggestions", "event_crew_assignments", "event_video_workflows",
  "event_influencer_intents", "event_coverage_sources",
  "organization_payment_accounts", "event_ticket_settings", "event_ticket_types",
  "ticket_orders", "ticket_order_items", "event_tickets", "ticket_settlements",
];
const SITE_MARKERS = /useCurrentSite|resolveCurrentSite|resolveSiteForHostname|resolveSiteForCode|forSite\s*\(|site_id/;
const ALLOWLIST = new Map([
  ["api/business-response/route.ts", "A cryptographically random, globally unique claim token is the access boundary."],
  ["api/webhooks/swirepay/route.ts", "A verified Swirepay signature plus a globally unique provider payment-session ID is the access boundary; the matched order carries its site ID."],
  ["debug-supabase/page.tsx", "Developer-only diagnostic page; never part of normal content navigation."],
]);

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  }));
  return nested.flat();
}

const violations = [];
for (const file of await filesBelow(ROOT)) {
  const source = await readFile(file, "utf8");
  const usesContentTable = CONTENT_TABLES.some((table) => source.includes(`from("${table}")`) || source.includes(`from('${table}')`));
  if (!usesContentTable || SITE_MARKERS.test(source)) continue;
  const relative = path.relative(ROOT, file).replaceAll("\\", "/");
  if (!ALLOWLIST.has(relative)) violations.push(relative);
}

if (violations.length) {
  console.error("Multi-city guard failed. These content-query files have no explicit site context:");
  violations.forEach((file) => console.error(`- app/${file}`));
  console.error("Use useCurrentSite/resolveCurrentSite and forSite(...), or document a narrow security exception in scripts/check-multicity.mjs.");
  process.exit(1);
}

console.log(`Multi-city guard passed (${ALLOWLIST.size} documented exceptions).`);
