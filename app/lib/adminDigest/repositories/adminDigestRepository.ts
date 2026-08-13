import type { SupabaseClient } from "@supabase/supabase-js";
import type { DigestRoleRequest, DigestSubmissionSection, DigestUser } from "../types";

type AuthAdminClient = SupabaseClient["auth"]["admin"];

export async function listNewUsers(authAdmin: AuthAdminClient, since: string): Promise<DigestUser[]> {
  const users: DigestUser[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await authAdmin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data.users || [];
    for (const user of batch) {
      if (user.created_at < since) continue;
      users.push({
        id: user.id,
        email: user.email || "Email unavailable",
        name: String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim(),
        createdAt: user.created_at,
      });
    }
    if (batch.length < 1000) break;
  }
  return users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listNewRoleRequests(db: SupabaseClient, since: string): Promise<DigestRoleRequest[]> {
  const { data, error } = await db
    .from("user_role_requests")
    .select("id,user_id,email,requested_role,status,created_at")
    .in("requested_role", ["volunteer", "team_member"])
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    email: String(row.email || "Email unavailable"),
    requestedRole: row.requested_role as "volunteer" | "team_member",
    status: String(row.status || "pending"),
    createdAt: String(row.created_at),
  }));
}

const submissionSources = [
  { key: "events", label: "Events", table: "events", title: "title", studioPath: "/studio/events" },
  { key: "businesses", label: "Businesses", table: "local_businesses", title: "name", studioPath: "/studio/businesses" },
  { key: "organizations", label: "Organizations", table: "community_organizations", title: "name", studioPath: "/studio/community-orgs" },
  { key: "groups", label: "Community groups", table: "community_groups", title: "name", studioPath: "/studio/community-groups" },
  { key: "influencers", label: "Influencers", table: "influencer_profiles", title: "full_name", studioPath: "/studio/influencers" },
  { key: "classifieds", label: "Classified ads", table: "classified_ads", title: "title", studioPath: "/studio/classifieds" },
  { key: "matrimony_profiles", label: "Matrimony profiles", table: "matrimony_profiles", title: "display_name", studioPath: "/studio/matrimony" },
  { key: "matrimony_access", label: "Matrimony access requests", table: "matrimony_access_requests", title: "requester_email", studioPath: "/studio/matrimony" },
  { key: "business_offers", label: "Business offers", table: "business_offers", title: "title", studioPath: "/studio/businesses/offers" },
] as const;

export async function listNewSubmissions(db: SupabaseClient, since: string): Promise<DigestSubmissionSection[]> {
  return Promise.all(submissionSources.map(async (source) => {
    const { data, error } = await db
      .from(source.table)
      .select(`id,${source.title},status,created_at`)
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    if (error) return { key: source.key, label: source.label, studioPath: source.studioPath, items: [], error: error.message };
    const rows = (data || []) as unknown as Record<string, unknown>[];
    return {
      key: source.key,
      label: source.label,
      studioPath: source.studioPath,
      items: rows.map((row) => ({ id: String(row.id), title: String(row[source.title] || "Untitled submission"), status: String(row.status || "pending"), createdAt: String(row.created_at) })),
      error: null,
    };
  }));
}
