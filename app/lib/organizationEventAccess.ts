import type { SupabaseClient } from "@supabase/supabase-js";

export async function getManagedEventIds(
  supabase: SupabaseClient,
  userId: string,
  siteId?: string | null,
) {
  let managerQuery = supabase
    .from("organization_managers")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("active", true);
  if (siteId) managerQuery = managerQuery.eq("site_id", siteId);
  const managers = await managerQuery;
  if (managers.error) throw managers.error;

  const organizationIds = Array.from(
    new Set((managers.data || []).map((row: any) => row.organization_id).filter(Boolean)),
  );
  if (!organizationIds.length) return [] as string[];

  let linkQuery = supabase
    .from("event_organizations")
    .select("event_id")
    .in("organization_id", organizationIds);
  if (siteId) linkQuery = linkQuery.eq("site_id", siteId);
  const links = await linkQuery;
  if (links.error) throw links.error;
  return Array.from(new Set((links.data || []).map((row: any) => row.event_id).filter(Boolean))) as string[];
}

export async function canManageEventThroughOrganization(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  siteId?: string | null,
) {
  const eventIds = await getManagedEventIds(supabase, userId, siteId);
  return eventIds.includes(eventId);
}
