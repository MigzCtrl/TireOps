-- =====================================================
-- P0 PRODUCTION FIXES
-- Run this migration to fix critical issues before launch
-- =====================================================

-- 1. PREVENT DOUBLE-BOOKING WITH UNIQUE CONSTRAINT
-- =====================================================
-- This prevents two work orders from being scheduled at the same time
-- for the same shop. Uses a partial index to exclude cancelled orders.

-- First, clean up any existing duplicate bookings (keep the oldest one)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY shop_id, scheduled_date, scheduled_time
    ORDER BY created_at ASC
  ) as rn
  FROM work_orders
  WHERE status != 'cancelled'
    AND scheduled_date IS NOT NULL
    AND scheduled_time IS NOT NULL
)
UPDATE work_orders
SET status = 'cancelled', notes = COALESCE(notes, '') || ' [Auto-cancelled: duplicate booking]'
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Create partial unique index (only for non-cancelled orders)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_booking_slot
ON work_orders (shop_id, scheduled_date, scheduled_time)
WHERE status != 'cancelled';

-- 2. WEBHOOK IDEMPOTENCY TABLE
-- =====================================================
-- Track processed Stripe webhook events to prevent duplicate processing

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- Auto-cleanup: remove events older than 30 days
-- (Run this periodically or set up a cron job)
-- DELETE FROM webhook_events WHERE processed_at < NOW() - INTERVAL '30 days';

-- 3. PERFORMANCE INDEXES
-- =====================================================
-- Add indexes for common query patterns

-- Customers by shop (most common filter)
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);

-- Work orders by shop + status (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_status ON work_orders(shop_id, status);

-- Work orders by shop + date (calendar/scheduling queries)
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_date ON work_orders(shop_id, scheduled_date);

-- Inventory by shop
CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON inventory(shop_id);

-- Profiles by shop (team management)
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON profiles(shop_id);

-- 4. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON webhook_events TO authenticated;
GRANT ALL ON webhook_events TO service_role;

-- =====================================================
-- VERIFICATION QUERIES (run after migration)
-- =====================================================
-- Check unique constraint:
-- SELECT shop_id, scheduled_date, scheduled_time, COUNT(*)
-- FROM work_orders WHERE status != 'cancelled'
-- GROUP BY shop_id, scheduled_date, scheduled_time HAVING COUNT(*) > 1;

-- Check indexes:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('customers', 'work_orders', 'inventory', 'vehicles', 'profiles', 'webhook_events');
