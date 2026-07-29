-- Supports safe discovery refreshes without duplicating publication items.
create unique index if not exists publication_items_source_identity_idx
on public.publication_items(publication_section_id, source_type, source_id)
where source_id is not null;
