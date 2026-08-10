type JsonRecord = Record<string, unknown>;

const REDACTED_TOP_LEVEL_FIELDS = new Set([
  "authCode",
  "authorizationId",
  "customer",
  "nextActionUrl",
  "paymentMethod",
  "psClientSecret",
  "receiptEmail",
  "receiptSms",
  "spLink",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function paymentEntity(payload: JsonRecord) {
  if (isRecord(payload.entity)) return payload.entity;
  if (isRecord(payload.data) && isRecord(payload.data.entity))
    return payload.data.entity;
  return payload;
}

export function normalizedPaymentEventType(status: string | null) {
  switch (status?.toUpperCase()) {
    case "REQUIRE_CAPTURE":
    case "AUTHORIZED":
      return "payment.authorized";
    case "CAPTURED":
    case "SUCCESS":
    case "SUCCEEDED":
      return "payment.captured";
    case "FAILED":
      return "payment.failed";
    case "REFUNDED":
      return "payment.refunded";
    case "DISPUTED":
      return "payment.disputed";
    default:
      return status ? `payment.${status.toLowerCase()}` : null;
  }
}

export function sanitizeSwirepayPayload(payload: JsonRecord) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !REDACTED_TOP_LEVEL_FIELDS.has(key)),
  );
}

export function mapSwirepayWebhookPayload(payload: unknown) {
  if (!isRecord(payload))
    return {
      providerEventId: null,
      eventType: null,
      paymentGid: null,
      sanitizedPayload: {},
    };

  const entity = paymentEntity(payload);
  const providerEventId =
    text(payload.id) || text(payload.eventId) || text(payload.event_id);
  const providerEventType =
    text(payload.type) ||
    text(payload.event) ||
    text(payload.eventType) ||
    text(payload.event_type);
  const status = text(entity.status);

  return {
    providerEventId,
    eventType: providerEventType || normalizedPaymentEventType(status),
    paymentGid:
      text(entity.gid) ||
      text(entity.paymentGid) ||
      text(entity.payment_gid) ||
      text(entity.paymentSessionGid),
    sanitizedPayload:
      entity === payload
        ? sanitizeSwirepayPayload(payload)
        : {
            ...sanitizeSwirepayPayload(payload),
            entity: sanitizeSwirepayPayload(entity),
          },
  };
}
