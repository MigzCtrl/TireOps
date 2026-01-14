-- Add subscription fields to shops table
-- Run this migration in Supabase SQL Editor

-- Add Stripe customer ID
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add subscription fields
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shops_stripe_customer_id ON shops(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_shops_subscription_status ON shops(subscription_status);

-- Add comment for documentation
COMMENT ON COLUMN shops.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN shops.subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN shops.subscription_status IS 'Current subscription status: none, active, past_due, canceled, trialing';
COMMENT ON COLUMN shops.subscription_tier IS 'Subscription tier: basic, pro, enterprise';
COMMENT ON COLUMN shops.subscription_current_period_end IS 'End date of current billing period';
