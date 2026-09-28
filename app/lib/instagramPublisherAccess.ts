import { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRole } from "./roles";

export async function hasInstagramPublisherAccess(
  supabase: SupabaseClient,
  user: { id?: string | null; email?: string | null } | null,
  role: string,
  siteId: string | null,
) {
  if (!user?.id || !siteId) return false;
  if (isAdminRole(role)) return true;

  const byUser = await supabase
    .from("instagram_publisher_access")
    .select("id")
    .eq("site_id", siteId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (byUser.data?.id) return true;

  const email = String(user.email || "").trim();
  if (!email) return false;
  const byEmail = await supabase
    .from("instagram_publisher_access")
    .select("id")
    .eq("site_id", siteId)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  return Boolean(byEmail.data?.id);
}
