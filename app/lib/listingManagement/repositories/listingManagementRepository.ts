import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateListingRequest, ListingManagementRequest, ListingRequestStatus } from "../types";

export async function createRequest(client: SupabaseClient, input: CreateListingRequest) {
  const { data, error } = await client.from("listing_management_requests").insert({ ...input, status: "pending" }).select("*").single();
  if (error) throw error;
  return data as ListingManagementRequest;
}

export async function listOwnRequests(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("listing_management_requests").select("*").eq("requester_user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ListingManagementRequest[];
}

export async function listAllRequests(client: SupabaseClient) {
  const { data, error } = await client.from("listing_management_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ListingManagementRequest[];
}

export async function reviewRequest(client: SupabaseClient, id: string, status: ListingRequestStatus, adminNotes: string) {
  const { error } = await client.rpc("review_listing_management_request", { request_id: id, next_status: status, review_notes: adminNotes || null });
  if (error) throw error;
}
