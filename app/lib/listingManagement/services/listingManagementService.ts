import type { SupabaseClient } from "@supabase/supabase-js";
import * as repository from "../repositories/listingManagementRepository";
import type { CreateListingRequest, ListingManagementRequest, ListingRequestStatus } from "../types";

export async function submitListingRequest(client: SupabaseClient, input: CreateListingRequest) {
  if (!input.entity_id || !input.entity_name.trim()) throw new Error("The listing could not be identified.");
  if (!input.requester_name.trim() || !input.requester_email.trim()) throw new Error("Your name and email are required.");
  if (input.details.trim().length < 20) throw new Error("Please provide at least 20 characters explaining the request.");
  if (input.request_type === "claim" && !input.relationship?.trim()) throw new Error("Please explain your relationship to this listing.");
  return repository.createRequest(client, { ...input, entity_name: input.entity_name.trim(), requester_name: input.requester_name.trim(), requester_email: input.requester_email.trim(), details: input.details.trim() });
}

export const loadOwnListingRequests = repository.listOwnRequests;
export const loadAllListingRequests = repository.listAllRequests;

export async function reviewListingRequest(client: SupabaseClient, request: ListingManagementRequest, status: ListingRequestStatus, notes: string, reviewerId: string) {
  if (!reviewerId) throw new Error("A reviewer is required.");
  await repository.reviewRequest(client, request.id, status, notes);
}
