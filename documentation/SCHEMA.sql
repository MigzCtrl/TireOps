-- Tire Shop MVP Database Schema
-- Run this first in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Shops table (for multi-location future)
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, phone)
);

CREATE INDEX idx_customers_phone ON customers(shop_id, phone);
CREATE INDEX idx_customers_name ON customers(shop_id, LOWER(full_name));

-- Vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  year INT,
  make TEXT,
  model TEXT,
  trim TEXT,
  tire_size TEXT,
  plate TEXT,
  vin TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sku TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  qty_on_hand INT NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  cost DECIMAL(10,2),
  price DECIMAL(10,2) NOT NULL,
  supplier TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_size ON inventory(shop_id, size);
CREATE INDEX idx_inventory_brand ON inventory(shop_id, brand);

-- Work Orders
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'done', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_work_orders_date ON work_orders(shop_id, scheduled_at);
CREATE INDEX idx_work_orders_status ON work_orders(shop_id, status);
CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);

-- Work Order Lines
CREATE TABLE work_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tire', 'service')),
  inventory_item_id UUID REFERENCES inventory(id),
  description TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tire_requires_inventory CHECK (
    type != 'tire' OR inventory_item_id IS NOT NULL
  )
);

CREATE INDEX idx_work_order_lines_order ON work_order_lines(work_order_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to create work order with lines (atomic transaction)
CREATE OR REPLACE FUNCTION create_work_order_with_lines(
  p_shop_id UUID,
  p_customer_id UUID,
  p_vehicle_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_notes TEXT,
  p_lines JSONB
) RETURNS UUID AS $$
DECLARE
  v_work_order_id UUID;
  v_line JSONB;
  v_inventory_id UUID;
  v_current_qty INT;
  v_needed_qty INT;
  v_subtotal DECIMAL(10,2) := 0;
BEGIN
  -- First pass: validate all inventory
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    IF v_line->>'type' = 'tire' THEN
      v_inventory_id := (v_line->>'inventory_item_id')::UUID;
      v_needed_qty := (v_line->>'qty')::INT;

      SELECT qty_on_hand INTO v_current_qty
      FROM inventory
      WHERE id = v_inventory_id AND shop_id = p_shop_id
      FOR UPDATE;

      IF v_current_qty IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found: %', v_inventory_id;
      END IF;

      IF v_current_qty < v_needed_qty THEN
        RAISE EXCEPTION 'Insufficient stock for item %. Available: %, Requested: %',
          v_inventory_id, v_current_qty, v_needed_qty;
      END IF;
    END IF;
  END LOOP;

  -- Create work order
  INSERT INTO work_orders (shop_id, customer_id, vehicle_id, scheduled_at, notes)
  VALUES (p_shop_id, p_customer_id, p_vehicle_id, p_scheduled_at, p_notes)
  RETURNING id INTO v_work_order_id;

  -- Insert lines and decrement inventory
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO work_order_lines (work_order_id, type, inventory_item_id, description, qty, unit_price)
    VALUES (
      v_work_order_id,
      v_line->>'type',
      (v_line->>'inventory_item_id')::UUID,
      v_line->>'description',
      (v_line->>'qty')::INT,
      (v_line->>'unit_price')::DECIMAL
    );

    v_subtotal := v_subtotal + ((v_line->>'qty')::INT * (v_line->>'unit_price')::DECIMAL);

    IF v_line->>'type' = 'tire' THEN
      UPDATE inventory
      SET qty_on_hand = qty_on_hand - (v_line->>'qty')::INT
      WHERE id = (v_line->>'inventory_item_id')::UUID;
    END IF;
  END LOOP;

  -- Update totals (8% tax rate - adjust as needed)
  UPDATE work_orders
  SET subtotal = v_subtotal,
      tax = v_subtotal * 0.08,
      total = v_subtotal * 1.08
  WHERE id = v_work_order_id;

  RETURN v_work_order_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get user's shop_id
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID AS $$
  SELECT shop_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT role = 'owner' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE shops IS 'Stores individual tire shop locations';
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth with shop association and role';
COMMENT ON TABLE customers IS 'Customer contact information';
COMMENT ON TABLE vehicles IS 'Customer vehicles linked to customers';
COMMENT ON TABLE inventory IS 'Tire inventory with real-time stock tracking';
COMMENT ON TABLE work_orders IS 'Service appointments and work orders';
COMMENT ON TABLE work_order_lines IS 'Individual line items (tires/services) on work orders';

COMMENT ON FUNCTION create_work_order_with_lines IS 'Atomically creates work order and decrements inventory';
COMMENT ON FUNCTION get_user_shop_id IS 'Returns the shop_id for the current authenticated user';
COMMENT ON FUNCTION is_owner IS 'Returns true if current user has owner role';
