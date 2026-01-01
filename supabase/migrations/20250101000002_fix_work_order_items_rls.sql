-- =====================================================
-- Fix work_order_items RLS Policy (CRITICAL SECURITY)
-- =====================================================
-- The work_order_items table currently has an insecure
-- USING (true) policy that allows any user to access
-- all data across all shops. This migration fixes it.

-- 1. DROP OLD INSECURE POLICY
-- =====================================================

DROP POLICY IF EXISTS "Enable all operations for work_order_items" ON public.work_order_items;

-- 2. CREATE SECURE SHOP-ISOLATED POLICIES
-- =====================================================

-- SELECT: All roles can view work order items for their shop's work orders
CREATE POLICY "View shop work order items"
    ON public.work_order_items FOR SELECT
    USING (
        work_order_id IN (
            SELECT id FROM public.work_orders
            WHERE shop_id = auth.user_shop_id()
        )
    );

-- INSERT: Owner and Staff can create work order items for their shop's work orders
CREATE POLICY "Create work order items"
    ON public.work_order_items FOR INSERT
    WITH CHECK (
        work_order_id IN (
            SELECT id FROM public.work_orders
            WHERE shop_id = auth.user_shop_id()
        )
        AND auth.can_edit()
    );

-- UPDATE: Owner and Staff can update work order items for their shop's work orders
CREATE POLICY "Update work order items"
    ON public.work_order_items FOR UPDATE
    USING (
        work_order_id IN (
            SELECT id FROM public.work_orders
            WHERE shop_id = auth.user_shop_id()
        )
    )
    WITH CHECK (
        work_order_id IN (
            SELECT id FROM public.work_orders
            WHERE shop_id = auth.user_shop_id()
        )
        AND auth.can_edit()
    );

-- DELETE: Only Owner can delete work order items for their shop's work orders
CREATE POLICY "Delete work order items"
    ON public.work_order_items FOR DELETE
    USING (
        work_order_id IN (
            SELECT id FROM public.work_orders
            WHERE shop_id = auth.user_shop_id()
        )
        AND auth.is_owner()
    );

-- 3. VERIFY RLS IS ENABLED
-- =====================================================

ALTER TABLE public.work_order_items ENABLE ROW LEVEL SECURITY;

-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.work_order_items TO authenticated;

-- =====================================================
-- WORK ORDER ITEMS SECURITY COMPLETE
-- =====================================================
-- work_order_items now has proper shop isolation via work_orders table
