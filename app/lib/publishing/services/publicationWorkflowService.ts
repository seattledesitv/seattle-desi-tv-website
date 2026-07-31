import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublication } from "../repository";
import { listPublicationStatusHistory, transitionPublicationStatusRecord } from "../repositories/publicationWorkflowRepository";
import type { PublicationRecord, PublicationStatus } from "../types";

const allowedTransitions: Record<PublicationStatus, PublicationStatus[]> = {
  draft: ["review", "archived"], review: ["draft", "approved", "archived"], approved: ["draft", "published", "archived"],
  scheduled: ["approved", "published", "archived"], published: ["draft", "archived"], archived: ["draft"],
};

export function availablePublicationTransitions(status: PublicationStatus) { return allowedTransitions[status]; }
export async function loadPublicationWorkflow(supabase: SupabaseClient, publicationId: string) { const [publication, history] = await Promise.all([getPublication(supabase, publicationId), listPublicationStatusHistory(supabase, publicationId)]); return { publication, history }; }
export async function transitionPublicationStatus(supabase: SupabaseClient, publication: PublicationRecord, status: PublicationStatus, note: string) {
  if (!allowedTransitions[publication.status].includes(status)) throw new Error(`Cannot move a publication from ${publication.status} to ${status}.`);
  if (status === "approved" && note.trim().length < 3) throw new Error("Add a short approval note before approving this publication.");
  return transitionPublicationStatusRecord(supabase, publication.id, status, note);
}
export async function requireApprovedPublication(supabase: SupabaseClient, publicationId: string) {
  const publication = await getPublication(supabase, publicationId);
  if (!["approved", "scheduled", "published"].includes(publication.status)) throw new Error("Submit this publication for review and approve it before delivery.");
  return publication;
}
