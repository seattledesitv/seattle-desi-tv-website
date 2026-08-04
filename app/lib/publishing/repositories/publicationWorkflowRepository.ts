import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationRecord, PublicationStatus } from "../types";

export type PublicationStatusHistoryRecord = {
  id: string;
  publication_id: string;
  from_status: PublicationStatus;
  to_status: PublicationStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

export async function listPublicationStatusHistory(supabase: SupabaseClient, publicationId: string): Promise<PublicationStatusHistoryRecord[]> {
  const { data, error } = await supabase.from("publication_status_history").select("id,publication_id,from_status,to_status,note,changed_by,created_at").eq("publication_id", publicationId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as PublicationStatusHistoryRecord[];
}

export async function transitionPublicationStatusRecord(supabase: SupabaseClient, publicationId: string, status: PublicationStatus, note: string): Promise<PublicationRecord> {
  const { data, error } = await supabase.rpc("transition_publication_status", { target_publication_id: publicationId, target_status: status, transition_note: note.trim() || null });
  if (error) throw error;
  return data as unknown as PublicationRecord;
}
