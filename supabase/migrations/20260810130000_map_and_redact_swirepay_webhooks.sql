update public.swirepay_webhook_events
set
  payment_gid = coalesce(payment_gid, payload ->> 'gid'),
  event_type = coalesce(
    event_type,
    case upper(coalesce(payload ->> 'status', ''))
      when 'REQUIRE_CAPTURE' then 'payment.authorized'
      when 'AUTHORIZED' then 'payment.authorized'
      when 'CAPTURED' then 'payment.captured'
      when 'SUCCESS' then 'payment.captured'
      when 'SUCCEEDED' then 'payment.captured'
      when 'FAILED' then 'payment.failed'
      when 'REFUNDED' then 'payment.refunded'
      when 'DISPUTED' then 'payment.disputed'
      else null
    end
  ),
  payload = payload - array[
    'authCode',
    'authorizationId',
    'customer',
    'nextActionUrl',
    'paymentMethod',
    'psClientSecret',
    'receiptEmail',
    'receiptSms',
    'spLink'
  ]::text[]
where signature_verified = true;

comment on table public.swirepay_webhook_events is
  'Signature-verified, redacted Swirepay webhook captures. Capture-only processing performs no payment or listing activation.';
