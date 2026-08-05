import * as repository from "../repositories/swirepayWebhookRepository";
export const SwirepayWebhookService = {
  list: repository.listWebhookEvents,
  markReviewed: (id: string, notes: string) =>
    repository.updateWebhookEvent(id, {
      processing_status: "mapped",
      processing_notes: notes || null,
      processed_at: new Date().toISOString(),
    }),
};
