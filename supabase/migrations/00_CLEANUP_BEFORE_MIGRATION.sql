-- =====================================================
-- CLEANUP SCRIPT - Run this FIRST before applying migrations
-- =====================================================
-- This removes any existing policies/objects that might conflict
-- with the new migrations

-- Drop existing RLS policies
-- =====================================================

-- Shops table policies
DROP POLICY IF EXISTS "Users can view their shop" ON public.shops;
DROP POLICY IF EXISTS "Owners can update their shop" ON public.shops;

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view shop profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners can manage shop profiles" ON public.profiles;

-- Customers table policies
DROP POLICY IF EXISTS "Enable all operations for customers" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "View shop customers" ON public.customers;
DROP POLICY IF EXISTS "Create customers" ON public.customers;
DROP POLICY IF EXISTS "Update customers" ON public.customers;
DROP POLICY IF EXISTS "Delete customers" ON public.customers;

-- Inventory table policies
DROP POLICY IF EXISTS "Enable all operations for inventory" ON public.inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory;
DROP POLICY IF EXISTS "public_read_inventory" ON public.inventory;
DROP POLICY IF EXISTS "View shop inventory" ON public.inventory;
DROP POLICY IF EXISTS "Create inventory" ON public.inventory;
DROP POLICY IF EXISTS "Update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Delete inventory" ON public.inventory;

-- Work orders table policies
DROP POLICY IF EXISTS "Enable all operations for work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.work_orders;
DROP POLICY IF EXISTS "View shop orders" ON public.work_orders;
DROP POLICY IF EXISTS "Create work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Update work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Delete work orders" ON public.work_orders;

-- Work order items table policies
DROP POLICY IF EXISTS "Enable all operations for work_order_items" ON public.work_order_items;
DROP POLICY IF EXISTS "View shop work order items" ON public.work_order_items;
DROP POLICY IF EXISTS "Create work order items" ON public.work_order_items;
DROP POLICY IF EXISTS "Update work order items" ON public.work_order_items;
DROP POLICY IF EXISTS "Delete work order items" ON public.work_order_items;

-- Tasks table policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "View shop tasks" ON public.tasks;
DROP POLICY IF EXISTS "Create shop tasks" ON public.tasks;
DROP POLICY IF EXISTS "Update shop tasks" ON public.tasks;
DROP POLICY IF EXISTS "Delete shop tasks" ON public.tasks;

-- Drop old helper functions if they exist
-- =====================================================

DROP FUNCTION IF EXISTS auth.user_shop_id();
DROP FUNCTION IF EXISTS auth.user_role();
DROP FUNCTION IF EXISTS auth.is_owner();
DROP FUNCTION IF EXISTS auth.can_edit();
DROP FUNCTION IF EXISTS public.user_shop_id();
DROP FUNCTION IF EXISTS public.user_role();
DROP FUNCTION IF EXISTS public.is_owner();
DROP FUNCTION IF EXISTS public.can_edit();

-- =====================================================
-- CLEANUP COMPLETE
-- =====================================================
-- Now run the migrations in order:
-- 1. 20250101000000_add_multi_tenant_support.sql
-- 2. 20250101000001_secure_rls_policies.sql
-- 3. 20250101000002_fix_work_order_items_rls.sql
-- 4. 20250101000003_add_shop_id_to_tasks.sql
-- 5. 20250101000004_add_missing_indexes.sql
