export type ManagedListingType = "event" | "influencer" | "community_group";
export type ListingRequestType = "claim" | "correction" | "removal";
export type ListingRequestStatus = "pending" | "needs_information" | "approved" | "rejected";

export type ListingManagementRequest = {
  id: string;
  entity_type: ManagedListingType;
  entity_id: string;
  entity_name: string;
  request_type: ListingRequestType;
  requester_user_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone?: string | null;
  relationship?: string | null;
  details: string;
  status: ListingRequestStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateListingRequest = Pick<ListingManagementRequest, "entity_type" | "entity_id" | "entity_name" | "request_type" | "requester_user_id" | "requester_name" | "requester_email" | "details"> & {
  requester_phone?: string;
  relationship?: string;
};
