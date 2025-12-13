-- Tire Shop MVP - Part 2: Functions and Triggers
-- Run this SECOND (after PART1 completes successfully)

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper function to get user's shop_id
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT shop_id FROM profiles WHERE id = auth.uid());
END;
$$;

-- Helper function to check if user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT role = 'owner' FROM profiles WHERE id = auth.uid());
END;
$$;

-- Function to create work order with lines (atomic transaction)
CREATE OR REPLACE FUNCTION create_work_order_with_lines(
  p_shop_id UUID,
  p_customer_id UUID,
  p_vehicle_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_notes TEXT,
  p_lines JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
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
$$;
