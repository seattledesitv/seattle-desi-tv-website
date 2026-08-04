-- Connect accepted sponsors to My Hub and snapshot sponsorship-based offer waivers.

alter table public.business_offers
  add column if not exists sponsorship_agreement_id uuid references public.sponsorship_agreements(id) on delete set null,
  add column if not exists sponsor_waiver_tier text;

alter table public.business_offers drop constraint if exists business_offers_sponsor_waiver_tier_check;
alter table public.business_offers add constraint business_offers_sponsor_waiver_tier_check
  check (sponsor_waiver_tier is null or sponsor_waiver_tier in ('platinum','gold','silver','bronze'));

create index if not exists sponsorship_agreements_email_idx
  on public.sponsorship_agreements (lower(sponsor_email), status, end_date);
create index if not exists business_offers_sponsorship_idx
  on public.business_offers (sponsorship_agreement_id)
  where sponsorship_agreement_id is not null;

drop policy if exists "sponsors read own sponsorship agreements" on public.sponsorship_agreements;
create policy "sponsors read own sponsorship agreements" on public.sponsorship_agreements for select to authenticated
using (
  (lower(sponsor_email) = lower(coalesce(auth.jwt()->>'email',''))
   or exists (select 1 from public.local_businesses business where business.id = sponsorship_agreements.business_id and business.created_by = auth.uid()))
  and status in ('sent','viewed','accepted','active','completed','cancelled')
);

drop policy if exists "sponsors read own sponsorship installments" on public.sponsorship_payment_installments;
create policy "sponsors read own sponsorship installments" on public.sponsorship_payment_installments for select to authenticated
using (
  exists (
    select 1 from public.sponsorship_agreements agreement
    where agreement.id = sponsorship_payment_installments.agreement_id
      and (lower(agreement.sponsor_email) = lower(coalesce(auth.jwt()->>'email',''))
        or exists (select 1 from public.local_businesses business where business.id = agreement.business_id and business.created_by = auth.uid()))
      and agreement.status in ('sent','viewed','accepted','active','completed','cancelled')
  )
);

comment on column public.business_offers.sponsorship_agreement_id is 'Active sponsorship that waived this offer placement charge at approval time.';
comment on column public.business_offers.sponsor_waiver_tier is 'Auditable sponsorship tier used to waive this offer placement charge.';

-- Backfill premium directory placement for sponsorships activated before this integration shipped.
update public.local_businesses business
set is_premium = true,
    premium_starts_at = agreement.start_date,
    premium_ends_at = agreement.end_date,
    premium_label = initcap(agreement.tier) || ' Sponsor',
    premium_payment_reference = agreement.agreement_number,
    premium_notes = 'Included with active sponsorship ' || agreement.agreement_number || '.',
    premium_updated_at = now()
from public.sponsorship_agreements agreement
where agreement.business_id = business.id
  and agreement.status = 'active'
  and agreement.start_date <= current_date
  and agreement.end_date >= current_date;
