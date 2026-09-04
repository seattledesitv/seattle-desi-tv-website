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

function integer(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
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

function normalizedProviderEventType(value: string | null) {
  const normalized = value?.toLowerCase().replaceAll("_", ".") || null;
  if (["payment.succeeded", "payment.success", "payment.captured"].includes(normalized || ""))
    return "payment.captured";
  if (["payment.authorized", "payment.require.capture"].includes(normalized || ""))
    return "payment.authorized";
  return normalized;
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
  const description = text(entity.description);
  const intentMatch = description?.match(
    /^SDTV-CLASSIFIED:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  );
  const currency = isRecord(entity.currency)
    ? text(entity.currency.name)
    : text(entity.currency);

  return {
    providerEventId,
    eventType:
      normalizedProviderEventType(providerEventType) ||
      normalizedPaymentEventType(status),
    paymentGid:
      text(entity.gid) ||
      text(entity.paymentGid) ||
      text(entity.payment_gid) ||
      text(entity.paymentSessionGid),
    paymentLinkGid:
      text(entity.paymentLinkGid) ||
      (text(entity.spObjectType)?.toUpperCase() === "PAYMENT_LINK"
        ? text(entity.spObjectGid)
        : null),
    classifiedIntentToken: intentMatch?.[1] || null,
    providerStatus: status,
    amountCents: integer(entity.amount),
    paidAmountCents: integer(entity.paidAmount),
    amountReceivedCents: integer(entity.amountReceived),
    currency,
    sanitizedPayload:
      entity === payload
        ? sanitizeSwirepayPayload(payload)
        : {
            ...sanitizeSwirepayPayload(payload),
            entity: sanitizeSwirepayPayload(entity),
          },
  };
}
