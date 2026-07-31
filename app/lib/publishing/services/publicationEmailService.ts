import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicationEmailResult = { ok: boolean; message: string; sent?: number; skipped?: number; testEmail?: string };

async function requestEmailAction(
  supabase: SupabaseClient,
  body: { action: "test" | "send_all"; outputId: string; testEmail?: string; confirmed?: boolean },
): Promise<PublicationEmailResult> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error("Please log in to send publication email.");
  const response = await fetch("/api/studio/publishing/email", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Publication email action failed.");
  return result as PublicationEmailResult;
}

export function sendPublicationTestEmail(supabase: SupabaseClient, outputId: string, testEmail: string) {
  return requestEmailAction(supabase, { action: "test", outputId, testEmail });
}

export function sendPublicationToSubscribers(supabase: SupabaseClient, outputId: string) {
  return requestEmailAction(supabase, { action: "send_all", outputId, confirmed: true });
}
