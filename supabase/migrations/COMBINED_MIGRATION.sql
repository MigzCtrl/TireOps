-- =====================================================
-- COMBINED MULTI-TENANT SECURITY MIGRATION
-- =====================================================
-- Run this single file in Supabase SQL Editor
-- This replaces both previous migration files

-- 1. CREATE SHOPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_owner ON public.shops(owner_id);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- 2. CREATE PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'staff', 'viewer')),
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id)
);

CREATE INDEX IF NOT EXISTS idx_profiles_shop ON public.profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(shop_id, role);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. ADD SHOP_ID TO EXISTING TABLES
-- =====================================================
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- 4. CREATE HELPER FUNCTIONS (in public schema, not auth)
-- =====================================================

-- Get current user's shop_id
CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT shop_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid();
$$;

-- Check if user can edit (owner or staff)
CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role IN ('owner', 'staff') FROM public.profiles WHERE id = auth.uid();
$$;

-- 5. CREATE PERFORMANCE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_shop ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON public.customers(shop_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_shop_created ON public.customers(shop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_shop ON public.inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_brand ON public.inventory(shop_id, brand, model);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_quantity ON public.inventory(shop_id, quantity);

CREATE INDEX IF NOT EXISTS idx_work_orders_shop ON public.work_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_date ON public.work_orders(shop_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_status ON public.work_orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON public.work_orders(customer_id);

-- 6. UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shops_updated_at ON public.shops;
CREATE TRIGGER update_shops_updated_at
    BEFORE UPDATE ON public.shops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. CREATE DEFAULT SHOP FOR EXISTING DATA
-- =====================================================
INSERT INTO public.shops (id, name, email)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Default Shop',
    'admin@example.com'
)
ON CONFLICT (id) DO NOTHING;

-- Assign all existing data to default shop
UPDATE public.customers
SET shop_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE shop_id IS NULL;

UPDATE public.inventory
SET shop_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE shop_id IS NULL;

UPDATE public.work_orders
SET shop_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE shop_id IS NULL;

-- 8. MAKE SHOP_ID REQUIRED
-- =====================================================
ALTER TABLE public.customers ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.work_orders ALTER COLUMN shop_id SET NOT NULL;

-- 9. DROP OLD INSECURE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Enable all operations for customers" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable all operations for inventory" ON public.inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory;
DROP POLICY IF EXISTS "public_read_inventory" ON public.inventory;
DROP POLICY IF EXISTS "Enable all operations for work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.work_orders;

-- 10. CUSTOMERS RLS POLICIES
-- =====================================================
CREATE POLICY "View shop customers"
    ON public.customers FOR SELECT
    USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Create customers"
    ON public.customers FOR INSERT
    WITH CHECK (
        shop_id = public.get_user_shop_id()
        AND public.can_edit()
    );

CREATE POLICY "Update customers"
    ON public.customers FOR UPDATE
    USING (shop_id = public.get_user_shop_id())
    WITH CHECK (
        shop_id = public.get_user_shop_id()
        AND public.can_edit()
    );

CREATE POLICY "Delete customers"
    ON public.customers FOR DELETE
    USING (
        shop_id = public.get_user_shop_id()
        AND public.is_owner()
    );

-- 11. INVENTORY RLS POLICIES
-- =====================================================
CREATE POLICY "View shop inventory"
    ON public.inventory FOR SELECT
    USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Create inventory"
    ON public.inventory FOR INSERT
    WITH CHECK (
        shop_id = public.get_user_shop_id()
        AND public.is_owner()
    );

CREATE POLICY "Update inventory"
    ON public.inventory FOR UPDATE
    USING (shop_id = public.get_user_shop_id())
    WITH CHECK (
        shop_id = public.get_user_shop_id()
        AND public.is_owner()
    );

CREATE POLICY "Delete inventory"
    ON public.inventory FOR DELETE
    USING (
        shop_id = public.get_user_shop_id()
        AND public.is_owner()
    );

-- 12. WORK ORDERS RLS POLICIES
-- =====================================================
CREATE POLICY "View shop orders"
    ON public.work_orders FOR SELECT
    USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Create work orders"
    ON public.work_orders FOR INSERT
    WITH CHECK (
        shop_id = public.get_user_shop_id()
        AND public.can_edit()
    );

CREATE POLICY "Update work orders"
    ON public.work_orders FOR UPDATE
    USING (shop_id = public.get_user_shop_id())
    WITH CHECK (
        shop_id = public.get_user_shop_id()
        AND public.can_edit()
    );

CREATE POLICY "Delete work orders"
    ON public.work_orders FOR DELETE
    USING (
        shop_id = public.get_user_shop_id()
        AND public.is_owner()
    );

-- 13. TASKS TABLE RLS (Update existing)
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users manage own tasks"
    ON public.tasks FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 14. SHOPS RLS POLICIES
-- =====================================================
CREATE POLICY "Users can view their shop"
    ON public.shops FOR SELECT
    USING (id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Owners can update their shop"
    ON public.shops FOR UPDATE
    USING (id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
    WITH CHECK (id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

-- 15. PROFILES RLS POLICIES
-- =====================================================
CREATE POLICY "Users can view shop profiles"
    ON public.profiles FOR SELECT
    USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Owners can manage shop profiles"
    ON public.profiles FOR ALL
    USING (shop_id = public.get_user_shop_id() AND public.is_owner())
    WITH CHECK (shop_id = public.get_user_shop_id() AND public.is_owner());

-- 16. ENSURE RLS IS ENABLED
-- =====================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 17. GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.work_orders TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.shops TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Next step: Create your shop and profile (see below)
