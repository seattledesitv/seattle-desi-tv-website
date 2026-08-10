import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type { SwirepayWebhookEvent } from "../types";
const db = getSupabaseBrowserClient();
export async function listWebhookEvents() {
  const { data, error } = await db
    .from("swirepay_webhook_events")
    .select(
      "id,provider_event_id,event_type,payment_gid,payload,payload_sha256,signature_verified,processing_status,processing_notes,received_at,processed_at",
    )
    .order("received_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as SwirepayWebhookEvent[];
}
export async function updateWebhookEvent(
  id: string,
  changes: Record<string, unknown>,
) {
  const { error } = await db
    .from("swirepay_webhook_events")
    .update(changes)
    .eq("id", id);
  if (error) throw error;
}
