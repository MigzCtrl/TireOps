-- Tire Shop MVP Row Level Security Policies
-- Run this AFTER running SCHEMA.sql

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_lines ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SHOPS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their shop"
  ON shops FOR SELECT
  USING (id = get_user_shop_id());

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view profiles in their shop"
  ON profiles FOR SELECT
  USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================================
-- CUSTOMERS POLICIES
-- ============================================================================

CREATE POLICY "Users can view customers in their shop"
  ON customers FOR SELECT
  USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can insert customers in their shop"
  ON customers FOR INSERT
  WITH CHECK (shop_id = get_user_shop_id());

CREATE POLICY "Users can update customers in their shop"
  ON customers FOR UPDATE
  USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can delete customers in their shop"
  ON customers FOR DELETE
  USING (shop_id = get_user_shop_id());

-- ============================================================================
-- VEHICLES POLICIES
-- ============================================================================

CREATE POLICY "Users can view vehicles in their shop"
  ON vehicles FOR SELECT
  USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can insert vehicles in their shop"
  ON vehicles FOR INSERT
  WITH CHECK (shop_id = get_user_shop_id());

CREATE POLICY "Users can update vehicles in their shop"
  ON vehicles FOR UPDATE
  USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can delete vehicles in their shop"
  ON vehicles FOR DELETE
  USING (shop_id = get_user_shop_id());

-- ============================================================================
-- INVENTORY POLICIES
-- ============================================================================

CREATE POLICY "Users can view inventory in their shop"
  ON inventory FOR SELECT
  USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can insert inventory in their shop"
  ON inventory FOR INSERT
  WITH CHECK (shop_id = get_user_shop_id());

CREATE POLICY "Users can update inventory in their shop"
  ON inventory FOR UPDATE
  USING (shop_id = get_user_shop_id());

CREATE POLICY "Only owners can delete inventory"
  ON inventory FOR DELETE
  USING (shop_id = get_user_shop_id() AND is_owner());

-- ============================================================================
-- WORK ORDERS POLICIES
-- ============================================================================

CREATE POLICY "Users can view work orders in their shop"
  ON work_orders FOR SELECT
  USING (shop_id = get_user_shop_id());

CREATE POLICY "Users can insert work orders in their shop"
  ON work_orders FOR INSERT
  WITH CHECK (shop_id = get_user_shop_id());

CREATE POLICY "Users can update work orders in their shop"
  ON work_orders FOR UPDATE
  USING (shop_id = get_user_shop_id());

-- ============================================================================
-- WORK ORDER LINES POLICIES
-- ============================================================================

-- Access via work_order's shop
CREATE POLICY "Users can view work order lines in their shop"
  ON work_order_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_lines.work_order_id
      AND wo.shop_id = get_user_shop_id()
    )
  );

CREATE POLICY "Users can insert work order lines in their shop"
  ON work_order_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_lines.work_order_id
      AND wo.shop_id = get_user_shop_id()
    )
  );

CREATE POLICY "Users can update work order lines in their shop"
  ON work_order_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_lines.work_order_id
      AND wo.shop_id = get_user_shop_id()
    )
  );

-- ============================================================================
-- POLICY COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view their shop" ON shops IS
  'Users can only see the shop they belong to';

COMMENT ON POLICY "Only owners can delete inventory" ON inventory IS
  'Prevents staff from accidentally deleting inventory items';

COMMENT ON POLICY "Users can view work order lines in their shop" ON work_order_lines IS
  'Access control inherited from parent work_order shop_id';
