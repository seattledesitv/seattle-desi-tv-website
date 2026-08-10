export type SwirepayWebhookEvent = {
  id: string;
  provider_event_id: string | null;
  event_type: string | null;
  payment_gid: string | null;
  payload: Record<string, unknown>;
  payload_sha256: string;
  signature_verified: boolean;
  processing_status: string;
  processing_notes: string | null;
  received_at: string;
  processed_at: string | null;
};
