import type { SupabaseClient } from "@supabase/supabase-js";
type FinalEntityType = "story" | "event" | "organization" | "business";

export async function requestFinalApprovalNotification(
  supabase: SupabaseClient,
  entityType: FinalEntityType,
  entityId: string,
) {
  const token =
    (await supabase.auth.getSession()).data.session?.access_token || "";
  const response = await fetch("/api/studio/final-notification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ entityType, entityId }),
  });
  return response
    .json()
    .catch(() => ({
      ok: false,
      error: "Notification response could not be read.",
    }));
}
