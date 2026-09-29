alter table public.final_approval_notifications
  drop constraint if exists final_approval_notifications_entity_type_check;

alter table public.final_approval_notifications
  add constraint final_approval_notifications_entity_type_check
  check (entity_type in ('story','story_instagram','event','organization','business'));

comment on table public.final_approval_notifications is
  'Idempotency ledger for final public approval and social-publication emails.';
