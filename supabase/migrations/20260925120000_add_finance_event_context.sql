-- Track whether a claim supports a paid event, free event, or general operations.
alter table public.finance_expenses
  add column if not exists event_financial_type text;

alter table public.finance_expenses
  drop constraint if exists finance_expenses_event_financial_type_check;
alter table public.finance_expenses
  add constraint finance_expenses_event_financial_type_check
  check (
    event_financial_type is null
    or event_financial_type in ('paid_event', 'free_event', 'not_event')
  );

create index if not exists finance_expenses_site_event_context_idx
  on public.finance_expenses (site_id, event_financial_type, expense_date desc);

comment on column public.finance_expenses.event_financial_type is
  'Finance reporting context: paid_event, free_event, or not_event.';
