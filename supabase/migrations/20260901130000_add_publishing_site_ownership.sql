-- Give each market independent publications and AI prompt configuration.
-- Child publishing records inherit ownership through their publication foreign keys.

alter table public.publications
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.publication_ai_prompts
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

update public.publications set site_id = public.current_site_id('sea') where site_id is null;
update public.publication_ai_prompts set site_id = public.current_site_id('sea') where site_id is null;

do $$
begin
  if exists (select 1 from public.publications where site_id is null)
     or exists (select 1 from public.publication_ai_prompts where site_id is null) then
    raise exception 'Publishing records could not be assigned to Seattle.';
  end if;
end
$$;

alter table public.publications alter column site_id set not null;
alter table public.publications alter column site_id set default public.current_site_id('sea');
alter table public.publication_ai_prompts alter column site_id set not null;
alter table public.publication_ai_prompts alter column site_id set default public.current_site_id('sea');

alter table public.publication_ai_prompts drop constraint if exists publication_ai_prompts_prompt_key_key;
alter table public.publication_ai_prompts
  add constraint publication_ai_prompts_site_prompt_key unique (site_id, prompt_key);

create index if not exists publications_site_status_updated_idx
  on public.publications (site_id, status, updated_at desc);
create index if not exists publication_ai_prompts_site_target_idx
  on public.publication_ai_prompts (site_id, target_type, active);

insert into public.publication_ai_prompts
  (site_id, prompt_key, name, target_type, system_prompt, user_prompt_template)
select
  s.id,
  seed.prompt_key,
  seed.name,
  seed.target_type,
  replace(seed.system_prompt, '{{SITE_NAME}}', s.name),
  seed.user_prompt_template
from public.sites s
cross join (values
  ('editorial_item', 'Editorial item rewrite', 'item', 'You are an editor for {{SITE_NAME}}. Preserve facts and source attribution. Return valid JSON only.', 'Rewrite this publication item for clarity and community relevance.'),
  ('editorial_section', 'Editorial section rewrite', 'section', 'You are an editor for {{SITE_NAME}}. Create a cohesive section introduction without inventing facts. Return valid JSON only.', 'Improve this publication section using its included items.'),
  ('editorial_publication', 'Editorial publication review', 'publication', 'You are the senior editor for {{SITE_NAME}}. Create cohesive publication-level editorial copy without inventing facts. Return valid JSON only.', 'Improve the publication description and editorial summary.')
) as seed(prompt_key, name, target_type, system_prompt, user_prompt_template)
on conflict (site_id, prompt_key) do nothing;

comment on column public.publications.site_id is 'Market that owns this publication and its dependent workflow records.';
comment on column public.publication_ai_prompts.site_id is 'Market whose publishing workflow uses this prompt.';
