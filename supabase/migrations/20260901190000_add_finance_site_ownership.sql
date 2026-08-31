-- Keep expenses, mileage reimbursements, receipts, and finance totals within one market.

alter table public.finance_expenses
  add column if not exists site_id uuid references public.sites(id) on delete restrict;

-- Every finance record created before multi-city support belongs to Seattle.
update public.finance_expenses
set site_id = public.current_site_id('sea')
where site_id is null;

do $$
begin
  if exists (select 1 from public.finance_expenses where site_id is null) then
    raise exception 'Finance records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.finance_expenses alter column site_id set not null;
alter table public.finance_expenses alter column site_id set default public.current_site_id('sea');

create index if not exists finance_expenses_site_date_idx
  on public.finance_expenses (site_id, expense_date desc, created_at desc);
create index if not exists finance_expenses_site_status_idx
  on public.finance_expenses (site_id, reimbursement_status, expense_date desc);

comment on column public.finance_expenses.site_id is
  'Market that owns this expense or mileage reimbursement.';
