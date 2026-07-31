-- Seattle Desi TV Supabase schema export helper
-- Purpose: run these queries in the PRODUCTION Supabase SQL Editor to collect
-- the current database structure without using paid backups or the Supabase CLI.
--
-- How to use:
-- 1) Open Supabase production project > SQL Editor.
-- 2) Run one section at a time.
-- 3) Export/copy each result as CSV or JSON.
-- 4) Share the outputs back into the project workflow so we can build
--    supabase/schema.sql as the reusable staging/prod rebuild script.
--
-- Important: this helper only READS metadata. It does not change data.

-- ============================================================
-- 1. Public tables
-- ============================================================
select
  t.table_schema,
  t.table_name,
  t.table_type
from information_schema.tables t
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
order by t.table_name;

-- ============================================================
-- 2. Columns, types, defaults, generated/identity info
-- ============================================================
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.datetime_precision,
  c.is_nullable,
  c.column_default,
  c.is_identity,
  c.identity_generation,
  c.is_generated,
  c.generation_expression
from information_schema.columns c
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;

-- ============================================================
-- 3. Constraints: primary keys, foreign keys, unique, checks
-- ============================================================
select
  con.conname as constraint_name,
  nsp.nspname as schema_name,
  rel.relname as table_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid, true) as constraint_definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
order by rel.relname, con.contype, con.conname;

-- ============================================================
-- 4. Indexes
-- ============================================================
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- ============================================================
-- 5. RLS enabled/forced status per table
-- ============================================================
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- ============================================================
-- 6. RLS policies
-- ============================================================
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ============================================================
-- 7. Public views
-- ============================================================
select
  schemaname,
  viewname,
  definition
from pg_views
where schemaname = 'public'
order by viewname;

-- ============================================================
-- 8. Public functions
-- ============================================================
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  l.lanname as language,
  p.prosecdef as security_definer,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname, pg_get_function_arguments(p.oid);

-- ============================================================
-- 9. Triggers
-- ============================================================
select
  event_object_schema as schema_name,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;

-- ============================================================
-- 10. Sequences
-- ============================================================
select
  sequence_schema,
  sequence_name,
  data_type,
  start_value,
  minimum_value,
  maximum_value,
  increment
from information_schema.sequences
where sequence_schema = 'public'
order by sequence_name;

-- ============================================================
-- 11. Extensions
-- ============================================================
select
  extname as extension_name,
  extversion as version,
  n.nspname as schema_name
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
order by extname;

-- ============================================================
-- 12. Storage buckets
-- ============================================================
select
  id,
  name,
  owner,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
from storage.buckets
order by name;

-- ============================================================
-- 13. Storage policies
-- ============================================================
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

-- ============================================================
-- 14. Suggested small seed/config tables
-- Run this only if you want to copy key website config rows.
-- Do NOT run broad selects from user/private data tables for staging.
-- ============================================================
-- select * from public.homepage_settings order by section_key;
