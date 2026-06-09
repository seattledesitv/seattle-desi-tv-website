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
  return next === "team_member" || next === "crew_member" || next === "crew" || isAdminRole(next);
}

export function isVideoEditorRole(role?: string | null) {
  const next = cleanRole(role);
  return next === "video_editor" || next === "editor" || next.includes("video_editor") || isAdminRole(next);
}

export function canAccessVideoProduction(role?: string | null) {
  return isAdminRole(role) || isTeamRole(role) || isVideoEditorRole(role);
}

export async function resolveUserRole(supabase: SupabaseClient, currentUser: any) {
  if (!currentUser?.id) return "general_public";

  const adminByUserId = await supabase
    .from("admins")
    .select("role")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (adminByUserId.data?.role) return cleanRole(adminByUserId.data.role);

  const email = String(currentUser.email || "").trim();
  if (email) {
    const adminByEmail = await supabase
      .from("admins")
      .select("role")
      .ilike("email", email)
      .maybeSingle();

    if (adminByEmail.data?.role) return cleanRole(adminByEmail.data.role);
  }

  const roleRequestByUserId = await supabase
    .from("user_role_requests")
    .select("approved_role,requested_role,status")
    .eq("user_id", currentUser.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (roleRequestByUserId.data) {
    return cleanRole(roleRequestByUserId.data.approved_role || roleRequestByUserId.data.requested_role || "general_public");
  }

  if (email) {
    const roleRequestByEmail = await supabase
      .from("user_role_requests")
      .select("approved_role,requested_role,status")
      .ilike("email", email)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (roleRequestByEmail.data) {
      return cleanRole(roleRequestByEmail.data.approved_role || roleRequestByEmail.data.requested_role || "general_public");
    }
  }

  return "general_public";
}

export function canAccessStudio(role?: string | null) {
  return isAdminRole(role);
}

export function canRequestCrew(role?: string | null) {
  return isTeamRole(role);
}
