import type { SupabaseClient } from "@supabase/supabase-js";
import type { DigestRoleRequest, DigestUser } from "../types";

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
