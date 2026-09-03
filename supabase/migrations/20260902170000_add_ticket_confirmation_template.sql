-- Organizer-controlled copy for the SDTV ticket confirmation email.
-- Event title, location, schedule, flyer, organization name/logo, ticket details,
-- order totals and QR codes are rendered from their source records at send time.

alter table public.event_ticket_settings
  add column if not exists confirmation_email_subject text,
  add column if not exists confirmation_email_message text,
  add column if not exists confirmation_email_footer text,
  add column if not exists confirmation_reply_to text;

comment on column public.event_ticket_settings.confirmation_email_subject is
  'Optional organizer subject template. Supported tokens: {{event_name}}, {{organization_name}}, {{order_number}}.';
comment on column public.event_ticket_settings.confirmation_email_message is
  'Organizer welcome/instruction copy displayed in the SDTV ticket confirmation email.';
comment on column public.event_ticket_settings.confirmation_email_footer is
  'Optional organizer footer displayed above the standard SDTV transactional footer.';
comment on column public.event_ticket_settings.confirmation_reply_to is
  'Optional organizer support email used as Reply-To after validation by the sending service.';
