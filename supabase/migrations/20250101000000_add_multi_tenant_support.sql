-- =====================================================
-- PHASE 1: Multi-Tenant Foundation Schema Migration
-- =====================================================
-- This migration adds multi-tenant support with shop isolation
-- and role-based access control

-- 1. CREATE SHOPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for owner lookups
CREATE INDEX IF NOT EXISTS idx_shops_owner ON public.shops(owner_id);

-- Enable RLS on shops
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- 2. CREATE PROFILES TABLE
-- =====================================================
-- Links users to shops and defines their role
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

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_shop ON public.profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(shop_id, role);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. ADD SHOP_ID TO EXISTING TABLES
-- =====================================================

-- Add shop_id to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- Add shop_id to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- Add shop_id to work_orders table
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- 4. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_shop ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON public.customers(shop_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_shop_created ON public.customers(shop_id, created_at DESC);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_shop ON public.inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_brand ON public.inventory(shop_id, brand, model);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_quantity ON public.inventory(shop_id, quantity);

-- Work orders indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_shop ON public.work_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_date ON public.work_orders(shop_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_status ON public.work_orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON public.work_orders(customer_id);

-- 5. CREATE HELPER FUNCTIONS FOR RLS
-- =====================================================
-- NOTE: Creating in public schema (not auth) due to Supabase permissions

-- Function to get current user's shop_id
CREATE OR REPLACE FUNCTION public.user_shop_id()
RETURNS UUID AS $$
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user is shop owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
    SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user can edit (owner or staff)
CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS BOOLEAN AS $$
    SELECT role IN ('owner', 'staff') FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 6. UPDATED_AT TRIGGERS
-- =====================================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables
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

-- Insert a default shop for migration purposes
INSERT INTO public.shops (id, name, email)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Default Shop',
    'admin@example.com'
)
ON CONFLICT (id) DO NOTHING;

-- Assign all existing customers to default shop
UPDATE public.customers
SET shop_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE shop_id IS NULL;

-- Assign all existing inventory to default shop
UPDATE public.inventory
SET shop_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE shop_id IS NULL;

-- Assign all existing work_orders to default shop
UPDATE public.work_orders
SET shop_id = '00000000-0000-0000-0000-000000000001'::UUID
WHERE shop_id IS NULL;

-- 8. MAKE SHOP_ID REQUIRED (after data migration)
-- =====================================================

-- Now that all rows have shop_id, make it NOT NULL
ALTER TABLE public.customers ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.work_orders ALTER COLUMN shop_id SET NOT NULL;

-- 9. BASIC RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Shops RLS: Users can only see/manage their own shop
CREATE POLICY "Users can view their shop"
    ON public.shops FOR SELECT
    USING (id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Owners can update their shop"
    ON public.shops FOR UPDATE
    USING (id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
    WITH CHECK (id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

-- Profiles RLS: Users can view profiles in their shop
CREATE POLICY "Users can view shop profiles"
    ON public.profiles FOR SELECT
    USING (shop_id = public.user_shop_id());

CREATE POLICY "Owners can manage shop profiles"
    ON public.profiles FOR ALL
    USING (shop_id = public.user_shop_id() AND public.is_owner())
    WITH CHECK (shop_id = public.user_shop_id() AND public.is_owner());

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next step: Run the RLS policies migration for customers, inventory, and work_orders
