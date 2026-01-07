-- Migration: Add settings columns to shops table
-- Run this in Supabase SQL Editor

-- Add new columns to shops table for settings
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Add comments for documentation
COMMENT ON COLUMN shops.tax_rate IS 'Default tax rate percentage (e.g., 8.25 for 8.25%)';
COMMENT ON COLUMN shops.currency IS 'Currency code (USD, EUR, GBP, etc.)';
COMMENT ON COLUMN shops.email_notifications IS 'Whether email notifications are enabled';
COMMENT ON COLUMN shops.low_stock_threshold IS 'Threshold for low stock alerts';

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name IN ('tax_rate', 'currency', 'email_notifications', 'low_stock_threshold');
