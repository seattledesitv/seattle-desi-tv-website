import { SupabaseClient } from "@supabase/supabase-js";

export const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

export function cleanRole(role?: string | null) {
  return String(role || "general_public").toLowerCase().trim();
}

export function isAdminRole(role?: string | null) {
  const next = cleanRole(role);
  return next === "pm_admin" || next === "super_admin" || next.includes("admin");
}

export function isTeamRole(role?: string | null) {
  const next = cleanRole(role);
  return next === "team_member" || isAdminRole(next);
}

export async function resolveUserRole(supabase: SupabaseClient, currentUser: any) {
  if (!currentUser?.id) return "general_public";

  const adminResult = await supabase
    .from("admins")
    .select("role")
    .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
    .maybeSingle();

  if (adminResult.data?.role) return cleanRole(adminResult.data.role);

  const roleRequestResult = await supabase
    .from("user_role_requests")
    .select("approved_role,requested_role,status")
    .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return cleanRole(roleRequestResult.data?.approved_role || roleRequestResult.data?.requested_role || "general_public");
}

export function canAccessStudio(role?: string | null) {
  return isAdminRole(role);
}

export function canRequestCrew(role?: string | null) {
  return isTeamRole(role);
}
