-- =====================================================
-- PHASE 2: Secure RLS Policies
-- =====================================================
-- This migration replaces the insecure USING (true) policies
-- with proper role-based, shop-isolated security policies

-- 1. DROP OLD INSECURE POLICIES
-- =====================================================

-- Drop old customers policies
DROP POLICY IF EXISTS "Enable all operations for customers" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;

-- Drop old inventory policies
DROP POLICY IF EXISTS "Enable all operations for inventory" ON public.inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory;
DROP POLICY IF EXISTS "public_read_inventory" ON public.inventory;

-- Drop old work_orders policies
DROP POLICY IF EXISTS "Enable all operations for work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.work_orders;

-- 2. CUSTOMERS TABLE RLS POLICIES
-- =====================================================

-- SELECT: All roles can view their shop's customers
CREATE POLICY "View shop customers"
    ON public.customers FOR SELECT
    USING (shop_id = public.user_shop_id());

-- INSERT: Owner and Staff can create customers
CREATE POLICY "Create customers"
    ON public.customers FOR INSERT
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- UPDATE: Owner and Staff can update customers
CREATE POLICY "Update customers"
    ON public.customers FOR UPDATE
    USING (shop_id = public.user_shop_id())
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- DELETE: Only Owner can delete customers
CREATE POLICY "Delete customers"
    ON public.customers FOR DELETE
    USING (
        shop_id = public.user_shop_id()
        AND public.is_owner()
    );

-- 3. INVENTORY TABLE RLS POLICIES
-- =====================================================

-- SELECT: All roles can view their shop's inventory
CREATE POLICY "View shop inventory"
    ON public.inventory FOR SELECT
    USING (shop_id = public.user_shop_id());

-- INSERT: Only Owner can add inventory
CREATE POLICY "Create inventory"
    ON public.inventory FOR INSERT
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.is_owner()
    );

-- UPDATE: Only Owner can update inventory
CREATE POLICY "Update inventory"
    ON public.inventory FOR UPDATE
    USING (shop_id = public.user_shop_id())
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.is_owner()
    );

-- DELETE: Only Owner can delete inventory
CREATE POLICY "Delete inventory"
    ON public.inventory FOR DELETE
    USING (
        shop_id = public.user_shop_id()
        AND public.is_owner()
    );

-- 4. WORK ORDERS TABLE RLS POLICIES
-- =====================================================

-- SELECT: All roles can view their shop's work orders
CREATE POLICY "View shop orders"
    ON public.work_orders FOR SELECT
    USING (shop_id = public.user_shop_id());

-- INSERT: Owner and Staff can create work orders
CREATE POLICY "Create work orders"
    ON public.work_orders FOR INSERT
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- UPDATE: Owner and Staff can update work orders
CREATE POLICY "Update work orders"
    ON public.work_orders FOR UPDATE
    USING (shop_id = public.user_shop_id())
    WITH CHECK (
        shop_id = public.user_shop_id()
        AND public.can_edit()
    );

-- DELETE: Only Owner can delete work orders
CREATE POLICY "Delete work orders"
    ON public.work_orders FOR DELETE
    USING (
        shop_id = public.user_shop_id()
        AND public.is_owner()
    );

-- 5. TASKS TABLE RLS POLICIES (Update existing)
-- =====================================================

-- Drop old task policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- New task policies: users can only manage their own tasks
CREATE POLICY "Users manage own tasks"
    ON public.tasks FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 6. VERIFY RLS IS ENABLED
-- =====================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.work_orders TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.shops TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- =====================================================
-- SECURITY POLICIES COMPLETE
-- =====================================================
-- All tables now have proper shop isolation and role-based access
-- Next: Implement auth guards and update frontend code
