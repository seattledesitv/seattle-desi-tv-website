alter table public.homepage_sponsors add column if not exists business_id uuid references public.local_businesses(id) on delete set null;
alter table public.homepage_sponsors add column if not exists start_date date;
alter table public.homepage_sponsors add column if not exists end_date date;
alter table public.homepage_sponsors add column if not exists contribution_reference text;
alter table public.homepage_sponsors add column if not exists internal_notes text;

create unique index if not exists homepage_sponsors_business_unique
  on public.homepage_sponsors(business_id)
  where business_id is not null;

update public.homepage_sponsors set tier = 'Gold Contributor' where tier = 'Gold Sponsor';
update public.homepage_sponsors set tier = 'Silver Contributor' where tier = 'Silver Sponsor';
update public.homepage_sponsors set tier = 'Community Contributor' where tier = 'Community Partner';

comment on table public.homepage_sponsors is 'Homepage contributors, including business-linked and standalone community contributors. Legacy table name retained for compatibility.';
