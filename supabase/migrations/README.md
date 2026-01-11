# Database Migrations

This directory contains all database migrations for the Tire Shop MVP application. Migrations are applied manually through the Supabase SQL Editor since the Supabase CLI is not configured in this project.

## Overview

The Tire Shop MVP uses PostgreSQL via Supabase with Row Level Security (RLS) for multi-tenant data isolation. Each shop's data is completely isolated using the `shop_id` column and RLS policies that enforce access control based on user roles.

## Migration Files

### Core Migrations (Chronological Order)

| File | Date | Status | Description |
|------|------|--------|-------------|
| `00_CLEANUP_BEFORE_MIGRATION.sql` | Pre-migration | One-time | Cleanup script to remove old policies and functions before applying core migrations |
| `20250101000000_add_multi_tenant_support.sql` | 2025-01-01 | Applied | Creates shops and profiles tables, adds shop_id to all tables, creates helper functions |
| `20250101000001_secure_rls_policies.sql` | 2025-01-01 | Applied | Replaces insecure policies with role-based, shop-isolated RLS policies |
| `20250101000002_fix_work_order_items_rls.sql` | 2025-01-01 | Applied | Fixes critical security issue in work_order_items RLS policies |
| `20250101000003_add_shop_id_to_tasks.sql` | 2025-01-01 | Applied | Migrates tasks from user-scoped to shop-scoped for team collaboration |
| `20250101000004_add_missing_indexes.sql` | 2025-01-01 | Applied | Adds performance indexes on foreign keys and frequently queried columns |
| `20240104_transaction_functions.sql` | 2024-01-04 | Applied | Creates database functions for atomic transactions (work orders, inventory) |
| `20240105_shop_settings.sql` | 2024-01-05 | Applied | Adds settings columns to shops table (tax_rate, currency, etc.) |
| `20250106_production_fixes.sql` | 2025-01-06 | Applied | Production fixes: atomic inventory updates, staff invitations, unique constraints |
| `20260108_add_customer_vehicles.sql` | 2026-01-08 | Applied | Creates customer_vehicles table for tracking customer vehicle information |

### Legacy/Feature Migrations (Non-Standard Naming)

These migrations were created during early development and don't follow the timestamp naming convention:

| File | Purpose | Notes |
|------|---------|-------|
| `add_work_order_items.sql` | Creates work_order_items table | Superseded by later RLS fixes |
| `create_tasks_table.sql` | Creates tasks table | Superseded by shop_id migration |
| `update_tasks_for_auth.sql` | Updates tasks RLS for auth | Superseded by shop-scoped migration |
| `create_profile_on_signup.sql` | Creates trigger for new user signup | Should be applied after multi-tenant setup |

### Documentation Files

| File | Purpose |
|------|---------|
| `APPLY_MIGRATIONS.md` | Instructions for applying migrations manually via Supabase dashboard |
| `README.md` | This file - comprehensive migration documentation |

## Naming Convention

**Standard Format:** `YYYYMMDD_HHMMSS_description.sql` or `YYYYMMDDHHMMSS_description.sql`

Examples:
- `20250101000000_add_multi_tenant_support.sql`
- `20250106_production_fixes.sql`

**Rules:**
- Use ISO 8601 date format (YYYYMMDD)
- Optional timestamp (HHMMSS) for same-day migrations
- Use underscores and lowercase for description
- Be descriptive but concise (e.g., `add_customer_vehicles`, `fix_rls_policies`)

## How to Create New Migrations

### Using Supabase CLI (Recommended - if configured)

```bash
npx supabase migration new <description>
```

This will create a file like: `20250109123045_description.sql`

### Manual Creation

1. Create a new `.sql` file following the naming convention
2. Use the current date and time for the timestamp
3. Add descriptive SQL comments at the top
4. Include all necessary DDL statements

### Migration Template

```sql
-- =====================================================
-- Migration: [Brief Title]
-- Date: YYYY-MM-DD
-- =====================================================
-- Description of what this migration does and why

-- 1. [SECTION NAME]
-- =====================================================
-- Detailed comments about this section

-- Your SQL here...

-- 2. [NEXT SECTION]
-- =====================================================

-- More SQL...

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Any post-migration notes or next steps
```

## Best Practices

### Multi-Tenant Isolation

When creating new tables that store tenant-specific data:

```sql
-- 1. Add shop_id column
ALTER TABLE your_table
ADD COLUMN shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE;

-- 2. Add index for performance
CREATE INDEX idx_your_table_shop_id ON your_table(shop_id);

-- 3. Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "Users can view their shop's data"
    ON your_table FOR SELECT
    USING (shop_id = public.user_shop_id());

CREATE POLICY "Owners and staff can create data"
    ON your_table FOR INSERT
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- Similar for UPDATE and DELETE...
```

### Row Level Security (RLS)

Always create RLS policies for new tables. Never use `USING (true)` in production.

**Available Helper Functions:**
- `public.user_shop_id()` - Returns current user's shop_id
- `public.user_role()` - Returns current user's role
- `public.is_owner()` - Returns true if user is owner
- `public.can_edit()` - Returns true if user is owner or staff

**Common Policy Patterns:**

```sql
-- All users in shop can view
CREATE POLICY "View shop data"
    ON table_name FOR SELECT
    USING (shop_id = public.user_shop_id());

-- Only owner and staff can create
CREATE POLICY "Create data"
    ON table_name FOR INSERT
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- Only owner can delete
CREATE POLICY "Delete data"
    ON table_name FOR DELETE
    USING (
        shop_id = public.user_shop_id()
        AND public.is_owner()
    );
```

### Indexes

Add indexes for:
- **Foreign keys:** Always index foreign key columns
- **Frequently queried columns:** status, email, phone, dates
- **Composite indexes:** For common multi-column queries

```sql
-- Single column index
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);

-- Composite index (order matters!)
CREATE INDEX IF NOT EXISTS idx_table_shop_status
    ON table_name(shop_id, status);

-- Partial index (for sparse data)
CREATE INDEX IF NOT EXISTS idx_table_email
    ON table_name(email) WHERE email IS NOT NULL;
```

### Transactions

For complex operations, use database functions with transactions:

```sql
CREATE OR REPLACE FUNCTION do_complex_operation(
  p_param1 UUID,
  p_param2 TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- All operations here are atomic
  -- If any fail, all rollback

  INSERT INTO table1 ...;
  UPDATE table2 ...;
  DELETE FROM table3 ...;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION do_complex_operation TO authenticated;
```

### Updated_at Triggers

For tables with an `updated_at` column:

```sql
-- Create or reuse the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to your table
CREATE TRIGGER update_table_updated_at
    BEFORE UPDATE ON your_table
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## How to Apply Migrations

Since Supabase CLI is not configured, migrations must be applied manually:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of the migration file
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl+Enter)
8. Verify no errors occurred

### Applying Multiple Migrations

Apply migrations in chronological order (by filename timestamp). If a migration depends on another, ensure the dependency is applied first.

### Verifying Migrations

After applying a migration, verify it worked:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'your_table';

-- Check policies exist
SELECT policyname, tablename, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'your_table';

-- Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'your_table';

-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'your_table'
ORDER BY ordinal_position;
```

## Rollback Strategy

Database migrations should be **forward-only** when possible. Avoid rollback migrations unless absolutely necessary.

### If Something Goes Wrong

1. **Don't panic** - Supabase has automatic backups
2. **Document the issue** - What went wrong? What was the error?
3. **Create a fix-forward migration** - Don't try to undo, create a new migration that fixes the issue
4. **Test in development first** - Never test fixes directly in production

### Emergency Rollback

If you must rollback a migration:

```sql
-- Example: Rollback adding a column
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;

-- Example: Rollback creating a table
DROP TABLE IF EXISTS table_name CASCADE;

-- Example: Rollback creating a policy
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

**Important:** Rollbacks can cause data loss. Always backup before attempting rollbacks.

## Common Migration Patterns

### Adding a New Table

```sql
-- 1. Create table with standard columns
CREATE TABLE IF NOT EXISTS table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_table_shop ON table_name(shop_id);
CREATE INDEX IF NOT EXISTS idx_table_created ON table_name(created_at DESC);

-- 3. Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 4. Create policies (see RLS section above)

-- 5. Add updated_at trigger
CREATE TRIGGER update_table_updated_at
    BEFORE UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Grant permissions
GRANT ALL ON table_name TO authenticated;
```

### Adding a Column

```sql
-- Add column (nullable first if data exists)
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name TEXT;

-- Populate data if needed
UPDATE table_name SET column_name = 'default_value' WHERE column_name IS NULL;

-- Make NOT NULL if required
ALTER TABLE table_name
ALTER COLUMN column_name SET NOT NULL;

-- Add index if frequently queried
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);
```

### Adding a Foreign Key

```sql
-- Add column
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS foreign_id UUID REFERENCES other_table(id) ON DELETE CASCADE;

-- Add index (ALWAYS index foreign keys)
CREATE INDEX IF NOT EXISTS idx_table_foreign ON table_name(foreign_id);

-- Add constraint if not added above
ALTER TABLE table_name
ADD CONSTRAINT fk_table_foreign
FOREIGN KEY (foreign_id) REFERENCES other_table(id) ON DELETE CASCADE;
```

### Adding a Unique Constraint

```sql
-- Check for duplicates first
SELECT column_name, COUNT(*)
FROM table_name
GROUP BY column_name
HAVING COUNT(*) > 1;

-- Add unique constraint
ALTER TABLE table_name
ADD CONSTRAINT table_column_unique UNIQUE(column_name);

-- Or composite unique constraint
ALTER TABLE table_name
ADD CONSTRAINT table_columns_unique UNIQUE(shop_id, column_name);
```

## Troubleshooting

### Common Issues

**Issue:** "relation already exists"
- **Solution:** Use `CREATE TABLE IF NOT EXISTS` or check if table already exists

**Issue:** "column already exists"
- **Solution:** Use `ADD COLUMN IF NOT EXISTS`

**Issue:** "constraint already exists"
- **Solution:** Use `DROP CONSTRAINT IF EXISTS` before adding, or check existence first

**Issue:** "permission denied"
- **Solution:** Ensure you're running migrations with proper database role, grant permissions

**Issue:** "foreign key violation"
- **Solution:** Ensure referenced data exists, or use `ON DELETE CASCADE/SET NULL`

**Issue:** "RLS policy prevents operation"
- **Solution:** Check if RLS policies are correctly configured, verify helper functions work

### Debugging RLS Policies

```sql
-- See all policies on a table
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test a policy manually
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'user-uuid-here';
SELECT * FROM your_table; -- Should respect RLS

-- Reset role
RESET ROLE;
```

## Migration History Tracking

While Supabase tracks applied migrations automatically when using the CLI, for manual migrations you should:

1. Keep a log of applied migrations (date, who applied, any issues)
2. Update this README when adding new migrations
3. Document any migration failures and how they were resolved

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Database Indexes](https://www.postgresql.org/docs/current/indexes.html)

## Questions or Issues?

If you encounter issues with migrations:

1. Check the migration file for syntax errors
2. Verify dependencies are applied first
3. Check the Supabase logs for detailed error messages
4. Review existing migrations for similar patterns
5. Test in a development environment first

---

**Last Updated:** 2026-01-09
