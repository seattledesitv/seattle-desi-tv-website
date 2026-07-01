-- SDTV Restore v2 validation checks
-- Run after all restore steps are complete.

select 'public_base_tables' as check_name, count(*)::text as actual, '36' as expected
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE';

select 'primary_keys' as check_name, count(*)::text as actual, '36' as expected
from information_schema.table_constraints
where table_schema = 'public'
  and constraint_type = 'PRIMARY KEY';

select 'public_policies' as check_name, count(*)::text as actual, 'about 100' as expected
from pg_policies
where schemaname = 'public';

select 'public_functions' as check_name, count(*)::text as actual, '4+' as expected
from information_schema.routines
where routine_schema = 'public';

select 'public_triggers' as check_name, count(*)::text as actual, '7+' as expected
from information_schema.triggers
where trigger_schema = 'public';

select 'missing_primary_keys' as check_name, coalesce(string_agg(t.table_name, ', ' order by t.table_name), 'none') as actual, 'none' as expected
from information_schema.tables t
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
  and not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.table_schema = t.table_schema
      and tc.table_name = t.table_name
      and tc.constraint_type = 'PRIMARY KEY'
  );
