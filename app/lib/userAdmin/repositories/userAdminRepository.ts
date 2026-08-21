import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegisteredUser } from "../types";

type AdminAuthApi = SupabaseClient["auth"]["admin"];

export async function listRegisteredUsers(authAdmin: AdminAuthApi, db: SupabaseClient): Promise<RegisteredUser[]> {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await authAdmin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const { data: admins, error: adminError } = await db.from("admins").select("user_id,email");
  if (adminError) throw adminError;
  const adminIds = new Set((admins || []).map((row) => String(row.user_id || "")).filter(Boolean));
  const adminEmails = new Set((admins || []).map((row) => String(row.email || "").trim().toLowerCase()).filter(Boolean));
  return users.filter((user) => !user.deleted_at).map((user) => {
    const email = user.email || "";
    const metadata = user.user_metadata || {};
    return {
      id: user.id,
      email,
      fullName: String(metadata.full_name || metadata.name || metadata.preferred_name || ""),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at || null,
      emailConfirmedAt: user.email_confirmed_at || null,
      isAdmin: adminIds.has(user.id) || adminEmails.has(email.trim().toLowerCase()),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRegisteredUser(authAdmin: AdminAuthApi, userId: string) {
  const { error } = await authAdmin.deleteUser(userId, true);
  if (error) throw error;
}
