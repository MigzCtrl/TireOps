-- =====================================================
-- Add Missing Database Indexes for Performance
-- =====================================================
-- This migration adds indexes on foreign keys and frequently
-- queried columns to improve query performance

-- ==========================================
-- CUSTOMERS TABLE INDEXES
-- ==========================================

-- Index on shop_id for filtering customers by shop
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);

-- Index on email for quick customer lookup
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email) WHERE email IS NOT NULL;

-- Index on phone for quick customer lookup
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Index on created_at for sorting by registration date
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);

-- ==========================================
-- WORK ORDERS TABLE INDEXES
-- ==========================================

-- Index on shop_id for filtering work orders by shop
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_id ON public.work_orders(shop_id);

-- Index on customer_id (foreign key) for joining with customers
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id) WHERE customer_id IS NOT NULL;

-- Index on tire_id (foreign key) for joining with inventory
CREATE INDEX IF NOT EXISTS idx_work_orders_tire_id ON public.work_orders(tire_id) WHERE tire_id IS NOT NULL;

-- Composite index on scheduled_date and scheduled_time for calendar queries
CREATE INDEX IF NOT EXISTS idx_work_orders_schedule ON public.work_orders(scheduled_date, scheduled_time);

-- Index on status for filtering by order status
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);

-- Index on created_at for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.work_orders(created_at DESC);

-- Composite index on shop_id and status for common filtered queries
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_status ON public.work_orders(shop_id, status);

-- Composite index on shop_id and scheduled_date for dashboard queries
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_date ON public.work_orders(shop_id, scheduled_date);

-- ==========================================
-- WORK ORDER ITEMS TABLE INDEXES
-- ==========================================

-- Index on work_order_id already exists (created in add_work_order_items.sql)
-- Verify it exists:
CREATE INDEX IF NOT EXISTS idx_work_order_items_work_order_id ON public.work_order_items(work_order_id);

-- Index on tire_id (foreign key) for joining with inventory
CREATE INDEX IF NOT EXISTS idx_work_order_items_tire_id ON public.work_order_items(tire_id);

-- Composite index on work_order_id and tire_id for joins
CREATE INDEX IF NOT EXISTS idx_work_order_items_composite ON public.work_order_items(work_order_id, tire_id);

-- ==========================================
-- INVENTORY TABLE INDEXES
-- ==========================================

-- Index on shop_id for filtering inventory by shop
CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON public.inventory(shop_id);

-- Index on brand for filtering by tire brand
CREATE INDEX IF NOT EXISTS idx_inventory_brand ON public.inventory(brand);

-- Index on size for filtering by tire size
CREATE INDEX IF NOT EXISTS idx_inventory_size ON public.inventory(size);

-- Index on quantity for low stock alerts
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON public.inventory(quantity);

-- Index on SKU for quick lookup
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku) WHERE sku IS NOT NULL;

-- Composite index on shop_id and quantity for low stock queries
CREATE INDEX IF NOT EXISTS idx_inventory_shop_quantity ON public.inventory(shop_id, quantity);

-- Composite index on brand, model, size for searching
CREATE INDEX IF NOT EXISTS idx_inventory_search ON public.inventory(brand, model, size);

-- ==========================================
-- PROFILES TABLE INDEXES
-- ==========================================

-- Index on shop_id (foreign key) for joining with shops
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON public.profiles(shop_id);

-- Index on role for filtering by user role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Composite index on shop_id and role for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_shop_role ON public.profiles(shop_id, role);

-- ==========================================
-- TASKS TABLE INDEXES
-- ==========================================

-- Indexes already exist from create_tasks_table.sql and shop_id migration:
-- - idx_tasks_user_id
-- - idx_tasks_completed
-- - idx_tasks_shop_id
-- Verify they exist:
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_shop_id ON public.tasks(shop_id);

-- Composite index on shop_id and completed for filtered queries
CREATE INDEX IF NOT EXISTS idx_tasks_shop_completed ON public.tasks(shop_id, completed);

-- ==========================================
-- SHOPS TABLE INDEXES
-- ==========================================

-- Index on name for searching shops
CREATE INDEX IF NOT EXISTS idx_shops_name ON public.shops(name);

-- Index on created_at for sorting by registration date
CREATE INDEX IF NOT EXISTS idx_shops_created_at ON public.shops(created_at DESC);

-- =====================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================

-- Update table statistics for the query planner
ANALYZE public.customers;
ANALYZE public.work_orders;
ANALYZE public.work_order_items;
ANALYZE public.inventory;
ANALYZE public.profiles;
ANALYZE public.tasks;
ANALYZE public.shops;

-- =====================================================
-- INDEXES COMPLETE
-- =====================================================
-- All critical foreign keys and frequently queried columns now have indexes
-- This should significantly improve query performance across the application
