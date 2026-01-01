# How to Apply Migrations

Since Supabase CLI is not configured in this project, migrations must be applied manually through the Supabase dashboard.

## Steps to Apply a Migration:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of the migration file you want to apply
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify the migration was successful (no errors shown)

## Migration Order:

Apply migrations in chronological order based on their timestamp prefix:

1. `20250101000000_add_multi_tenant_support.sql`
2. `20250101000001_secure_rls_policies.sql`
3. **`20250101000002_fix_work_order_items_rls.sql`** ← **APPLY THIS NEXT (CRITICAL)**
4. **`20250101000003_add_shop_id_to_tasks.sql`** ← **APPLY THIS NEXT (CRITICAL)**
5. **`20250101000004_add_missing_indexes.sql`** ← **APPLY THIS NEXT (HIGH PRIORITY)**
6. Additional migrations as they are created...

## Current Pending Migrations:

- **20250101000002_fix_work_order_items_rls.sql** - CRITICAL SECURITY FIX
  - Fixes the work_order_items table RLS policy that currently allows any user to access all data
  - Must be applied to production ASAP

- **20250101000003_add_shop_id_to_tasks.sql** - CRITICAL MULTI-TENANT FIX
  - Adds shop_id column to tasks table for proper multi-tenant isolation
  - Changes tasks from user-scoped to shop-scoped (all shop members see same tasks)
  - Frontend code has been updated to match this behavior
  - Must be applied to production ASAP

- **20250101000004_add_missing_indexes.sql** - HIGH PRIORITY PERFORMANCE FIX
  - Adds indexes on all foreign key columns
  - Adds indexes on commonly queried columns (status, email, phone, etc.)
  - Adds composite indexes for common query patterns
  - Updates table statistics for query planner
  - Should significantly improve query performance

## Verifying Migration Success:

After applying a migration, you can verify it worked by:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'work_order_items';

-- Check if policies exist
SELECT policyname, tablename, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'work_order_items';
```

Expected results after applying `20250101000002`:
- RLS should be enabled (`rowsecurity = true`)
- Four policies should exist: View, Create, Update, Delete
- Old "Enable all operations" policy should be gone
