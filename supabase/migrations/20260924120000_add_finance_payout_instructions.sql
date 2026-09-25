-- Private reimbursement instructions supplied with an expense or mileage claim.
alter table public.finance_expenses
  add column if not exists payout_method text,
  add column if not exists payout_details text;

comment on column public.finance_expenses.payout_method is
  'Claimant preferred reimbursement channel, such as Zelle, check, or private bank-transfer coordination.';
comment on column public.finance_expenses.payout_details is
  'Private payout instructions visible only through the protected finance workflow. Full bank account and routing numbers must not be stored here.';
