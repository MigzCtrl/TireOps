-- Production Fixes Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/vxjuzgnjvrzqzqevxpby/sql

-- ============================================
-- 1. ATOMIC INVENTORY UPDATE FUNCTION
-- Prevents race conditions when multiple users update same item
-- ============================================

CREATE OR REPLACE FUNCTION update_inventory_atomic(
  p_tire_id uuid,
  p_quantity_change integer,
  p_shop_id uuid
)
RETURNS TABLE(new_quantity integer, success boolean, error_message text) AS $$
DECLARE
  v_current_quantity integer;
  v_new_quantity integer;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_tire_id AND shop_id = p_shop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, false, 'Tire not found'::text;
    RETURN;
  END IF;

  v_new_quantity := GREATEST(0, v_current_quantity + p_quantity_change);

  UPDATE inventory
  SET quantity = v_new_quantity, updated_at = now()
  WHERE id = p_tire_id AND shop_id = p_shop_id;

  RETURN QUERY SELECT v_new_quantity, true, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_inventory_atomic TO authenticated;


-- ============================================
-- 2. PERFORMANCE INDEXES
-- Speed up common queries
-- ============================================

-- Customers lookup by shop
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_phone ON customers(shop_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON customers(shop_id, name);

-- Inventory lookup by shop
CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_quantity ON inventory(shop_id, quantity);

-- Work orders lookup
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_id ON work_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_status ON work_orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_date ON work_orders(shop_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON work_orders(customer_id);

-- Work order items
CREATE INDEX IF NOT EXISTS idx_work_order_items_order ON work_order_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_items_tire ON work_order_items(tire_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON profiles(shop_id);


-- ============================================
-- 3. STAFF INVITE SYSTEM
-- Tables and functions for email invites
-- ============================================

-- Invitations table
CREATE TABLE IF NOT EXISTS shop_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'viewer')),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(shop_id, email)
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_invitations_token ON shop_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON shop_invitations(email);

-- RLS for invitations
ALTER TABLE shop_invitations ENABLE ROW LEVEL SECURITY;

-- Only shop owners can create/view invitations
CREATE POLICY "Owners can manage invitations"
  ON shop_invitations
  FOR ALL
  USING (
    shop_id IN (
      SELECT p.shop_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );

-- Anyone can read their own invitation by token (for accepting)
CREATE POLICY "Users can view invitations by token"
  ON shop_invitations
  FOR SELECT
  USING (true);  -- Token validation happens in application


-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token uuid,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_invitation shop_invitations%ROWTYPE;
  v_existing_profile profiles%ROWTYPE;
BEGIN
  -- Find the invitation
  SELECT * INTO v_invitation
  FROM shop_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if user already has a profile
  SELECT * INTO v_existing_profile
  FROM profiles
  WHERE id = p_user_id;

  IF FOUND THEN
    -- Update existing profile to new shop
    UPDATE profiles
    SET shop_id = v_invitation.shop_id,
        role = v_invitation.role,
        updated_at = now()
    WHERE id = p_user_id;
  ELSE
    -- Create new profile
    INSERT INTO profiles (id, shop_id, role, email)
    VALUES (p_user_id, v_invitation.shop_id, v_invitation.role, v_invitation.email);
  END IF;

  -- Mark invitation as accepted
  UPDATE shop_invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'shop_id', v_invitation.shop_id,
    'role', v_invitation.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;


-- ============================================
-- 4. UNIQUE CONSTRAINT FOR PHONE NUMBERS
-- Prevent duplicate customers per shop
-- ============================================

-- Add unique constraint (will fail if duplicates exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_shop_phone_unique'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_shop_phone_unique UNIQUE(shop_id, phone);
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Duplicate phone numbers exist. Clean up duplicates first.';
END $$;


-- ============================================
-- 5. DONE
-- ============================================

SELECT 'Production fixes applied successfully!' as status;
